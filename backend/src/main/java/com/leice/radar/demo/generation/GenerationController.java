package com.leice.radar.demo.generation;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Public contract adapter; agent work lives in GenerationService. */
@RestController
@RequestMapping("/api/wb/generation")
public class GenerationController {
    private final GenerationService service;
    public GenerationController(GenerationService service){this.service=service;}
    @GetMapping public Map<String,Object> list(){return ok(service.list());}
    @PostMapping(consumes=MediaType.APPLICATION_JSON_VALUE) public Map<String,Object> create(@RequestBody Map<String,Object> request){return ok(service.create(request));}
    @GetMapping("/owner") public Map<String,Object> owner(){return ok(Map.of("ownerId",service.ownerId()));}
    @GetMapping("/{id}") public Map<String,Object> get(@PathVariable String id){return ok(service.get(id));}
    @PostMapping("/{id}/deploy") public Map<String,Object> deploy(@PathVariable String id)throws Exception{return ok(service.deploy(id));}
    @PostMapping("/{id}/stop") public Map<String,Object> stop(@PathVariable String id){return ok(service.stop(id));}
    @GetMapping("/{id}/export") public ResponseEntity<byte[]> export(@PathVariable String id)throws Exception{
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/zip"))
            .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"generation-"+id+".zip\"").body(service.export(id));
    }
    @GetMapping("/{id}/runtime/datasets") public Map<String,Object> datasets(@PathVariable String id){return ok(service.runtime(id,"datasets",Map.of(),null));}
    @GetMapping("/{id}/runtime/dataset") public Map<String,Object> dataset(@PathVariable String id,@RequestParam(required=false,name="id")String datasetId){return ok(service.runtime(id,"dataset",Map.of(),datasetId));}
    @PostMapping("/{id}/runtime/analysis") public Map<String,Object> analyze(@PathVariable String id,@RequestBody Map<String,Object> body){return ok(service.runtime(id,"analysis",body,null));}
    @PostMapping("/{id}/runtime/workflow/validate") public Map<String,Object> validate(@PathVariable String id,@RequestBody Map<String,Object> body){return ok(service.runtime(id,"workflow/validate",body,null));}
    @PostMapping("/{id}/runtime/workflow/run") public Map<String,Object> run(@PathVariable String id,@RequestBody Map<String,Object> body){return ok(service.runtime(id,"workflow/run",body,null));}
    static Map<String,Object> ok(Object data){return Map.of("code",200,"msg","ok","data",data);}
}
