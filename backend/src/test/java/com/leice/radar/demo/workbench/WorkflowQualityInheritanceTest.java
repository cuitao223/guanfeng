package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyMap;

class WorkflowQualityInheritanceTest {
    @TempDir Path root;
    WorkbenchService wb;
    String dataset;
    @BeforeEach void setup()throws Exception{
        Files.createDirectories(root.resolve("frontend"));Files.createDirectories(root.resolve("data/radar"));
        // Explicit synthetic regression fixture; speed 20 has no valid wind direction.
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,5,180,12,190\n20260901 00:10:00,20,50,1000,20,999,14,190\n20260901 00:20:00,20,50,1000,7,180,8,190\n");
        System.setProperty("guanfeng.root",root.toString());wb=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());dataset=wb.datasets().get(0).get("id").toString();
    }
    @AfterEach void reset(){System.clearProperty("guanfeng.root");}
    Map<String,Object> selection(){return map("datasetId",dataset,"heightMin",127,"heightMax",127,"start","2026-09-01 00:10:00","end","2026-09-01 00:20:00","threshold",10,"rejectInvalidDirection",false);}
    Map<String,Object> workflow(Map<String,Object> eventParams){return map("nodes",List.of(
        map("id","reader","component","reader","version","1.0.0","params",map("datasetId",dataset)),
        map("id","quality","component","quality","version","1.0.0","params",selection()),
        map("id","events","component","events","version","1.0.0","params",eventParams)),
        "edges",List.of(map("from","reader","to","quality"),map("from","quality","to","events")));}
    @Test void analysisProvenanceRecordsEffectiveDirectionPolicy(){
        assertEquals(false,object(wb.analyze(selection()).get("provenance")).get("rejectInvalidDirection"));
        var request=selection();request.remove("rejectInvalidDirection");
        assertEquals(true,object(wb.analyze(request).get("provenance")).get("rejectInvalidDirection"));
    }
    @Test void eventsPreserveTimeHeightThresholdAndFalseDirectionPolicy(){
        var run=wb.runWorkflow(workflow(map()));assertEquals("succeeded",run.get("status"),run.toString());
        var result=object(run.get("result"));var expected=wb.analyze(selection());
        assertEquals(expected.get("summary"),result.get("summary"));assertEquals(expected.get("events"),result.get("events"));
        assertEquals(false,object(result.get("quality")).get("directionRequired"));
        assertEquals(2L,object(result.get("summary")).get("validCount"));
        assertEquals(13.5,((Number)object(result.get("summary")).get("mean")).doubleValue());
        for(String key:List.of("heightMin","heightMax","start","end","threshold","rejectInvalidDirection"))
            assertEquals(object(expected.get("provenance")).get(key),object(result.get("provenance")).get(key),key);
    }
    @Test void explicitEventsPolicyOverrideStillWins(){
        var result=object(wb.runWorkflow(workflow(map("rejectInvalidDirection",true))).get("result"));
        assertEquals(1L,object(result.get("summary")).get("validCount"));assertEquals(7d,object(result.get("summary")).get("mean"));
        assertEquals(true,object(result.get("provenance")).get("rejectInvalidDirection"));assertTrue(((List<?>)result.get("events")).isEmpty());
    }
    @Test void chainedEventsRetainPolicyWhileOverridingOnlyThreshold(){
        var workflow=workflow(map("threshold",15));
        @SuppressWarnings("unchecked") var nodes=new ArrayList<>((List<Map<String,Object>>)workflow.get("nodes"));
        nodes.add(map("id","again","component","events","version","1.0.0","params",map("threshold",18)));workflow.put("nodes",nodes);
        @SuppressWarnings("unchecked") var edges=new ArrayList<>((List<Map<String,Object>>)workflow.get("edges"));edges.add(map("from","events","to","again"));workflow.put("edges",edges);
        var result=object(wb.runWorkflow(workflow).get("result"));
        assertEquals(false,object(result.get("provenance")).get("rejectInvalidDirection"));assertEquals(18d,((Number)object(result.get("provenance")).get("threshold")).doubleValue());
        assertEquals(1L,object(result.get("summary")).get("exceedCount"));assertEquals(2L,object(result.get("summary")).get("validCount"));
    }
    @Test void engineRejectsMalformedOutputBeforeSendingItDownstream(){
        var wrapped=spy(wb);
        doAnswer(call->{@SuppressWarnings("unchecked") var result=(Map<String,Object>)call.callRealMethod();result.remove("quality");return result;}).when(wrapped).analyze(anyMap());
        var run=new WorkflowEngine(wrapped,wb.plugins()).run(workflow(map()));
        assertEquals("failed",run.get("status"));var stages=(List<?>)run.get("nodes");assertEquals(2,stages.size());
        var failed=object(stages.get(1));assertEquals("quality",failed.get("id"));
        assertTrue(failed.get("error").toString().contains("output.quality is required"),failed.toString());
    }
    @Test void engineRejectsIncompatibleInputUnitBeforeEventsComputation(){
        var wrapped=spy(wb);
        doAnswer(call->{@SuppressWarnings("unchecked") var result=(Map<String,Object>)call.callRealMethod();result.put("unit","K");return result;}).when(wrapped).analyze(anyMap());
        var run=new WorkflowEngine(wrapped,wb.plugins()).run(workflow(map()));
        assertEquals("failed",run.get("status"));var stages=(List<?>)run.get("nodes");assertEquals(3,stages.size());
        var failed=object(stages.get(2));assertEquals("events",failed.get("id"));assertTrue(failed.get("error").toString().contains("unit must be m/s"),failed.toString());
        verify(wrapped,times(1)).analyze(anyMap());
    }
}
