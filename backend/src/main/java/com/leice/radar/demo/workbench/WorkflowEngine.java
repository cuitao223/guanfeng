package com.leice.radar.demo.workbench;

import java.nio.file.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.io.IOException;
import java.util.*;
import java.util.function.Consumer;
import static com.leice.radar.demo.workbench.Values.*;

public final class WorkflowEngine {
    private final WorkbenchService workbench;
    private final PluginRegistry registry;
    public WorkflowEngine(WorkbenchService workbench,PluginRegistry registry){this.workbench=workbench;this.registry=registry;}
    @SuppressWarnings("unchecked") private List<Map<String,Object>> nodes(Map<String,Object> w){Object n=w.get("nodes");if(!(n instanceof List<?>)||((List<?>)n).isEmpty()||((List<?>)n).size()>40)throw new IllegalArgumentException("Workflow needs 1..40 nodes");return ((List<?>)n).stream().map(Values::object).toList();}
    public Map<String,Object> validate(Map<String,Object> workflow){
        List<Map<String,Object>> nodes=nodes(workflow);Map<String,Map<String,Object>> byId=new LinkedHashMap<>(),components=new LinkedHashMap<>();
        Map<String,Integer> indegree=new LinkedHashMap<>();Map<String,List<String>> next=new HashMap<>();
        for(var n:nodes){String id=text(n,"id","");if(!id.matches("[A-Za-z][A-Za-z0-9_-]{0,50}")||byId.putIfAbsent(id,n)!=null)throw new IllegalArgumentException("Invalid or duplicate workflow node id");
            Map<String,Object>c=registry.resolve(text(n,"component",""),text(n,"version",""));components.put(id,c);indegree.put(id,0);next.put(id,new ArrayList<>());
            ComponentParameters.validate(c.getOrDefault("parameters",map()),n.getOrDefault("params",map()),"Node "+id+" ("+n.get("component")+").params");
        }
        List<?> edges=(List<?>)workflow.getOrDefault("edges",List.of());Set<String> seen=new HashSet<>();
        for(Object e:edges){Map<String,Object> edge=object(e);String from=text(edge,"from",""),to=text(edge,"to","");if(!byId.containsKey(from)||!byId.containsKey(to)||from.equals(to)||!seen.add(from+":"+to))throw new IllegalArgumentException("Invalid, duplicate or self edge");
            if(!components.get(from).get("outputType").equals(components.get(to).get("inputType")))throw new IllegalArgumentException("Incompatible component ports: "+from+" -> "+to);
            next.get(from).add(to);indegree.put(to,indegree.get(to)+1);
        }
        for(var n:nodes){String id=n.get("id").toString();boolean reader="none".equals(components.get(id).get("inputType"));if(reader&&indegree.get(id)!=0||!reader&&indegree.get(id)!=1)throw new IllegalArgumentException("Each non-reader needs exactly one input; reader needs none");}
        ArrayDeque<String> queue=new ArrayDeque<>();indegree.forEach((k,v)->{if(v==0)queue.add(k);});List<String> order=new ArrayList<>();
        while(!queue.isEmpty()){String id=queue.remove();order.add(id);for(String to:next.get(id)){int degree=indegree.merge(to,-1,Integer::sum);if(degree==0)queue.add(to);}}
        if(order.size()!=nodes.size())throw new IllegalArgumentException("Workflow contains a cycle");
        return map("valid",true,"order",order,"components",components);
    }
    public Map<String,Object> run(Map<String,Object> workflow){
        return run(workflow,UUID.randomUUID().toString(),snapshot->{});
    }
    @SuppressWarnings("unchecked") public Map<String,Object> run(Map<String,Object> workflow,String runId,Consumer<Map<String,Object>> observer){
        if(runId==null||!runId.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))throw new IllegalArgumentException("Invalid workflow run id");
        Objects.requireNonNull(observer,"Workflow observer");
        Map<String,Object> check=validate(workflow);List<String>order=(List<String>)check.get("order");Map<String,Object> snapshots=object(check.get("components"));
        Map<String,Map<String,Object>> byId=new HashMap<>();nodes(workflow).forEach(n->byId.put(n.get("id").toString(),n));Map<String,String> parent=new HashMap<>();for(Object e:(List<?>)workflow.getOrDefault("edges",List.of())){var edge=object(e);parent.put(edge.get("to").toString(),edge.get("from").toString());}
        Map<String,Map<String,Object>> outputs=new HashMap<>();List<Map<String,Object>> stages=new ArrayList<>();Map<String,Object> run=map("id",runId,"status","running","startedAt",Instant.now().toString(),"nodes",stages,"workflow",workflow,"componentSnapshots",snapshots);publish(run,observer);
        for(String id:order){if(Thread.currentThread().isInterrupted())throw new IllegalStateException("Workflow execution interrupted");Map<String,Object> n=byId.get(id),c=object(snapshots.get(id)),p=object(n.getOrDefault("params",map()));String component=n.get("component").toString();Map<String,Object> stage=map("id",id,"component",component,"version",n.get("version"),"status","running","startedAt",Instant.now().toString());stages.add(stage);publish(run,observer);
            try{
                Map<String,Object> input=parent.containsKey(id)?outputs.get(parent.get(id)):map(),out=new LinkedHashMap<>(input);
                PluginRegistry.validateInput(c,input);
                switch(component){
                    case "reader" -> {String data=text(p,"datasetId","");Map<String,Object> meta=workbench.datasets().stream().filter(x->data.equals(x.get("id"))).findFirst().orElseThrow(()->new IllegalArgumentException("Reader dataset not found"));out=map("datasetId",data,"dataset",meta);}
                    case "quality" -> {Map<String,Object> request=new LinkedHashMap<>(p);request.put("datasetId",input.get("datasetId"));if(input.get("datasetId").toString().startsWith("dbs-")){out=workbench.analyze(request);rememberAnalysisParameters(out,request);}else {out=workbench.dataset(input.get("datasetId").toString());out.put("datasetId",input.get("datasetId"));out.put("quality",map("status","source-native-validity","policy","No invented wind fields or coordinates"));}}
                    case "statistics" -> {if(!out.containsKey("summary"))throw new IllegalArgumentException("Statistics requires numeric analysis summary");out.put("statistics",new LinkedHashMap<>(object(out.get("summary"))));}
                    case "events" -> {String data=text(input,"datasetId","");if(!data.startsWith("dbs-"))throw new IllegalArgumentException("Wind exceedance events require a DBS wind dataset");Map<String,Object> request=analysisParameters(input);request.putAll(p);request.put("datasetId",data);out=workbench.analyze(request);rememberAnalysisParameters(out,request);}
                    case "chart" -> {out.put("chart",chart(input,p));out.put("chartReady",true);run.put("chart",out.get("chart"));}
                    case "export" -> {List<Map<String,Object>> files=export(workbench.root(),runId,id,input,p);out.put("exports",files);out.put("exportReady",true);@SuppressWarnings("unchecked") List<Map<String,Object>> all=(List<Map<String,Object>>)run.computeIfAbsent("exports",key->new ArrayList<>());all.addAll(files);}
                    default -> {String expression=text(c,"expression","");double value=PluginRegistry.evaluate(expression,object(input.get("summary")));Map<String,Object> metrics=new LinkedHashMap<>();if(input.get("pluginResults")instanceof Map<?,?>)metrics.putAll(object(input.get("pluginResults")));metrics.put(component+"@"+n.get("version"),map("value",value,"unit",c.getOrDefault("unit",""),"expression",expression));out.put("pluginResults",metrics);}
                }
                PluginRegistry.validateOutput(c,out);
                outputs.put(id,out);stage.put("status","succeeded");stage.put("finishedAt",Instant.now().toString());stage.put("output",map("keys",out.keySet(),"summary",out.getOrDefault("summary",map()),"pluginResults",out.getOrDefault("pluginResults",map()),"chart",out.getOrDefault("chart",map()),"exports",out.getOrDefault("exports",List.of())));run.put("result",out);publish(run,observer);
            }catch(Exception e){stage.put("status","failed");stage.put("finishedAt",Instant.now().toString());stage.put("error",e.getMessage());run.put("status","failed");run.put("finishedAt",Instant.now().toString());publish(run,observer);return run;}
        }
        Map<String,Object> sinks=new LinkedHashMap<>();Set<String> upstream=new HashSet<>(parent.values());
        for(String id:order)if(!upstream.contains(id))sinks.put(id,outputs.get(id));
        run.put("outputs",sinks);
        Map<String,Object> result=new LinkedHashMap<>(object(run.get("result")));if(run.containsKey("chart"))result.put("chart",run.get("chart"));if(run.containsKey("exports"))result.put("exports",run.get("exports"));run.put("result",result);
        run.put("status","succeeded");run.put("finishedAt",Instant.now().toString());publish(run,observer);return run;
    }
    private static Map<String,Object> analysisParameters(Map<String,Object> input){
        Map<String,Object> request=new LinkedHashMap<>();
        Map<String,Object> provenance=input.get("provenance") instanceof Map<?,?>?object(input.get("provenance")):map();
        for(String key:List.of("datasetId","heightMin","heightMax","start","end","threshold","rejectInvalidDirection"))
            if(provenance.containsKey(key))request.put(key,provenance.get(key));
        if(!request.containsKey("rejectInvalidDirection")&&input.get("quality") instanceof Map<?,?> quality&&quality.containsKey("directionRequired"))
            request.put("rejectInvalidDirection",quality.get("directionRequired"));
        return request;
    }
    private static void rememberAnalysisParameters(Map<String,Object> output,Map<String,Object> request){
        Map<String,Object> provenance=new LinkedHashMap<>(object(output.get("provenance")));
        for(String key:List.of("heightMin","heightMax","start","end","threshold","rejectInvalidDirection"))
            if(request.containsKey(key))provenance.putIfAbsent(key,request.get(key));
        output.put("provenance",provenance);
    }
    private void publish(Map<String,Object> run,Consumer<Map<String,Object>> observer){
        persist(run);
        observer.accept(new com.fasterxml.jackson.databind.ObjectMapper().convertValue(run,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){}));
    }
    static Map<String,Object> chart(Map<String,Object> input,Map<String,Object> params){
        String kind=table(input).kind(),mode=text(params,"mode","auto");
        if(!List.of("auto","profile","scan","grid").contains(mode)||!mode.equals("auto")&&!mode.equals(kind))throw new IllegalArgumentException("Chart mode must match the processed data kind");
        Map<String,Object> data=new LinkedHashMap<>(input);
        for(String key:List.of("chart","chartReady","exports","exportReady"))data.remove(key);
        return map("kind",kind,"data",data);
    }
    private record Table(String kind,List<String> header,List<List<Object>> rows){}
    private static List<?> list(Object raw,String field){if(!(raw instanceof List<?> values)||values.isEmpty())throw new IllegalArgumentException("Processed data requires nonempty "+field);return values;}
    private static Object numeric(Object value){if(!(value instanceof Number n)||!Double.isFinite(n.doubleValue()))throw new IllegalArgumentException("Processed data requires finite numeric samples; missing values must use 999");return value;}
    private static Table table(Map<String,Object> input){
        String kind;List<?> first,second,values,directions=null;List<String> header;
        if(input.get("grid") instanceof Map<?,?>){
            Map<String,Object> grid=object(input.get("grid"));kind="grid";first=list(grid.get("y"),"grid.y");second=list(grid.get("x"),"grid.x");values=list(grid.get("values"),"grid.values");header=List.of("x","y","value");
        }else if(input.containsKey("angles")){
            kind="scan";first=list(input.get("angles"),"angles");second=list(input.get("heightArr"),"heightArr");values=list(input.get("values"),"values");header=List.of("angle","range","radialWind");
        }else{
            kind="profile";first=list(input.get("times"),"times");second=list(input.get("heightArr"),"heightArr");values=list(input.get("values"),"values");directions=list(input.get("dirs"),"dirs");header=List.of("time","height","speed","direction");
        }
        if(values.size()!=first.size()||directions!=null&&directions.size()!=first.size())throw new IllegalArgumentException("Processed data row count differs from axis length");
        List<List<Object>> rows=new ArrayList<>();
        for(int i=0;i<first.size();i++){
            List<?> row=list(values.get(i),"values row"),dirs=directions==null?null:list(directions.get(i),"dirs row");
            if(row.size()!=second.size()||dirs!=null&&dirs.size()!=second.size())throw new IllegalArgumentException("Processed data column count differs from axis length");
            for(int j=0;j<second.size();j++){
                Object a=first.get(i),b=numeric(second.get(j)),value=numeric(row.get(j));
                if(kind.equals("profile")){if(!(a instanceof String))throw new IllegalArgumentException("Profile times must be strings");rows.add(List.of(a,b,value,numeric(dirs.get(j))));}
                else if(kind.equals("grid"))rows.add(List.of(b,numeric(a),value));
                else rows.add(List.of(numeric(a),b,value));
            }
        }
        return new Table(kind,header,rows);
    }
    static List<Map<String,Object>> export(Path root,String runId,String nodeId,Map<String,Object> input,Map<String,Object> params)throws Exception{
        if(!runId.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")||!nodeId.matches("[A-Za-z][A-Za-z0-9_-]{0,50}"))throw new IllegalArgumentException("Invalid workflow export identity");
        String format=text(params,"format","both");if(!List.of("csv","html","both").contains(format))throw new IllegalArgumentException("Export format must be csv, html or both");
        Table table=table(input);Path directory=exportDirectory(root,true),runDirectory=directory.resolve(runId);
        ensureDirectory(runDirectory,directory);
        StringBuilder csv=new StringBuilder(String.join(",",table.header())).append("\r\n");
        StringBuilder body=new StringBuilder("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>Workflow data export</title><h1>Workflow data export</h1><p>Source-native processed observations; 999 denotes a missing sample. Thresholds are user rules.</p><table><thead><tr>");
        for(String column:table.header())body.append("<th>").append(escape(column)).append("</th>");body.append("</tr></thead><tbody>");
        for(List<Object> row:table.rows()){
            for(int i=0;i<row.size();i++){if(i>0)csv.append(',');csv.append(csvCell(row.get(i)));}csv.append("\r\n");
            body.append("<tr>");for(Object value:row)body.append("<td>").append(escape(String.valueOf(value))).append("</td>");body.append("</tr>");
        }
        Map<String,Object> source=new LinkedHashMap<>(input);for(String key:List.of("chart","chartReady","exports","exportReady"))source.remove(key);
        body.append("</tbody></table><h2>Source data and provenance</h2><pre>").append(escape(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(source))).append("</pre></html>");
        List<Map<String,Object>> files=new ArrayList<>();
        for(String type:format.equals("both")?List.of("csv","html"):List.of(format)){
            String name=nodeId+"."+type;byte[] bytes=(type.equals("csv")?csv.toString():body.toString()).getBytes(StandardCharsets.UTF_8);
            Files.write(runDirectory.resolve(name),bytes,StandardOpenOption.CREATE_NEW,StandardOpenOption.WRITE,LinkOption.NOFOLLOW_LINKS);
            files.add(map("name",name,"format",type,"url","/api/wb/workflow/exports/"+runId+"/"+name,"sha256",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),"bytes",bytes.length));
        }
        return files;
    }
    private static String csvCell(Object value){String s=String.valueOf(value);if(value instanceof String&&s.matches("^[=+@-].*"))s="'"+s;return s.contains(",")||s.contains("\"")||s.contains("\n")||s.contains("\r")?"\""+s.replace("\"","\"\"")+"\"":s;}
    private static String escape(String value){return value.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");}
    private static void ensureDirectory(Path path,Path boundary)throws IOException{
        try{Files.createDirectory(path);}catch(FileAlreadyExistsException ignored){}
        if(Files.isSymbolicLink(path)||!Files.isDirectory(path,LinkOption.NOFOLLOW_LINKS)||!path.toRealPath().startsWith(boundary.toRealPath()))throw new IllegalArgumentException("Export directory escapes project boundary");
    }
    private static Path exportDirectory(Path root,boolean create)throws IOException{
        Path realRoot=root.toRealPath(),runtime=realRoot.resolve("runtime"),directory=runtime.resolve("exports");
        if(create){ensureDirectory(runtime,realRoot);ensureDirectory(directory,runtime);}
        else if(Files.isSymbolicLink(runtime)||Files.isSymbolicLink(directory)||!Files.isDirectory(directory,LinkOption.NOFOLLOW_LINKS)||!runtime.toRealPath().startsWith(realRoot)||!directory.toRealPath().startsWith(runtime.toRealPath()))throw new IllegalArgumentException("Export directory unavailable");
        return directory;
    }
    static byte[] readExport(Path root,String runId,String name)throws IOException{
        if(!runId.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")||!name.matches("[A-Za-z][A-Za-z0-9_-]{0,50}\\.(csv|html)"))throw new IllegalArgumentException("Invalid workflow export name");
        Path directory=exportDirectory(root,false),run=directory.resolve(runId),file=run.resolve(name);
        if(Files.isSymbolicLink(run)||Files.isSymbolicLink(file)||!Files.isDirectory(run,LinkOption.NOFOLLOW_LINKS)||!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)||!run.toRealPath().startsWith(directory.toRealPath())||!file.toRealPath().startsWith(run.toRealPath()))throw new IllegalArgumentException("Workflow export not found within export directory");
        try(var stream=Files.newInputStream(file,LinkOption.NOFOLLOW_LINKS)){return stream.readAllBytes();}
    }
    private void persist(Map<String,Object> run){try{Path dir=workbench.root().resolve("runtime/workflows");Files.createDirectories(dir);new com.fasterxml.jackson.databind.ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(dir.resolve(run.get("id")+".json").toFile(),run);}catch(Exception e){throw new IllegalStateException("Cannot persist workflow evidence",e);}}
}
