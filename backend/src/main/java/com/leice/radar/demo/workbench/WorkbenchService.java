package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.parse.*;
import com.leice.radar.series.*;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;
import static com.leice.radar.demo.workbench.Values.*;

@Service
public class WorkbenchService {
    private final ObjectMapper json;
    private final RadarSeriesService series;
    private final Path root;
    private final Map<String,Path> radarFiles=new LinkedHashMap<>();
    private final Map<String,DbsMeasurement> dbsCache=new ConcurrentHashMap<>();
    private final List<Map<String,Object>> radarMetadata=new ArrayList<>();
    private final PluginRegistry plugins;
    private final ProjectStore projects;
    private final WorkflowEngine workflows;
    private volatile List<Map<String,Object>> publicMetadata=List.of();
    private final DateTimeFormatter format=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public WorkbenchService(ObjectMapper json,RadarSeriesService series) throws Exception {
        this.json=json;this.series=series;
        Path candidate=Path.of(System.getProperty("guanfeng.root",System.getenv().getOrDefault("GUANFENG_ROOT","."))).toAbsolutePath().normalize();
        if(!Files.isDirectory(candidate.resolve("frontend")) && Files.isDirectory(candidate.resolve("guanfeng/frontend"))) candidate=candidate.resolve("guanfeng");
        if(!Files.isDirectory(candidate.resolve("frontend")) && candidate.getParent()!=null && Files.isDirectory(candidate.getParent().resolve("frontend")))candidate=candidate.getParent();
        root=candidate;
        Files.createDirectories(root.resolve("runtime"));
        indexRadar();
        plugins=new PluginRegistry(root,json);
        projects=new ProjectStore(root,json,defaultWorkflow());
        workflows=new WorkflowEngine(this,plugins);
    }
    public Path root(){return root;}
    public PluginRegistry plugins(){return plugins;}
    public ProjectStore projects(){return projects;}
    public Map<String,Object> health(){
        Path key=Path.of(System.getenv().getOrDefault("GUANFENG_KEY_FILE",root.resolve("config/model-api.key").toString()));
        return map("status","ok","modelConfigured",Files.isRegularFile(key),"model",System.getenv().getOrDefault("GUANFENG_MODEL","deepseek-flash"),"python",System.getenv().getOrDefault("GUANFENG_PYTHON","python"),"deployment","loopback-local");
    }
    private void indexRadar() throws Exception {
        Path dir=root.resolve("data/radar"); if(!Files.isDirectory(dir))return;
        try(var paths=Files.list(dir)){
            for(Path p:paths.filter(x->x.getFileName().toString().endsWith(".csv")).sorted().toList()){
                String name=p.getFileName().toString();
                String id=(name.contains("DBS")?"dbs-":"ppi-")+HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(name.getBytes(StandardCharsets.UTF_8))).substring(0,12);
                radarFiles.put(id,p);
                String header,first,last;
                try(BufferedReader br=Files.newBufferedReader(p)){header=br.readLine();first=br.readLine();last=first;String line;while((line=br.readLine())!=null)if(!line.isBlank())last=line;}
                Matcher heights=Pattern.compile("(?:^|,)([0-9.]+)m (?:WindSpeed|RadialWind\\(m/s\\))").matcher(header);
                List<Double> levels=new ArrayList<>();while(heights.find()) levels.add(Double.parseDouble(heights.group(1)));
                String start=normalizeTime(first.split(",",2)[0]),end=normalizeTime(last.split(",",2)[0]);
                Map<String,Object> metadata=map("id",id,"name",name,"format",name.contains("DBS")?"radar-dbs":"radar-ppi","kind",name.contains("DBS")?"profile":"scan","source","organizer observation sample","timeStart",start,"timeEnd",end,"variables",name.contains("DBS")?List.of("WindSpeed","WindDirection","ZWind","MeanSNR(raw)","DataObtainRate(raw)"):List.of("RadialWind","SNR(raw)"),"coordinatesKnown",false);
                metadata.put(name.contains("DBS")?"minHeight":"minRange",levels.stream().mapToDouble(x->x).min().orElse(0));
                metadata.put(name.contains("DBS")?"maxHeight":"maxRange",levels.stream().mapToDouble(x->x).max().orElse(0));
                metadata.put("levelMeaning",name.contains("DBS")?"observed height in m":"line-of-sight distance gate in m; not altitude");
                radarMetadata.add(metadata);
            }
        }
    }
    private String normalizeTime(String raw){
        String t=raw.trim(); if(t.matches("^[0-9]{8} .*"))t=t.substring(0,4)+"-"+t.substring(4,6)+"-"+t.substring(6,8)+t.substring(8);
        return t;
    }
    public synchronized List<Map<String,Object>> datasets(){
        if(publicMetadata.isEmpty() && Files.isRegularFile(root.resolve("adapters/worker.py"))){
            try {Map<String,Object> response=adapter(map("op","list"));Object ds=response.get("datasets");if(ds instanceof List<?>)publicMetadata=json.convertValue(ds,new TypeReference<>(){});}
            catch(Exception ignored){ /* Radar remains usable when optional adapters are unavailable. */ }
        }
        List<Map<String,Object>> all=new ArrayList<>(radarMetadata);all.addAll(publicMetadata);return all;
    }
    public Map<String,Object> dataset(String id){
        Path p=radarFiles.get(id);
        if(p==null){if(datasets().stream().noneMatch(x->id.equals(x.get("id"))))throw new IllegalArgumentException("Unknown dataset id");return adapter(map("op","read","id",id));}
        Object payload=id.startsWith("dbs-")?series.windProfile(p):series.scan(p,ScanProduct.WIND);
        Map<String,Object> out=json.convertValue(payload,new TypeReference<>(){});
        out.put("dataset",radarMetadata.stream().filter(x->id.equals(x.get("id"))).findFirst().orElseThrow());
        out.put("provenance",map("source","organizer observation sample","file",p.getFileName().toString(),"coordinatesKnown",false,"measurement",id.startsWith("dbs-")?"horizontal wind profile":"line-of-sight radial wind"));
        return out;
    }
    public Map<String,Object> adapter(Map<String,Object> request){
        try {
            ProcessBuilder pb=new ProcessBuilder(System.getenv().getOrDefault("GUANFENG_PYTHON","python"),"-X","utf8",root.resolve("adapters/worker.py").toString());
            pb.directory(root.toFile());pb.environment().remove("DEEPSEEK_API_KEY");
            Process process=pb.start();
            try(OutputStream stream=process.getOutputStream()){stream.write((json.writeValueAsString(request)+"\n").getBytes(StandardCharsets.UTF_8));}
            CompletableFuture<byte[]> stdout=CompletableFuture.supplyAsync(()->read(process.getInputStream()));
            CompletableFuture<byte[]> stderr=CompletableFuture.supplyAsync(()->read(process.getErrorStream()));
            if(!process.waitFor(90,TimeUnit.SECONDS)){process.destroyForcibly();throw new IllegalArgumentException("Data adapter timed out");}
            Map<String,Object> out=json.readValue(stdout.get(5,TimeUnit.SECONDS),new TypeReference<>(){});
            if(process.exitValue()!=0 || out.containsKey("error"))throw new IllegalArgumentException("Data adapter rejected input or unavailable format dependency");
            return out;
        }catch(IllegalArgumentException e){throw e;}catch(Exception e){throw new IllegalArgumentException("Data adapter unavailable: "+e.getClass().getSimpleName());}
    }
    private static byte[] read(InputStream input){try{return input.readAllBytes();}catch(IOException e){return new byte[0];}}
    private DbsMeasurement dbs(String id){
        if(!id.startsWith("dbs-") || !radarFiles.containsKey(id))throw new IllegalArgumentException("Wind analysis requires a DBS dataset");
        return dbsCache.computeIfAbsent(id,k->{Measurement m=new MeasurementParser().parse(radarFiles.get(k));if(!(m instanceof DbsMeasurement d))throw new IllegalArgumentException("Not DBS data");return d;});
    }
    public Map<String,Object> analyze(Map<String,Object> request){
        String id=text(request,"datasetId","");DbsMeasurement raw=dbs(id);
        List<DbsProfile> profiles=new ArrayList<>(new TreeMap<LocalDateTime,DbsProfile>(){{for(DbsProfile p:raw.profiles())putIfAbsent(p.time(),p);}}.values());
        SortedSet<Double> heights=new TreeSet<>();for(var p:profiles)heights.addAll(p.levels().keySet());
        double low=number(request,"heightMin",heights.first()),high=number(request,"heightMax",heights.last()),threshold=number(request,"threshold",10);
        if(low>high||low<heights.first()||high>heights.last())throw new IllegalArgumentException("Requested height range outside observed coverage "+heights.first()+".."+heights.last()+" m");
        if(threshold<0||threshold>150)throw new IllegalArgumentException("Wind threshold must be within 0..150 m/s (user rule)");
        List<Double> selected=heights.stream().filter(h->h>=low&&h<=high).toList();if(selected.isEmpty())throw new IllegalArgumentException("No observed height in requested range");
        String requestedStart=text(request,"start","").trim(), requestedEnd=text(request,"end","").trim();
        LocalDateTime from=parseTime(requestedStart.isBlank()?format.format(profiles.get(0).time()):requestedStart),to=parseTime(requestedEnd.isBlank()?format.format(profiles.get(profiles.size()-1).time()):requestedEnd);
        if(from.isAfter(to)||from.isBefore(profiles.get(0).time())||to.isAfter(profiles.get(profiles.size()-1).time()))throw new IllegalArgumentException("Requested time range outside observation coverage");
        boolean checkDir=!Boolean.FALSE.equals(request.get("rejectInvalidDirection"));
        List<String> times=new ArrayList<>();List<List<Double>> values=new ArrayList<>(),directions=new ArrayList<>();
        List<Map<String,Object>> events=new ArrayList<>();Map<String,Object> current=null;
        long valid=0,missing=0,exceed=0;double sum=0,max=Double.NEGATIVE_INFINITY;LocalDateTime previous=null;
        for(DbsProfile p:profiles){
            if(p.time().isBefore(from)||p.time().isAfter(to))continue;
            String time=format.format(p.time());times.add(time);List<Double> row=new ArrayList<>(),dirs=new ArrayList<>(),affected=new ArrayList<>();double rowPeak=Double.NEGATIVE_INFINITY;
            boolean hasMissing=false;
            for(double h:selected){Map<DbsMetric,Double> level=p.levels().getOrDefault(h,Map.of());double speed=level.getOrDefault(DbsMetric.WIND_SPEED,999d),dir=level.getOrDefault(DbsMetric.WIND_DIRECTION,999d);
                boolean directionOk=valid(dir)&&dir>=0&&dir<=360;
                boolean ok=valid(speed)&&speed>=0&&(!checkDir||directionOk);
                if(ok){valid++;sum+=speed;max=Math.max(max,speed);if(speed>threshold){exceed++;affected.add(h);rowPeak=Math.max(rowPeak,speed);}}
                else {missing++;hasMissing=true;}
                // Plotting requires paired speed and direction even when statistics allow speed alone.
                row.add(ok&&directionOk?speed:999d);dirs.add(ok&&directionOk?dir:999d);
            }
            values.add(row);directions.add(dirs);
            boolean gap=previous!=null&&Duration.between(previous,p.time()).toSeconds()>600;
            if(hasMissing||gap){if(current!=null){events.add(current);current=null;}}
            if(!affected.isEmpty()){
                if(current==null)current=map("start",time,"end",time,"peak",rowPeak,"heights",new TreeSet<Double>(),"records",0);
                current.put("end",time);current.put("peak",Math.max(((Number)current.get("peak")).doubleValue(),rowPeak));
                @SuppressWarnings("unchecked") Set<Double> hs=(Set<Double>)current.get("heights");hs.addAll(affected);current.put("records",((Number)current.get("records")).intValue()+1);
                if(hasMissing){events.add(current);current=null;}
            }else if(current!=null){events.add(current);current=null;}
            previous=p.time();
        }
        if(current!=null)events.add(current);
        if(times.isEmpty())throw new IllegalArgumentException("No observation records in requested range");
        Map<String,Object> summary=map("mean",valid==0?null:sum/valid,"max",valid==0?null:max,"validCount",valid,"missingCount",missing,"exceedCount",exceed);
        return map("datasetId",id,"times",times,"heightArr",selected,"values",values,"dirs",directions,"unit","m/s","summary",summary,"events",events,"quality",map("status",valid==0?"insufficient-data":"observed","missingCount",missing,"directionRequired",checkDir,"snrPolicy","raw-unconfirmed-unit","obtainRatePolicy","raw-unconfirmed-unit","coverage",map("minHeight",heights.first(),"maxHeight",heights.last())),"provenance",map("source","organizer observation sample","file",radarFiles.get(id).getFileName().toString(),"threshold",threshold,"thresholdType","user-configured demonstration rule","rejectInvalidDirection",checkDir,"timeMeaning","observation timestamps; averaging-window alignment unconfirmed","coordinatesKnown",false,"heightMin",low,"heightMax",high,"start",format.format(from),"end",format.format(to)));
    }
    private LocalDateTime parseTime(String s){try{return LocalDateTime.parse(s.replace('T',' ').substring(0,19),format);}catch(Exception e){throw new IllegalArgumentException("Time must use yyyy-MM-dd HH:mm:ss");}}
    public List<Map<String,Object>> components(){return plugins.components();}
    public Map<String,Object> validateWorkflow(Map<String,Object> workflow){return workflows.validate(workflow);}
    public Map<String,Object> runWorkflow(Map<String,Object> workflow){return workflows.run(workflow);}
    public Map<String,Object> defaultWorkflow(){
        String dataset=radarMetadata.stream().filter(x->"radar-dbs".equals(x.get("format"))).map(x->x.get("id").toString()).findFirst().orElse("");
        List<Map<String,Object>> nodes=new ArrayList<>();
        for(String id:List.of("reader","quality","statistics","events","chart","export"))nodes.add(map("id",id,"component",id,"version","1.0.0","params",id.equals("reader")?map("datasetId",dataset):id.equals("quality")?map("heightMin",127,"heightMax",500):id.equals("events")?map("threshold",10):map()));
        return map("nodes",nodes,"edges",List.of(map("from","reader","to","quality"),map("from","quality","to","statistics"),map("from","statistics","to","events"),map("from","events","to","chart"),map("from","events","to","export")));
    }
}
