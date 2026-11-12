package com.leice.radar.demo.workbench;

import com.leice.radar.web.ApiResponse;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;

@RestController
@RequestMapping("/api/wb")
public class WorkbenchController {
    private final WorkbenchService service;
    private final WorkflowRunService workflowRuns;
    @org.springframework.beans.factory.annotation.Autowired
    public WorkbenchController(WorkbenchService service,WorkflowRunService workflowRuns){this.service=service;this.workflowRuns=workflowRuns;}
    // Preserve standalone construction used by existing controller tests.
    public WorkbenchController(WorkbenchService service){this(service,null);}
    private ApiResponse<Object> ok(Object data){return ApiResponse.ok(data,"ok");}
    @GetMapping("/health") public Object health(){return ok(service.health());}
    @GetMapping("/datasets") public Object datasets(){return ok(service.datasets());}
    @GetMapping("/datasets/{id}") public Object dataset(@PathVariable String id){return ok(service.dataset(id));}
    @PostMapping("/analysis") public Object analysis(@RequestBody Map<String,Object> body){return ok(service.analyze(body));}
    @GetMapping("/components") public Object components(){return ok(service.components());}
    @GetMapping("/plugins") public Object plugins(){return ok(service.plugins().components());}
    @PostMapping("/plugins/reload") public Object reload(){return ok(service.plugins().reload());}
    @PostMapping("/plugins/state") public Object pluginState(@RequestBody Map<String,Object> body){return ok(service.plugins().state(body,service.projects().current()));}
    @PostMapping("/workflow/validate") public Object validate(@RequestBody Map<String,Object> body){return ok(service.validateWorkflow(body));}
    @PostMapping("/workflow/run") public Object run(@RequestBody Map<String,Object> body){return ok(service.runWorkflow(body));}
    @PostMapping("/workflow/jobs") public Object startWorkflow(@RequestBody Map<String,Object> body){return ok(workflowRuns.submit(body));}
    @GetMapping("/workflow/jobs/{id}") public Object workflowJob(@PathVariable String id){return ok(workflowRuns.get(id));}
    @GetMapping("/workflow/exports/{runId}/{name}") public ResponseEntity<byte[]> workflowExport(@PathVariable String runId,@PathVariable String name)throws java.io.IOException{
        byte[] bytes=WorkflowEngine.readExport(service.root(),runId,name);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\""+name+"\"")
            .header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","default-src 'none'; frame-ancestors 'none'; sandbox")
            .contentType(MediaType.parseMediaType(name.endsWith(".csv")?"text/csv;charset=UTF-8":"text/html;charset=UTF-8")).body(bytes);
    }
    @PostMapping("/session") public Object session(@RequestBody Map<String,Object> body){return ok(service.projects().session(body));}
    @PostMapping("/session/leave") public Object leave(@RequestHeader(value="X-Session",required=false)String token){return ok(service.projects().leave(token));}
    @GetMapping("/projects/demo") public Object project(@RequestHeader(value="X-Session",required=false)String token){return ok(service.projects().get(token));}
    @PutMapping("/projects/demo") public Object update(@RequestHeader(value="X-Session",required=false)String token,@RequestBody Map<String,Object> body){service.projects().require(token,true);service.validateWorkflow(object(body.get("workflow")));return ok(service.projects().update(token,body));}
    @PostMapping("/projects/demo/rollback") public Object rollback(@RequestHeader(value="X-Session",required=false)String token,@RequestBody Map<String,Object> body){return ok(service.projects().rollback(token,body));}
    @GetMapping("/projects/demo/diff") public Object diff(@RequestHeader(value="X-Session",required=false)String token,@RequestParam int from,@RequestParam int to){return ok(service.projects().diff(token,from,to));}
    @PostMapping("/projects/demo/invite") public Object invite(@RequestHeader(value="X-Session",required=false)String token,@RequestBody Map<String,Object> body){return ok(service.projects().invite(token,body));}
    @GetMapping("/analysis/export") public ResponseEntity<byte[]> export(@RequestParam Map<String,String> params){
        Map<String,Object> req=new LinkedHashMap<>(params);Map<String,Object> result=service.analyze(req);String type=params.getOrDefault("format","csv");String content;
        if(type.equals("csv")){
            StringBuilder b=new StringBuilder("\uFEFFstart,end,peak_m_per_s,heights_m,observation_records\r\n");
            for(Object value:(List<?>)result.get("events")){var e=object(value);b.append(e.get("start")).append(',').append(e.get("end")).append(',').append(e.get("peak")).append(",\"").append(e.get("heights")).append("\",").append(e.get("records")).append("\r\n");}content=b.toString();
        }else if(type.equals("html"))content="<!doctype html><html><meta charset='utf-8'><title>Observation analysis</title><h1>Observation analysis</h1><p>User-configured rule; no flight safety conclusion.</p><pre>"+escape(result.toString())+"</pre></html>";
        else throw new IllegalArgumentException("Export format must be csv or html");
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=wind-analysis."+type).contentType(MediaType.parseMediaType(type.equals("csv")?"text/csv;charset=UTF-8":"text/html;charset=UTF-8")).body(content.getBytes(StandardCharsets.UTF_8));
    }
    private String escape(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");}
}
