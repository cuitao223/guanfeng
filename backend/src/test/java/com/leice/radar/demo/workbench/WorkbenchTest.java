package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;

class WorkbenchTest {
    @TempDir Path root;
    WorkbenchService wb;
    String dataset;
    @BeforeEach void setup() throws Exception {
        Files.createDirectories(root.resolve("data/radar"));Files.createDirectories(root.resolve("frontend"));
        // Explicit synthetic fixture with hand-computable values; not competition evidence.
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,5,180,12,190\n20260901 00:10:00,20,50,1000,999,180,14,190\n20260901 00:20:00,20,50,1000,7,180,8,190\n");
        System.setProperty("guanfeng.root",root.toString());wb=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());dataset=wb.datasets().get(0).get("id").toString();
    }
    @AfterEach void reset(){System.clearProperty("guanfeng.root");}
    Map<String,Object> request(){return map("datasetId",dataset,"heightMin",127,"heightMax",142,"threshold",10);}
    @Test void missingDoesNotPolluteStatistics(){Map<String,Object> result=wb.analyze(request()),s=object(result.get("summary"));assertEquals(5L,s.get("validCount"));assertEquals(1L,s.get("missingCount"));assertEquals(9.2,((Number)s.get("mean")).doubleValue(),1e-9);assertEquals(14d,s.get("max"));assertEquals(2L,s.get("exceedCount"));}
    @Test void missingCutsEventsAndThresholdChangesOutput(){assertEquals(2,((List<?>)wb.analyze(request()).get("events")).size());var r=request();r.put("threshold",15);assertTrue(((List<?>)wb.analyze(r).get("events")).isEmpty());}
    @Test void outOfCoverageAndInvalidNumbersRejected(){var r=request();r.put("heightMin",80);assertThrows(IllegalArgumentException.class,()->wb.analyze(r));r.put("heightMin",127);r.put("threshold",Double.NaN);assertThrows(IllegalArgumentException.class,()->wb.analyze(r));}
    @Test void absentDateRejected(){var r=request();r.put("start","2026-08-01 00:00:00");assertThrows(IllegalArgumentException.class,()->wb.analyze(r));}
    @Test void allMissingIsInsufficientNotNormal() throws Exception {
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,999,999,NaN,999\n");
        WorkbenchService blank=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());var result=blank.analyze(request());assertNull(object(result.get("summary")).get("mean"));assertEquals("insufficient-data",object(result.get("quality")).get("status"));
    }
    @Test void workflowRunsBranchedDataflowAndPinsVersions(){Map<String,Object>w=wb.defaultWorkflow();object(((List<?>)w.get("nodes")).get(1)).put("params",map("heightMin",127,"heightMax",142));var result=wb.runWorkflow(w);assertEquals("succeeded",result.get("status"));assertEquals(6,((List<?>)result.get("nodes")).size());assertTrue(result.containsKey("componentSnapshots"));}
    @Test void workflowRejectsIncompatibleAndMissingPorts(){var w=map("nodes",List.of(map("id","a","component","reader","version","1.0.0"),map("id","b","component","events","version","1.0.0")),"edges",List.of(map("from","a","to","b")));assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(w));}
    @Test void workflowRejectsCycle(){var w=map("nodes",List.of(map("id","a","component","statistics","version","1.0.0"),map("id","b","component","events","version","1.0.0")),"edges",List.of(map("from","a","to","b"),map("from","b","to","a")));assertThrows(IllegalArgumentException.class,()->wb.validateWorkflow(w));}
    @Test void pluginHotLoadVersionAndDisable() throws Exception {
        String manifest="{\"id\":\"test-ratio\",\"version\":\"%s\",\"apiVersion\":\"1\",\"name\":\"ratio\",\"description\":\"fixture\",\"inputType\":\"analysis\",\"outputType\":\"analysis\",\"expression\":\"exceedCount / validCount %s\"}";
        assertThrows(IllegalArgumentException.class,()->wb.plugins().resolve("test-ratio","1.0.0"));
        Files.writeString(root.resolve("plugins/v1.json"),manifest.formatted("1.0.0",""));Files.writeString(root.resolve("plugins/v2.json"),manifest.formatted("2.0.0","* 100"));wb.plugins().reload();
        assertEquals(.4,PluginRegistry.evaluate(wb.plugins().resolve("test-ratio","1.0.0").get("expression").toString(),map("exceedCount",2,"validCount",5)),1e-9);
        assertEquals(40,PluginRegistry.evaluate(wb.plugins().resolve("test-ratio","2.0.0").get("expression").toString(),map("exceedCount",2,"validCount",5)),1e-9);
        wb.plugins().state(map("id","test-ratio","version","2.0.0","enabled",false),wb.projects().current());assertThrows(IllegalArgumentException.class,()->wb.plugins().resolve("test-ratio","2.0.0"));assertNotNull(wb.plugins().resolve("test-ratio","1.0.0"));
    }
    @Test void pluginRejectsArbitraryEvaluation(){assertThrows(IllegalArgumentException.class,()->PluginRegistry.evaluate("Runtime.exec(1)",map()));assertThrows(IllegalArgumentException.class,()->PluginRegistry.evaluate("validCount / 0",map("validCount",2)));}
    @Test void twoSessionsConflictViewerAndRollback(){ProjectStore s=wb.projects();String a=s.session(map("name","A","role","editor")).get("token").toString();String invite=s.invite(a,map("role","editor")).get("invite").toString();String b=s.session(map("name","B","role","editor","invite",invite)).get("token").toString();String v=s.session(map("name","V","role","viewer")).get("token").toString();var w=wb.defaultWorkflow();s.update(a,map("revision",1,"workflow",w,"title","second"));assertEquals(2,((Number)s.get(b).get("revision")).intValue());WbException conflict=assertThrows(WbException.class,()->s.update(b,map("revision",1,"workflow",w)));assertEquals(409,conflict.code());assertThrows(WbException.class,()->s.update(v,map("revision",2,"workflow",w)));assertFalse(((List<?>)s.diff(a,1,2).get("changes")).isEmpty());var restored=s.rollback(a,map("revision",2,"targetRevision",1));assertEquals(3,restored.get("revision"));assertEquals("Observation wind analysis",restored.get("title"));}
    @Test void sessionsRequireInviteForSecondEditor(){var s=wb.projects();s.session(map("name","A","role","editor"));assertThrows(IllegalArgumentException.class,()->s.session(map("name","B","role","editor")));assertThrows(WbException.class,()->s.get("unknown"));}
}
