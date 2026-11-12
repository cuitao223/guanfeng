package com.leice.radar.demo.generation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.*;
import com.leice.radar.demo.workbench.WorkbenchService;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.*;
import java.util.zip.*;

/** Bounded, auditable model orchestration with fixed build and runtime executables. */
@Service
public class GenerationService {
    private static final String POLICY = "Return one JSON object only, no markdown. Never include credentials. " +
        "Generate a small truthful meteorology Vue 3 app, using actual runtime data only. Missing 999/-999 is not valid data. " +
        "No fabricated coordinates, safety conclusions, synchronous DBS/PPI claims or unconfirmed SNR conversion. " +
        "App.vue may import only named functions from ./api.js; do not import vue. " +
        "No DOM/window/global/Node/filesystem/network capabilities, dynamic imports, computed property access except numeric indices, eval or constructors. " +
        "No external assets, CSS url(), @import, v-html, dynamic components, object v-bind, timers or arbitrary addresses. " +
        "Use an ordinary <script> with Vue Options API export default and <template> in App.vue. Use data, computed, methods and mounted; no setup or composition API. Simple CSS is allowed. " +
        "api.js alone may fetch fixed literal local paths /runtime/datasets (GET), /runtime/dataset?id=... is NOT allowed: use POST analysis instead, " +
        "/runtime/analysis (POST), /runtime/workflow/validate (POST), /runtime/workflow/run (POST). " +
        "Unwrap response {code,msg,data}; throw an Error if code != 200. Do not use new Error: throw the error message string. " +
        "API interface is named exports loadDatasets(), analyze(params), validateWorkflow(workflow), runWorkflow(workflow). " +
        "Each API function must directly call fetch with a QUOTED STRING LITERAL path as its first argument. Do not define endpoint constants or use generic fetch/post/request wrappers. " +
        "App imports these functions; analyze parameters include datasetId,heightMin,heightMax,threshold,rejectInvalidDirection. " +
        "Show loading, actual returned summary/events/data, editable threshold and height bounds, errors, provenance and uncertainty. " +
        "Actual analysis response: summary {mean,max,validCount,missingCount,exceedCount}; events is an array of " +
        "{start,end,peak,heights,records}, NOT time/height/speed/direction rows. Render those exact field names. " +
        "provenance {source,file,threshold,thresholdType,timeMeaning,coordinatesKnown,heightMin,heightMax,start,end}; " +
        "quality {status,missingCount,directionRequired,snrPolicy,obtainRatePolicy,coverage}. quality.coverage is {minHeight,maxHeight}, an observed vertical range in METRES, never a percentage. " +
        "Render observed coverage.minHeight and coverage.maxHeight explicitly with m, and separately label the selected analysis range from provenance.heightMin/heightMax. " +
        "Render object fields with explicit nested values or JSON.stringify; never String(object), which displays [object Object]. There is no uncertainty object; show quality policies. " +
        "Call analyze(params) automatically from mounted after datasets load. A profile uses response.values[timeIndex][heightIndex], never speed. " +
        "Times and heightArr describe the returned observation matrix. Empty events means no exceedance, not missing observations. " +
        "Do not insert sample measurements as defaults or mock data.";
    private final WorkbenchService workbench;
    private final ObjectMapper mapper;
    private final DeepSeekClient model;
    private final Path root;
    private final Path storage;
    private final int backendPort;
    private final String ownerId=UUID.randomUUID().toString();
    private final ConcurrentMap<String,GenerationTask> tasks=new ConcurrentHashMap<>();
    private final ConcurrentMap<String,Process> deployments=new ConcurrentHashMap<>();
    private final ThreadPoolExecutor jobs = new ThreadPoolExecutor(2,2,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(12),new ThreadPoolExecutor.AbortPolicy());
    private final ExecutorService roles=Executors.newFixedThreadPool(2);
    private final ExecutorService readers=Executors.newCachedThreadPool();
    public GenerationService(WorkbenchService workbench,ObjectMapper mapper,@Value("${server.port:18080}") int backendPort) throws IOException {
        this.workbench=workbench;this.mapper=mapper;this.root=workbench.root().toAbsolutePath().normalize();this.backendPort=backendPort;
        storage=root.resolve("runtime/generation");Files.createDirectories(storage);model=new DeepSeekClient(mapper,root);
        recover();
    }
    public String ownerId(){return ownerId;}
    public boolean modelConfigured(){return model.configured();}
    public String defaultModel(){String v=System.getenv("GUANFENG_MODEL");return v==null||v.isBlank()?"deepseek-flash":v;}
    private void recover() throws IOException {
        try(var dirs=Files.list(storage)){
            for(Path dir:dirs.filter(Files::isDirectory).toList()){
                if(!dir.getFileName().toString().matches("[a-f0-9-]{36}") || Files.isSymbolicLink(dir))continue;
                Path file=dir.resolve("task.json");if(!Files.isRegularFile(file))continue;
                try{
                    Map<String,Object> data=mapper.readValue(file.toFile(),new TypeReference<>(){});
                    GenerationTask task=new GenerationTask(dir,mapper,data);
                    String status=String.valueOf(data.get("status"));
                    if(!Set.of("ready","failed","interrupted").contains(status)){
                        task.state("interrupted");task.append("errors",Map.of("time",now(),"message","Backend restarted while generation was active; no success is inferred"));
                    }
                    Map<String,Object> dep=map(data.get("deployment"));
                    if("running".equals(dep.get("status")))task.put("deployment",Map.of("status","lost","time",now(),"reason","Backend restarted; previous runtime is not treated as healthy"));
                    tasks.put(dir.getFileName().toString(),task);
                }catch(Exception ignored){/* Corrupt records are reported, never silently treated as healthy. */
                    Map<String,Object> data=new LinkedHashMap<>();data.put("id",dir.getFileName().toString());data.put("status","failed");data.put("errors",List.of(Map.of("message","Persisted task record cannot be read")));
                    tasks.put(dir.getFileName().toString(),new GenerationTask(dir,mapper,data));
                }
            }
        }
    }
    public List<Map<String,Object>> list(){return tasks.values().stream().map(this::snapshot).sorted(Comparator.comparing(x->String.valueOf(x.get("createdAt")),Comparator.reverseOrder())).toList();}
    public Map<String,Object> get(String id){return snapshot(task(id));}
    private Map<String,Object> snapshot(GenerationTask t){
        synchronized(t){
            String id=String.valueOf(t.get("id"));Process p=deployments.get(id);
            if(p!=null&&!p.isAlive()) {deployments.remove(id,p);t.put("deployment",Map.of("status","exited","exitCode",p.exitValue(),"finishedAt",now()));}
            return t.snapshot();
        }
    }
    static boolean validModelName(String model){return model != null && model.matches("[a-zA-Z0-9._:/-]{1,100}");}
    public Map<String,Object> create(Map<String,Object> request){
        String prompt=String.valueOf(request.getOrDefault("prompt","")).trim();
        if(prompt.isBlank()||prompt.length()>6000)throw new IllegalArgumentException("Prompt must contain 1 to 6000 characters");
        if(prompt.matches("(?s).*sk-[A-Za-z0-9_-]{16,}.*"))throw new IllegalArgumentException("Credentials cannot be included in a prompt");
        String selected=String.valueOf(request.getOrDefault("model",defaultModel()));
        if(!validModelName(selected))throw new IllegalArgumentException("Invalid model name");
        if(!model.configured())throw new IllegalArgumentException("Model key file is not configured");
        String id=UUID.randomUUID().toString();
        Map<String,Object> data=new LinkedHashMap<>();
        data.put("id",id);data.put("status","queued");data.put("createdAt",now());data.put("prompt",prompt);data.put("model",selected);
        data.put("probe",Boolean.TRUE.equals(request.get("probe")));data.put("datasetId",String.valueOf(request.getOrDefault("datasetId","")));
        for(String k:List.of("stages","artifacts","errors","calls","skillUsage","validation"))data.put(k,new ArrayList<>());
        data.put("usage",new LinkedHashMap<>());data.put("deployment",Map.of("status","stopped"));
        GenerationTask t=new GenerationTask(storage.resolve(id),mapper,data);t.save();tasks.put(id,t);
        try{jobs.execute(()->generate(t));}catch(RejectedExecutionException e){t.state("failed");t.append("errors",Map.of("time",now(),"message","Generation queue is full"));throw new IllegalArgumentException("Generation queue is full");}
        return Map.of("id",id,"status","queued");
    }
    private void generate(GenerationTask t){
        try{
            t.state("running");
            String skill=stage(t,"skill-load",()->{
                Path p=root.resolve(".harness/backend/skills/guanfeng-generate/SKILL.md");String text=Files.readString(p);
                t.append("skillUsage",Map.of("name","guanfeng-generate","path",".harness/backend/skills/guanfeng-generate/SKILL.md","loadedAt",now(),"sha256",hash(p),"purpose","planning, parallel source generation, validation and repair"));
                return text;
            });
            List<Map<String,Object>> datasets=workbench.datasets();
            if(datasets.isEmpty())throw new IllegalArgumentException("No real datasets are available");
            String id=String.valueOf(t.get("datasetId"));
            if(id.isBlank())id=String.valueOf(datasets.stream().filter(d->"radar-dbs".equals(d.get("format"))).findFirst().orElse(datasets.get(0)).get("id"));
            final String datasetId=id;t.put("datasetId",id);
            if(datasets.stream().noneMatch(d->datasetId.equals(String.valueOf(d.get("id")))))throw new IllegalArgumentException("Dataset does not exist");
            Map<String,Object> selectedMetadata=datasets.stream().filter(d->datasetId.equals(String.valueOf(d.get("id")))).findFirst().orElseThrow();
            List<Map<String,Object>> sameFamily=datasets.stream().filter(d->Objects.equals(d.get("format"),selectedMetadata.get("format"))).limit(4).toList();
            Map<String,Object> datasetContext=new LinkedHashMap<>();
            datasetContext.put("selected",selectedMetadata);datasetContext.put("sameFamilySample",sameFamily);datasetContext.put("datasetCount",datasets.size());
            datasetContext.put("formatCounts",datasets.stream().collect(Collectors.groupingBy(d->String.valueOf(d.get("format")),Collectors.counting())));
            datasetContext.put("contextPolicy","Full dataset metadata omitted; selected record and at most four same-format records are included");
            Map<String,Object> trim=new LinkedHashMap<>();trim.put("totalDatasets",datasets.size());trim.put("includedDatasets",sameFamily.size());trim.put("selectedIncluded",true);trim.put("omittedDatasets",Math.max(0,datasets.size()-sameFamily.size()));trim.put("recordedAt",now());t.put("contextTrim",trim);
            List<Map<String,Object>> componentContext=workbench.components().stream().filter(c->Boolean.TRUE.equals(c.get("enabled"))).map(c->{
                Map<String,Object> brief=new LinkedHashMap<>();
                for(String key:List.of("id","version","name","inputType","outputType","parameters","unit"))if(c.containsKey(key))brief.put(key,c.get(key));
                return brief;
            }).toList();
            t.put("componentContext",Map.of("included",componentContext.size(),"fields",List.of("id","version","name","inputType","outputType","parameters","unit"),"policy","Full schemas and test references remain in the component catalogue; source-role prompts use selected plan and runtime contracts"));
            String context="Requirement: "+t.get("prompt")+"\nSelected datasetId: "+datasetId+"\nDataset context: "+mapper.writeValueAsString(datasetContext)+"\nComponents: "+mapper.writeValueAsString(componentContext)+"\nDefault workflow reference: "+mapper.writeValueAsString(workbench.defaultWorkflow())+"\nSkill:\n"+skill;
            JsonNode plan=stage(t,"planner",()->parse(call(t,"planner",POLICY+" You are ONLY the workflow planner. Return a concise direct JSON object with exactly {title,description,workflow:{nodes:[{id,component,version,params}],edges:[{from,to}]}}. Description must be under 150 characters. Do not return app, api, source code, explanations, schemas or an outer type/content wrapper. UI requirements belong to later roles. Use component IDs/versions exactly from supplied metadata and reader params.datasetId. Only valid acyclic connected workflows; do not invent component names.",context,Boolean.TRUE.equals(t.get("probe"))?2048:3500)));
            write(t,"plan.json",mapper.writerWithDefaultPrettyPrinter().writeValueAsString(plan));t.put("plan",mapper.convertValue(plan,Map.class));
            String codeContext="Requirement: "+t.get("prompt")+"\nSelected dataset: "+mapper.writeValueAsString(selectedMetadata)+"\nPlan: "+mapper.writeValueAsString(plan)+"\nSkill:\n"+skill;
            int tokens=Boolean.TRUE.equals(t.get("probe"))?2600:5200;
            Future<JsonNode> ui=roles.submit(()->stage(t,"vue-role",()->parse(call(t,"vue-role",POLICY+" Return {app: \"complete App.vue source\"}. Implement the UI module only; use the specified API interface.",codeContext,tokens))));
            Future<JsonNode> api=roles.submit(()->stage(t,"api-role",()->parse(call(t,"api-role",POLICY+" Return {api: \"complete api.js source\"}. Implement all four named API exports only. fetch URLs must be fixed string literals. analysis body JSON.stringify(params).",codeContext,tokens))));
            JsonNode uiResult=null,apiResult=null;Throwable roleError=null;
            try{uiResult=ui.get();}catch(ExecutionException e){roleError=e.getCause();}
            try{apiResult=api.get();}catch(ExecutionException e){if(roleError==null)roleError=e.getCause();}
            if(roleError!=null)throw new IllegalStateException(DeepSeekClient.safeError(roleError));
            final String app=required(uiResult,"app"),apiSource=required(apiResult,"api");
            stage(t,"assemble",()->{assemble(t,app,apiSource,plan.path("workflow"));return true;});
            snapshotSources(t,0);
            boolean passed=false;
            for(int round=0;round<=2;round++){
                final int attempt=round;
                try{
                    stage(t,"validate-"+round,()->{validate(t,attempt);return true;});passed=true;break;
                }catch(Exception validationError){
                    String feedback=feedback(validationError);
                    t.append("errors",Map.of("time",now(),"round",round,"message",feedback,"recoverable",round<2));
                    if(round==2)break;
                    t.state("repairing");
                    JsonNode repair=stage(t,"repair-"+(round+1),()->parse(call(t,"repair-"+(attempt+1),POLICY+" Repair the supplied real errors. Return {app:complete App.vue,api:complete api.js,workflow:complete workflow}. Change only these three modules.",codeContext+"\nActual validation feedback:\n"+feedback+"\nCurrent app:\n"+Files.readString(t.dir.resolve("src/App.vue"))+"\nCurrent api:\n"+Files.readString(t.dir.resolve("src/api.js"))+"\nWorkflow:\n"+Files.readString(t.dir.resolve("workflow.json")),Boolean.TRUE.equals(t.get("probe"))?2600:7000)));
                    assemble(t,required(repair,"app"),required(repair,"api"),repair.path("workflow"));
                    snapshotSources(t,round+1);
                    t.state("running");
                }
            }
            if(!passed)throw new IllegalStateException("Validation failed after two repair rounds; inspect validation artifacts");
            t.put("artifacts",artifacts(t));t.put("finishedAt",now());t.state("ready");
        }catch(Throwable e){
            t.append("errors",Map.of("time",now(),"message",feedback(e),"recoverable",false));t.put("finishedAt",now());t.state("failed");
            try{t.put("artifacts",artifacts(t));}catch(Exception ignored){}
        }
    }
    private String call(GenerationTask t,String role,String system,String prompt,int tokens)throws Exception{
        return model.generate(String.valueOf(t.get("model")),role,system,prompt,tokens,call->{synchronized(t){
            t.append("calls",call);
            Map<String,Object> totals=new LinkedHashMap<>(map(t.get("usage")));
            map(call.get("usage")).forEach((k,v)->{if(v instanceof Number n)totals.put(k,((Number)totals.getOrDefault(k,0L)).longValue()+n.longValue());});
            t.put("usage",totals);
        }});
    }
    JsonNode parse(String text)throws IOException{
        String clean=text.strip();if(clean.startsWith("```")){clean=clean.replaceFirst("^```(?:json)?\\s*","").replaceFirst("\\s*```$","");}
        JsonNode parsed=mapper.readTree(clean);
        if(parsed.isObject() && "json_object".equals(parsed.path("type").asText()) && parsed.path("content").isObject())parsed=parsed.path("content");
        if(!parsed.isObject())throw new IllegalArgumentException("Generated response must be a JSON object");return parsed;
    }
    private static String required(JsonNode node,String key){String value=node.path(key).asText();if(value.isBlank()||value.length()>80000)throw new IllegalArgumentException("Generated "+key+" source is missing or too large");if(value.matches("(?s).*sk-[A-Za-z0-9_-]{16,}.*"))throw new IllegalArgumentException("Generated source resembles a credential");return value;}
    private void assemble(GenerationTask t,String app,String api,JsonNode workflow)throws Exception{
        if(!workflow.isObject())throw new IllegalArgumentException("Generated workflow is missing");
        write(t,"src/App.vue",app);write(t,"src/api.js",api);write(t,"workflow.json",mapper.writerWithDefaultPrettyPrinter().writeValueAsString(workflow));
        write(t,"src/main.js","import { createApp } from 'vue';\nimport App from './App.vue';\ncreateApp(App).mount('#app');\n");
        write(t,"index.html","<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Generated meteorology application</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.js\"></script></body></html>");
        Map<String,Object> frontend=mapper.readValue(root.resolve("frontend/package.json").toFile(),new TypeReference<>(){});
        Map<String,Object> dependencies=map(frontend.get("dependencies")),dev=map(frontend.get("devDependencies"));
        write(t,"package.json",mapper.writerWithDefaultPrettyPrinter().writeValueAsString(Map.of("name","guanfeng-generated-app","private",true,"type","module","scripts",Map.of("build","node tools/build.cjs . ."),"dependencies",Map.of("vue",dependencies.get("vue")),"devDependencies",Map.of("vite",dev.get("vite"),"@vitejs/plugin-vue",dev.get("@vitejs/plugin-vue"),"@babel/parser","7.29.9","@vue/compiler-sfc",dependencies.get("vue")))));
        for(String script:List.of("build.cjs","validate-source.cjs","runtime-server.mjs"))write(t,"tools/"+script,Files.readString(root.resolve("generation-template/"+script)));
        write(t,"DEPENDENCIES.md","# Generated application\n\nJava 17 and the Guanfeng backend provide real data and analysis. Node 18+ is required for Vite. Dependency versions are in package.json; source platform lockfile is included as platform-package-lock.json. No second dependency installation is performed by the platform: the existing frontend/node_modules is reused.\n\nIn this directory with dependencies already installed: node tools/build.cjs . .\n\nRun with node tools/runtime-server.mjs . http://127.0.0.1:"+backendPort+" "+t.get("id")+"\n\nThis runtime requires the owning Guanfeng backend and uses only its local /api/wb/generation/{id}/runtime endpoints. Re-importing the task is not automatic. For an exported app, keep the original ready task on the backend for runtime access. No model credentials are needed to run a built app.\n\nMissing data and provenance must remain visible; thresholds are configurable business rules, not safety standards.\n");
        Path lock=root.resolve("frontend/package-lock.json");if(Files.isRegularFile(lock))Files.copy(lock,t.dir.resolve("platform-package-lock.json"),StandardCopyOption.REPLACE_EXISTING);
    }
    private void snapshotSources(GenerationTask t,int round)throws IOException{
        for(String file:List.of("src/App.vue","src/api.js","workflow.json"))
            write(t,"validation/sources-"+round+"/"+file,Files.readString(t.dir.resolve(file)));
    }
    private void validate(GenerationTask t,int round)throws Exception{
        String start=now();Map<String,Object> check=new LinkedHashMap<>();check.put("round",round);check.put("startedAt",start);
        try{
            ProcessResult build=run(List.of(node(),root.resolve("generation-template/build.cjs").toString(),t.dir.toString(),root.resolve("frontend").toString()),t.dir,Duration.ofSeconds(90));
            write(t,"validation/build-"+round+".log",build.output());check.put("buildExitCode",build.exitCode());
            if(build.exitCode()!=0)throw new IllegalStateException("Validation Vite/static check failed:\n"+truncate(build.output(),10000));
            Map<String,Object> workflow=mapper.readValue(t.dir.resolve("workflow.json").toFile(),new TypeReference<>(){});
            Map<String,Object> workflowValidation=workbench.validateWorkflow(workflow);
            if(Boolean.FALSE.equals(workflowValidation.get("valid")))throw new IllegalStateException("Validation workflow rejected: "+mapper.writeValueAsString(workflowValidation));
            Map<String,Object> analysisRequest=analysisRequest(workflow,String.valueOf(t.get("datasetId")));
            Map<String,Object> analysis=workbench.analyze(analysisRequest);
            check.put("analysisRequest",analysisRequest);
            Map<String,Object> summary=map(analysis.get("summary"));
            if(!(summary.get("validCount") instanceof Number count) || count.longValue()<=0)throw new IllegalStateException("Validation real analysis returned no valid observations");
            Map<String,Object> execution=workbench.runWorkflow(workflow);
            if("failed".equals(execution.get("status")))throw new IllegalStateException("Validation real workflow execution failed: "+mapper.writeValueAsString(execution));
            check.put("workflowValidation",workflowValidation);check.put("analysisSummary",summary);check.put("workflowStatus",execution.getOrDefault("status","completed"));
            check.put("analysisProvenance",analysis.getOrDefault("provenance",Map.of()));
            ProcessResult browser=run(List.of(node(),root.resolve("generation-template/browser-check.cjs").toString(),t.dir.toString(),"http://127.0.0.1:"+backendPort,String.valueOf(round)),t.dir,Duration.ofSeconds(75));
            write(t,"validation/browser-"+round+".log",browser.output());check.put("browserExitCode",browser.exitCode());
            if(browser.exitCode()!=0)throw new IllegalStateException("Validation browser failed:\n"+truncate(browser.output(),10000));
            check.put("status","passed");
        }catch(Exception e){check.put("status","failed");check.put("error",feedback(e));throw e;}
        finally{check.put("finishedAt",now());t.append("validation",check);write(t,"validation/round-"+round+".json",mapper.writerWithDefaultPrettyPrinter().writeValueAsString(check));}
    }
    private Map<String,Object> analysisRequest(Map<String,Object> workflow,String fallbackDataset)throws IOException{
        Map<String,Object> request=new LinkedHashMap<>();request.put("datasetId",fallbackDataset);request.put("heightMin",127);request.put("heightMax",500);request.put("threshold",10);request.put("rejectInvalidDirection",true);
        Object raw=workflow.get("nodes");
        if(raw instanceof List<?> nodes) for(Object item:nodes) if(item instanceof Map<?,?> node){
            String component=String.valueOf(node.get("component"));Object params=node.get("params");
            if(params instanceof Map<?,?> p && (component.equals("reader")||component.equals("quality")||component.equals("events")))
                for(String key:List.of("datasetId","heightMin","heightMax","threshold","start","end","rejectInvalidDirection")) if(p.containsKey(key)) request.put(key,p.get(key));
        }
        return request;
    }
    private static String readLimited(InputStream input,int limit)throws IOException{
        try(input;ByteArrayOutputStream output=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int count,total=0;
            while((count=input.read(buffer))!=-1){int keep=Math.min(count,Math.max(0,limit-total));if(keep>0)output.write(buffer,0,keep);total+=count;}
            return output.toString(StandardCharsets.UTF_8)+(total>limit?"\n[output truncated]":"");
        }
    }
    private record ProcessResult(int exitCode,String output){}
    private ProcessResult run(List<String> args,Path cwd,Duration timeout)throws Exception{
        ProcessBuilder builder=new ProcessBuilder(args).directory(cwd.toFile()).redirectErrorStream(true);cleanEnvironment(builder);
        Process process=builder.start();Future<String> output=readers.submit(()->readLimited(process.getInputStream(),120000));
        if(!process.waitFor(timeout.toMillis(),TimeUnit.MILLISECONDS)){process.destroyForcibly();output.cancel(true);throw new IllegalStateException("Validation fixed build command timed out");}
        return new ProcessResult(process.exitValue(),output.get(5,TimeUnit.SECONDS));
    }
    static void cleanEnvironment(ProcessBuilder builder){
        Map<String,String> old=new HashMap<>(builder.environment());builder.environment().clear();
        for(String name:List.of("PATH","Path","SystemRoot","SYSTEMROOT","WINDIR","TEMP","TMP","HOME","USERPROFILE","APPDATA","LOCALAPPDATA","GUANFENG_PYTHON","GUANFENG_PLAYWRIGHT","GUANFENG_BROWSER"))if(old.containsKey(name))builder.environment().put(name,old.get(name));
        builder.environment().put("NO_COLOR","1");
    }
    private String node(){String value=System.getenv("GUANFENG_NODE");return value==null||value.isBlank()?"node":value;}
    public Map<String,Object> deploy(String id)throws Exception{
        GenerationTask t=task(id);
        synchronized(t){
            if(!"ready".equals(t.get("status")))throw new IllegalArgumentException("Only a validated ready task can be deployed");
            Process existing=deployments.get(id);if(existing!=null&&existing.isAlive())return map(snapshot(t).get("deployment"));
            if(!Files.isRegularFile(t.dir.resolve("dist/index.html")))throw new IllegalArgumentException("Built application is missing");
            ProcessBuilder builder=new ProcessBuilder(node(),root.resolve("generation-template/runtime-server.mjs").toString(),t.dir.toString(),"http://127.0.0.1:"+backendPort,id,String.valueOf(backendPort),ownerId).directory(t.dir.toFile());cleanEnvironment(builder);
            builder.redirectError(t.dir.resolve("runtime-error.log").toFile());
            Process process=builder.start();
            try{
                BufferedReader lines=process.inputReader(StandardCharsets.UTF_8);
                Future<String> first=readers.submit(lines::readLine);String line=first.get(12,TimeUnit.SECONDS);
                int port=mapper.readTree(line).path("port").asInt();if(port<=0)throw new IOException("Runtime did not allocate a port");
                String url="http://127.0.0.1:"+port;
                HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
                HttpResponse<String> health=http.send(HttpRequest.newBuilder(URI.create(url+"/health")).timeout(Duration.ofSeconds(5)).GET().build(),HttpResponse.BodyHandlers.ofString());
                HttpResponse<String> page=http.send(HttpRequest.newBuilder(URI.create(url+"/")).timeout(Duration.ofSeconds(5)).GET().build(),HttpResponse.BodyHandlers.ofString());
                if(health.statusCode()!=200||!id.equals(mapper.readTree(health.body()).path("generationId").asText())||page.statusCode()!=200||!page.body().contains("id=\"app\""))throw new IOException("Runtime health or page verification failed");
                deployments.put(id,process);Map<String,Object> dep=Map.of("url",url,"port",port,"status","running","pid",process.pid(),"startedAt",now(),"healthCheckedAt",now(),"pageStatus",page.statusCode());t.put("deployment",dep);
                readers.submit(()->{try{while(lines.readLine()!=null){} }catch(IOException ignored){}});return dep;
            }catch(Exception e){process.destroyForcibly();t.put("deployment",Map.of("status","failed","time",now(),"reason","Local runtime startup or health verification failed"));throw new IllegalStateException("Local runtime startup or health verification failed");}
        }
    }
    public Map<String,Object> stop(String id){
        GenerationTask t=task(id);
        synchronized(t){
            Process p=deployments.get(id);
            if(p!=null){
                p.destroy();
                try{
                    if(!p.waitFor(3,TimeUnit.SECONDS)){p.destroyForcibly();if(!p.waitFor(3,TimeUnit.SECONDS))throw new IllegalStateException("Local runtime did not exit after stop");}
                }catch(InterruptedException e){Thread.currentThread().interrupt();p.destroyForcibly();throw new IllegalStateException("Local runtime stop was interrupted");}
                deployments.remove(id,p);
            }
            Map<String,Object> dep=Map.of("status","stopped","stoppedAt",now());t.put("deployment",dep);return dep;
        }
    }
    public byte[] export(String id)throws IOException{
        GenerationTask t=task(id);synchronized(t){
            if(!Set.of("ready","failed","interrupted").contains(String.valueOf(t.get("status"))))throw new IllegalArgumentException("Wait until generation finishes before exporting");
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();
            try(ZipOutputStream zip=new ZipOutputStream(bytes);var files=Files.walk(t.dir)){
                for(Path file:files.filter(Files::isRegularFile).sorted().toList()){
                    String relative=t.dir.relativize(file).toString().replace('\\','/');
                    if(Files.isSymbolicLink(file)||relative.contains("node_modules")||relative.endsWith(".tmp")||relative.startsWith("runtime-"))continue;
                    if(!file.toRealPath().startsWith(t.dir.toRealPath()))throw new IOException("Export path escaped task directory");
                    zip.putNextEntry(new ZipEntry(relative));Files.copy(file,zip);zip.closeEntry();
                }
            }
            return bytes.toByteArray();
        }
    }
    public Object runtime(String id,String operation,Map<String,Object> body,String datasetId){
        GenerationTask t=task(id);if(!"ready".equals(t.get("status")))throw new IllegalArgumentException("Application is not ready");
        return switch(operation){case "datasets"->workbench.datasets();case "dataset"->workbench.dataset(datasetId==null?String.valueOf(t.get("datasetId")):datasetId);case "analysis"->workbench.analyze(body);case "workflow/validate"->workbench.validateWorkflow(body);case "workflow/run"->workbench.runWorkflow(body);default->throw new IllegalArgumentException("Unsupported runtime operation");};
    }
    private GenerationTask task(String id){if(id==null||!id.matches("[a-f0-9-]{36}")||!tasks.containsKey(id))throw new IllegalArgumentException("Generation task does not exist");return tasks.get(id);}
    private List<Map<String,Object>> artifacts(GenerationTask t)throws Exception{
        List<Map<String,Object>> result=new ArrayList<>();try(var files=Files.walk(t.dir)){for(Path f:files.filter(Files::isRegularFile).sorted().toList()){if(f.getFileName().toString().startsWith("task.json"))continue;result.add(Map.of("path",t.dir.relativize(f).toString().replace('\\','/'),"bytes",Files.size(f),"sha256",hash(f)));}}return result;
    }
    private void write(GenerationTask t,String relative,String content)throws IOException{Path target=t.dir.resolve(relative).normalize();if(!target.startsWith(t.dir))throw new IOException("Invalid output path");Files.createDirectories(target.getParent());Files.writeString(target,content,StandardCharsets.UTF_8);}
    static String hash(Path path)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path)));}
    @SuppressWarnings("unchecked") static Map<String,Object> map(Object value){return value instanceof Map<?,?>?(Map<String,Object>)value:new LinkedHashMap<>();}
    private static String now(){return Instant.now().toString();}
    private static String truncate(String value,int max){return value.length()>max?value.substring(0,max)+"\n[truncated]":value;}
    private static String feedback(Throwable error){String text=error.getMessage();if(text==null)text=error.getClass().getSimpleName();return truncate(text.replaceAll("sk-[A-Za-z0-9_-]+","[redacted]"),12000);}
    @FunctionalInterface private interface Action<T>{T run()throws Exception;}
    private <T>T stage(GenerationTask t,String name,Action<T> action)throws Exception{
        String start=now(),stageId=UUID.randomUUID().toString();t.append("stages",Map.of("id",stageId,"name",name,"status","running","startedAt",start));
        try{T result=action.run();t.finishStage(stageId,Map.of("id",stageId,"name",name,"status","succeeded","startedAt",start,"finishedAt",now()));return result;}
        catch(Exception e){t.finishStage(stageId,Map.of("id",stageId,"name",name,"status","failed","startedAt",start,"finishedAt",now(),"error",feedback(e)));throw e;}
    }
    @PreDestroy public void close(){jobs.shutdownNow();roles.shutdownNow();deployments.values().forEach(Process::destroyForcibly);deployments.clear();readers.shutdownNow();}
}
