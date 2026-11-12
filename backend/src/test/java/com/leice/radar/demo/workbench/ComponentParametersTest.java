package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.math.BigDecimal;
import java.nio.file.*;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ComponentParametersTest {
    @TempDir Path root;
    WorkbenchService wb;
    String previousRoot;
    ObjectMapper json=new ObjectMapper();
    @BeforeEach void setup()throws Exception{
        Files.createDirectories(root.resolve("frontend"));Files.createDirectories(root.resolve("data/radar"));
        // Explicit synthetic fixture; parameter contracts are not observation evidence.
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,5,180,12,190\n");
        previousRoot=System.getProperty("guanfeng.root");System.setProperty("guanfeng.root",root.toString());
        wb=new WorkbenchService(json,new RadarSeriesService());
    }
    @AfterEach void restore(){if(previousRoot==null)System.clearProperty("guanfeng.root");else System.setProperty("guanfeng.root",previousRoot);}
    Map<String,Object> node(Map<String,Object> workflow,String id){return ((List<?>)workflow.get("nodes")).stream().map(Values::object).filter(n->id.equals(n.get("id"))).findFirst().orElseThrow();}
    @Test void missingDatasetIdIsRejectedByDagAndHttpEndpoint()throws Exception{
        var workflow=wb.defaultWorkflow();node(workflow,"reader").remove("params");
        var error=assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
        assertTrue(error.getMessage().contains("reader"));assertTrue(error.getMessage().contains("datasetId"));
        MockMvcBuilders.standaloneSetup(new WorkbenchController(wb)).setControllerAdvice(new WorkbenchErrors()).build()
            .perform(post("/api/wb/workflow/validate").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(workflow)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.msg").value(org.hamcrest.Matchers.containsString("datasetId")));
    }
    @Test void rejectsWrongTypesAndEmptyRequiredString(){
        for(Object value:Arrays.asList(42,true,null,"")){
            var workflow=wb.defaultWorkflow();node(workflow,"reader").put("params",map("datasetId",value));
            assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
        }
        for(var entry:map("heightMin","127","heightMax",false,"start",123,"end",true,"rejectInvalidDirection","false").entrySet()){
            var workflow=wb.defaultWorkflow();node(workflow,"quality").put("params",map(entry.getKey(),entry.getValue()));
            assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
        }
        var workflow=wb.defaultWorkflow();node(workflow,"quality").put("params",List.of());
        assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
    }
    @Test void rejectsIllegalChartAndExportEnums(){
        for(String id:List.of("chart","export")){
            var workflow=wb.defaultWorkflow();node(workflow,id).put("params",map(id.equals("chart")?"mode":"format","unsupported"));
            var error=assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));assertTrue(error.getMessage().contains("enum"));
        }
    }
    @Test void thresholdRequiresFiniteNumberWithinInclusiveBounds(){
        for(Object threshold:List.of(-1,151,"10",Double.NaN,Double.POSITIVE_INFINITY,Double.NEGATIVE_INFINITY)){
            var workflow=wb.defaultWorkflow();node(workflow,"events").put("params",map("threshold",threshold));
            assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
        }
        for(Number threshold:List.of(0,10.5,150)){
            var workflow=wb.defaultWorkflow();node(workflow,"events").put("params",map("threshold",threshold));
            assertEquals(true,wb.validateWorkflow(workflow).get("valid"));
        }
    }
    @Test void validDefaultsAreNotInsertedIntoNodeParameters(){
        var workflow=wb.defaultWorkflow();node(workflow,"quality").put("params",map());node(workflow,"events").put("params",map());
        assertEquals(true,wb.validateWorkflow(workflow).get("valid"));
        assertTrue(object(node(workflow,"quality").get("params")).isEmpty());assertTrue(object(node(workflow,"events").get("params")).isEmpty());
    }
    @Test void emptyPluginSchemaIsCompatibleButNonfiniteUnknownValuesAreRejected()throws Exception{
        json.writeValue(root.resolve("plugins/ratio.json").toFile(),map("id","test-ratio","version","1.0.0","apiVersion","1","inputType","analysis","outputType","analysis","expression","exceedCount / validCount","parameters",map()));
        wb.plugins().reload();var workflow=wb.defaultWorkflow();
        ((List<Map<String,Object>>)workflow.get("nodes")).add(map("id","ratio","component","test-ratio","version","1.0.0","params",map("optional",true)));
        var edges=new ArrayList<Object>((List<?>)workflow.get("edges"));edges.add(map("from","events","to","ratio"));workflow.put("edges",edges);
        assertEquals(true,wb.validateWorkflow(workflow).get("valid"));node(workflow,"ratio").put("params",map());assertEquals(true,wb.validateWorkflow(workflow).get("valid"));
        node(workflow,"ratio").put("params",map("nested",List.of(map("unexpected",Double.NaN))));
        assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(workflow));
    }
    @Test void recursiveSubsetChecksIntegerEnumAndExtraProperties(){
        var schema=map("type","object","required",List.of("count"),"properties",map("count",map("type","integer","enum",List.of(1,2),"minimum",1,"maximum",2)),"additionalProperties",false);
        ComponentParameters.validate(schema,map("count",1.0),"params");
        assertThrows(IllegalArgumentException.class,()->ComponentParameters.validate(schema,map("count",1.5),"params"));
        assertThrows(IllegalArgumentException.class,()->ComponentParameters.validate(schema,map("count",new BigDecimal("1.0000000000000001")),"params"));
        assertThrows(IllegalArgumentException.class,()->ComponentParameters.validate(schema,map("count",3),"params"));
        assertThrows(IllegalArgumentException.class,()->ComponentParameters.validate(schema,map("count",1,"extra",0),"params"));
        var arrays=map("type","object","properties",map("values",map("type","array","items",map("type","boolean"))));
        ComponentParameters.validate(arrays,map("values",List.of(true,false)),"params");
        assertThrows(IllegalArgumentException.class,()->ComponentParameters.validate(arrays,map("values",List.of(true,1)),"params"));
    }
    @Test void coverageStillRejectsAtExecutionAfterParametersValidate(){
        var workflow=wb.defaultWorkflow();node(workflow,"quality").put("params",map("heightMin",80,"heightMax",142));
        assertEquals(true,wb.validateWorkflow(workflow).get("valid"));
        var run=wb.runWorkflow(workflow);assertEquals("failed",run.get("status"));
        assertTrue(((List<?>)run.get("nodes")).stream().map(Values::object).anyMatch(n->"quality".equals(n.get("id"))&&"failed".equals(n.get("status"))));
    }
}
