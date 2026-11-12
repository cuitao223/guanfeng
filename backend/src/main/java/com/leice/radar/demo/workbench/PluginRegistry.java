package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;

public final class PluginRegistry {
    private final Path root;
    private final ObjectMapper json;
    private final Map<String,Map<String,Object>> registry=new LinkedHashMap<>();
    private final Map<String,Boolean> enabled=new HashMap<>();
    public PluginRegistry(Path root,ObjectMapper json)throws Exception{this.root=root;this.json=json;if(Files.exists(root.resolve("runtime/plugin-state.json")))enabled.putAll(json.readValue(root.resolve("runtime/plugin-state.json").toFile(),new TypeReference<>(){}));reload();}
    public synchronized Map<String,Object> reload(){
        Map<String,Map<String,Object>> candidate=new LinkedHashMap<>();
        for(String id:List.of("reader","quality","statistics","events","chart","export")){
            String input=id.equals("reader")?"none":id.equals("quality")?"dataset":"analysis";
            Map<String,Object> c=builtin(id,input);
            candidate.put(id+"@1.0.0",c);
        }
        List<Map<String,Object>> rejected=new ArrayList<>();
        Path dir=root.resolve("plugins");
        try{Files.createDirectories(dir);try(var files=Files.list(dir)){
            for(Path p:files.filter(x->x.toString().endsWith(".json")).sorted().toList())try{
                if(!p.toRealPath().startsWith(dir.toRealPath()))throw new IllegalArgumentException("Plugin path outside registry");
                Map<String,Object> c=json.readValue(p.toFile(),new TypeReference<>(){});
                String id=text(c,"id",""),version=text(c,"version",""),expression=text(c,"expression","");
                if(!id.matches("[a-z][a-z0-9-]{1,50}")||!version.matches("[0-9]+\\.[0-9]+\\.[0-9]+")||List.of("reader","quality","statistics","events","chart","export").contains(id))throw new IllegalArgumentException("Invalid or reserved plugin identity");
                if(!"analysis".equals(c.get("inputType"))||!"analysis".equals(c.get("outputType")))throw new IllegalArgumentException("Plugin must consume and return analysis");
                if(!"1".equals(text(c,"apiVersion","")))throw new IllegalArgumentException("Incompatible plugin API");
                evaluate(expression,map("mean",1,"max",2,"validCount",3,"missingCount",1,"exceedCount",1));
                c.put("origin","team-new-plugin");c.putIfAbsent("inputUnit","source-native");c.putIfAbsent("tags",List.of("meteorology","plugin",id));c.putIfAbsent("example",map("node",map("id","plugin","component",id,"version",version,"params",map()),"note","Run after a compatible analysis node"));c.putIfAbsent("testReference","tests/integration/verify_core.py:check_plugins");c.put("category","calculation");c.put("parameters",c.getOrDefault("parameters",map()));c.putIfAbsent("inputSchema",schema(List.of("summary"),map("summary",summarySchema())));c.putIfAbsent("outputSchema",schema(List.of("summary","pluginResults"),map("summary",summarySchema(),"pluginResults",map("type","object"))));c.put("enabled",enabled.getOrDefault(id+"@"+version,true));
                if(candidate.putIfAbsent(id+"@"+version,c)!=null)throw new IllegalArgumentException("Duplicate plugin version");
            }catch(Exception e){rejected.add(map("file",p.getFileName().toString(),"reason",e.getMessage()==null?"invalid manifest":e.getMessage()));}
        }}catch(Exception e){throw new IllegalStateException("Cannot scan plugin directory",e);}
        Path project=root.resolve("runtime/project.json");
        if(Files.isRegularFile(project))try{
            Map<String,Object> saved=json.readValue(project.toFile(),new TypeReference<>(){});
            for(Object raw:(List<?>)object(saved.get("workflow")).getOrDefault("nodes",List.of())){
                Map<String,Object> node=object(raw);String key=text(node,"component","")+"@"+text(node,"version","");
                if(!candidate.containsKey(key)){
                    String message="Referenced component manifest is missing or invalid: "+key+"; restore it before reloading";
                    if(registry.containsKey(key))throw new IllegalArgumentException(message+"; previous registry retained");
                    rejected.add(map("component",key,"reason",message));
                }
            }
        }catch(IllegalArgumentException e){throw e;}catch(Exception e){throw new IllegalStateException("Cannot verify saved project references before plugin reload",e);}
        registry.clear();registry.putAll(candidate);
        return map("loaded",registry.size(),"rejected",rejected,"time",Instant.now().toString());
    }
    private static Map<String,Object> schema(List<String> required,Map<String,Object> properties){
        return map("type","object","required",required,"properties",properties,"additionalProperties",true);
    }
    private static Map<String,Object> field(String type,String description){return map("type",type,"description",description);}
    private static Map<String,Object> array(Map<String,Object> items){return map("type","array","items",items);}
    private static Map<String,Object> summarySchema(){
        return schema(List.of("mean","max","validCount","missingCount"),map(
            "mean",map("type",List.of("number","null"),"description","Mean of valid values; null for no valid data"),
            "max",map("type",List.of("number","null"),"description","Maximum valid value; null for no valid data"),
            "min",map("type",List.of("number","null")),
            "validCount",map("type","integer","minimum",0),"missingCount",map("type","integer","minimum",0),
            "exceedCount",map("type","integer","minimum",0,"description","DBS cells above the user threshold; absent for scientific grids")));
    }
    private static Map<String,Object> analysisProperties(){
        Map<String,Object> number=field("number","Source-native number; 999 denotes a missing plot sample");
        Map<String,Object> time=field("string","Observation local time yyyy-MM-dd HH:mm:ss; no inferred timezone");
        Map<String,Object> event=schema(List.of("start","end","peak","heights","records"),map(
            "start",time,"end",time,"peak",field("number","Peak speed in m/s"),
            "heights",array(field("number","Observed height in m")),"records",map("type","integer","minimum",1)));
        return map("datasetId",field("string","Dataset ID from the live catalogue"),
            "dataset",schema(List.of("id","format"),map("id",field("string","Dataset ID"),"format",field("string","Source format"))),
            "times",array(time),"heightArr",array(field("number","Observed height in m")),
            "values",array(array(number)),"dirs",array(array(field("number","Direction in degrees; 999 missing"))),
            "unit",field("string","m/s for DBS; otherwise source-native unit"),"summary",summarySchema(),
            "events",array(event),"quality",schema(List.of("status"),map("status",field("string","observed, insufficient-data or source-native-validity"))),
            "provenance",schema(List.of(),map("source",field("string","Original data source"),
                "heightMin",field("number","Selected minimum height in m"),"heightMax",field("number","Selected maximum height in m"),
                "start",time,"end",time,"threshold",field("number","User rule in m/s"),"coordinatesKnown",field("boolean","Whether source provides coordinates"))),
            "grid",schema(List.of("x","y","values","unit"),map("x",array(number),"y",array(number),"values",array(array(number)),"unit",field("string","Source variable unit"))));
    }
    private static Map<String,Object> builtin(String id,String input){
        Map<String,Object> c=map("id",id,"version","1.0.0","name",id,"category",id,"inputType",input,
            "outputType",id.equals("reader")?"dataset":"analysis",
            "origin",id.equals("reader")||id.equals("chart")?"organizer-extended":"team-new","enabled",true);
        Map<String,Object> props=analysisProperties(),params=new LinkedHashMap<>();
        List<String> inputRequired=new ArrayList<>(),outputRequired=new ArrayList<>(),parameterRequired=new ArrayList<>();
        String description,unit,test;
        Map<String,Object> exampleParams=map();
        switch(id){
            case "reader" -> {
                description="Resolve a catalogue dataset ID to metadata; decoding is performed by the downstream quality node";
                unit="metadata only; decoded variables retain their source units";
                params.put("datasetId",map("type","string","minLength",1,"description","Required live catalogue ID; filesystem paths are not accepted","consumedBy","workflow.reader"));
                parameterRequired.add("datasetId");exampleParams=map("datasetId","<dataset-id-from-catalogue>");
                props=map("datasetId",field("string","Resolved live dataset ID"),"dataset",props.get("dataset"));
                outputRequired.addAll(List.of("datasetId","dataset"));
                test="WorkbenchTest#workflowRunsBranchedDataflowAndPinsVersions; tests/integration/verify_core.py:check_workflow";
            }
            case "quality" -> {
                description="DBS decoding, missing-value/direction checks and selected coverage analysis; other formats use their source-native decoder and ignore DBS-only parameters";
                unit="DBS speed m/s, height m, direction degree; grids use grid.unit (K or m2/s2)";
                params.putAll(map("heightMin",map("type","number","unit","m","description","DBS only; inclusive lower observed height; defaults to source minimum"),
                    "heightMax",map("type","number","unit","m","description","DBS only; inclusive upper observed height; defaults to source maximum"),
                    "start",field("string","DBS only; yyyy-MM-dd HH:mm:ss within coverage; defaults to first observation"),
                    "end",field("string","DBS only; yyyy-MM-dd HH:mm:ss within coverage; defaults to last observation"),
                    "rejectInvalidDirection",map("type","boolean","default",true,"description","DBS statistics reject invalid directions by default; plotting always requires paired speed and direction"),
                    "threshold",map("type","number","minimum",0,"maximum",150,"default",10,"unit","m/s","description","DBS analyzer also computes initial exceedance records using this user rule")));
                inputRequired.addAll(List.of("datasetId","dataset"));outputRequired.addAll(List.of("datasetId","quality"));
                exampleParams=map("heightMin",127,"heightMax",142,"rejectInvalidDirection",true);
                test="WorkbenchTest#missingDoesNotPolluteStatistics, #outOfCoverageAndInvalidNumbersRejected, #absentDateRejected, #allMissingIsInsufficientNotNormal; tests/data/test_worker.py";
            }
            case "statistics" -> {
                description="Expose a copy of the upstream numeric summary as statistics; this node does not recompute values";
                unit="inherited source variable unit; counts are samples";
                inputRequired.add("summary");outputRequired.addAll(List.of("summary","statistics"));props.put("statistics",summarySchema());
                test="WorkbenchTest#workflowRunsBranchedDataflowAndPinsVersions; tests/integration/verify_core.py:check_radar_analysis";
            }
            case "events" -> {
                description="Re-analyze a DBS dataset with upstream provenance coverage and node parameter overrides; threshold exceedance is a user rule, not a safety standard";
                unit="speed/peak m/s; heights m; records count observation timestamps";
                params.put("threshold",map("type","number","minimum",0,"maximum",150,"default",10,"unit","m/s","description","Overrides upstream provenance threshold; otherwise upstream value or analyzer default 10"));
                params.put("heightMin",map("type","number","unit","m","description","Optional override of upstream provenance heightMin"));
                params.put("heightMax",map("type","number","unit","m","description","Optional override of upstream provenance heightMax"));
                params.put("start",field("string","Optional yyyy-MM-dd HH:mm:ss override of upstream provenance start"));
                params.put("end",field("string","Optional yyyy-MM-dd HH:mm:ss override of upstream provenance end"));
                params.put("rejectInvalidDirection",map("type","boolean","default",true,"description","Inherits upstream direction policy unless explicitly overridden; defaults to true"));
                inputRequired.add("datasetId");props.put("datasetId",map("type","string","pattern","^dbs-","description","DBS required; grid and radial scan inputs are rejected"));
                outputRequired.addAll(List.of("datasetId","times","heightArr","values","dirs","unit","summary","events","quality","provenance"));
                exampleParams=map("threshold",10);
                test="WorkbenchTest#missingCutsEventsAndThresholdChangesOutput; tests/integration/verify_core.py:check_radar_analysis";
            }
            case "chart" -> {
                description="Return chart.kind and chart.data from actual processed profile/scan/grid input; no re-reading or fabricated measurements";
                unit="inherited source units; profile height/range m, speed m/s; grid coordinates retain source units";
                params.put("mode",map("type","string","enum",List.of("auto","profile","scan","grid"),"default","auto","runtimeConsumed",true,
                    "description","auto detects processed data shape; explicit mode must match it. Styling options are not consumed"));
                props.put("chart",schema(List.of("kind","data"),map("kind",map("type","string","enum",List.of("profile","scan","grid")),"data",schema(List.of(),analysisProperties()))));
                props.put("chartReady",map("type","boolean","const",true));outputRequired.addAll(List.of("chart","chartReady"));
                exampleParams=map("mode","auto");
                test="WorkflowArtifactsTest#profileWorkflowProducesChartAndRealExports, #gridAndScanUseProcessedCellsAndCoordinates, #chartRejectsWrongModeAndMalformedShapes";
            }
            default -> {
                description="Serialize actual upstream processed data to CSV/HTML files and return hashed download descriptors; no separate analysis is performed";
                unit="source-native units; profile time,height(m),speed(m/s),direction(degree); scan angle(degree),range(m),radialWind(m/s); grid x,y,value use native units";
                params.put("format",map("type","string","enum",List.of("csv","html","both"),"default","both","runtimeConsumed",true,
                    "description","Write csv, html or both under the workflow run export directory; HTML includes escaped source data and provenance"));
                props.put("exports",array(schema(List.of("name","format","url","sha256","bytes"),map(
                    "name",field("string","Generated node filename"),"format",map("type","string","enum",List.of("csv","html")),
                    "url",field("string","Local GET /api/wb/workflow/exports/{runId}/{name}"),"sha256",map("type","string","pattern","^[0-9a-f]{64}$"),"bytes",map("type","integer","minimum",0)))));
                props.put("exportReady",map("type","boolean","const",true));outputRequired.addAll(List.of("exports","exportReady"));
                exampleParams=map("format","both");
                test="WorkflowArtifactsTest#profileWorkflowProducesChartAndRealExports, #gridAndScanUseProcessedCellsAndCoordinates, #downloadRejectsTraversalAndLinks";
            }
        }
        if(id.equals("events"))c.put("inputUnit","m/s");
        c.put("description",description);c.put("unit",unit);c.put("tags",List.of("meteorology",id,id.equals("reader")?"catalogue":"workflow"));
        Map<String,Object> inputProps=id.equals("reader")?map():new LinkedHashMap<>(props);
        inputProps.remove("statistics");inputProps.remove("chart");inputProps.remove("chartReady");inputProps.remove("exports");inputProps.remove("exportReady");
        c.put("inputSchema",schema(inputRequired,inputProps));c.put("outputSchema",schema(outputRequired,props));
        c.put("parameters",schema(parameterRequired,params));
        c.put("example",map("node",map("id",id,"component",id,"version","1.0.0","params",exampleParams),
            "note","Use in a compatible workflow; replace catalogue ID placeholders. Heights 127..142 are the explicit WorkbenchTest fixture, not invented production observations."));
        c.put("testReference",test);
        c.put("validationScope","DAG validate enforces parameter required/type/enum/minimum/maximum/const/minLength/properties/items/additionalProperties and finite numeric values; empty plugin schemas are allowed. Defaults remain runtime behavior. Input/output data shapes, values and coverage are checked during execution");
        return c;
    }
    public synchronized List<Map<String,Object>> components(){return new ArrayList<>(registry.values());}
    public synchronized Map<String,Object> resolve(String id,String version){Map<String,Object> c=registry.get(id+"@"+version);if(c==null||!Boolean.TRUE.equals(c.get("enabled")))throw new IllegalArgumentException("Unavailable component version: "+id+"@"+version);return new LinkedHashMap<>(c);}
    public synchronized Map<String,Object> state(Map<String,Object> request,Map<String,Object> project){
        String id=text(request,"id",""),version=text(request,"version","");Map<String,Object> c=registry.get(id+"@"+version);if(c==null||!c.containsKey("expression"))throw new IllegalArgumentException("Only registered plugins can be enabled or disabled");
        boolean on=Boolean.TRUE.equals(request.get("enabled"));
        if(!on){Map<String,Object>w=object(project.get("workflow"));for(Object n:(List<?>)w.getOrDefault("nodes",List.of())){Map<String,Object> node=object(n);if(id.equals(node.get("component"))&&version.equals(node.get("version")))throw new IllegalArgumentException("Component version is referenced by current project; remove the node before disabling");}}
        enabled.put(id+"@"+version,on);c.put("enabled",on);try{json.writerWithDefaultPrettyPrinter().writeValue(root.resolve("runtime/plugin-state.json").toFile(),enabled);}catch(Exception e){throw new IllegalStateException("Cannot persist plugin state");}return c;
    }
    public static void validateOutput(Map<String,Object> component,Map<String,Object> output){
        ComponentParameters.validate(component.getOrDefault("outputSchema",map()),output,"Component "+component.get("id")+" output");
    }
    public static void validateInput(Map<String,Object> component,Map<String,Object> input){
        ComponentParameters.validate(component.getOrDefault("inputSchema",map()),input,"Component "+component.get("id")+" input");
        String actual=text(input,"unit","");
        if(input.containsKey("times")||input.containsKey("angles")){
            if(!"m/s".equals(actual))throw new IllegalArgumentException("Wind profile/scan unit must be m/s; received "+actual);
        }
        if(input.get("grid") instanceof Map<?,?>){
            actual=text(object(input.get("grid")),"unit","");
            if(actual.isBlank())throw new IllegalArgumentException("Scientific grid unit is required");
        }
        String expected=text(component,"inputUnit","source-native");
        if(!expected.equals("source-native")&&!expected.equals(actual))throw new IllegalArgumentException("Component "+component.get("id")+" requires input unit "+expected+"; received "+actual);
    }
    public static double evaluate(String text,Map<String,Object> variables){return new Expression(text,variables).parse();}
    private static final class Expression {
        private final String text;private final Map<String,Object> vars;private int pos;
        Expression(String text,Map<String,Object> vars){if(text.length()>240)throw new IllegalArgumentException("Expression too long");this.text=text;this.vars=vars;}
        double parse(){double d=add();skip();if(pos!=text.length()||!Double.isFinite(d))throw new IllegalArgumentException("Invalid or non-finite plugin expression");return d;}
        void skip(){while(pos<text.length()&&Character.isWhitespace(text.charAt(pos)))pos++;}
        boolean take(char c){skip();if(pos<text.length()&&text.charAt(pos)==c){pos++;return true;}return false;}
        double add(){double a=multiply();while(true){if(take('+'))a+=multiply();else if(take('-'))a-=multiply();else return a;}}
        double multiply(){double a=atom();while(true){if(take('*'))a*=atom();else if(take('/')){double b=atom();if(b==0)throw new IllegalArgumentException("Plugin division by zero; insufficient data");a/=b;}else return a;}}
        double atom(){skip();if(take('-'))return -atom();if(take('(')){double a=add();if(!take(')'))throw new IllegalArgumentException("Unclosed expression");return a;}int start=pos;while(pos<text.length()&&(Character.isLetterOrDigit(text.charAt(pos))||text.charAt(pos)=='.'||text.charAt(pos)=='_'))pos++;if(start==pos)throw new IllegalArgumentException("Expected expression term");String token=text.substring(start,pos);if(token.matches("[0-9.]+"))return Double.parseDouble(token);if(!List.of("mean","max","validCount","missingCount","exceedCount").contains(token)||!(vars.get(token)instanceof Number))throw new IllegalArgumentException("Unknown or missing metric "+token);return ((Number)vars.get(token)).doubleValue();}
    }
}
