package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

class WorkflowRunServiceTest {
    @TempDir Path root;
    WorkbenchService real;
    WorkflowRunService jobs;
    @BeforeEach void setup()throws Exception{
        Files.createDirectories(root.resolve("frontend"));Files.createDirectories(root.resolve("data/radar"));
        // Synthetic hand-computable fixture; production execution and parsing are retained.
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,5,180,12,190\n20260901 00:10:00,20,50,1000,9,180,14,190\n");
        System.setProperty("guanfeng.root",root.toString());real=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());
    }
    @AfterEach void cleanup(){if(jobs!=null)jobs.close();System.clearProperty("guanfeng.root");}
    Map<String,Object> workflow(){var workflow=real.defaultWorkflow();object(((List<?>)workflow.get("nodes")).get(1)).put("params",map("heightMin",127,"heightMax",142));return workflow;}
    Map<String,Object> terminal(String id)throws Exception{
        long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
        while(System.nanoTime()<end){var state=jobs.get(id);if(Set.of("succeeded","failed").contains(state.get("status")))return state;Thread.sleep(5);}
        fail("Workflow did not finish");return null;
    }
    @Test void pollingObservesActualRunningNodeThenSuccessfulRealResultAndDetachedHistory()throws Exception{
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var wb=spy(real);
        doAnswer(call->{entered.countDown();if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Test release timed out");return call.callRealMethod();}).when(wb).analyze(anyMap());
        jobs=new WorkflowRunService(new WorkflowEngine(wb,real.plugins()),1,2,4);
        String id=jobs.submit(workflow()).get("id").toString();
        try{
            assertTrue(entered.await(5,TimeUnit.SECONDS));var running=jobs.get(id);assertEquals("running",running.get("status"));
            var nodes=(List<?>)running.get("nodes");assertEquals("succeeded",object(nodes.get(0)).get("status"));assertEquals("running",object(nodes.get(1)).get("status"));
            var persisted=new ObjectMapper().readValue(root.resolve("runtime/workflows/"+id+".json").toFile(),Map.class);
            assertEquals("running",object(((List<?>)persisted.get("nodes")).get(1)).get("status"));
            assertTrue(((List<?>)running.get("transitions")).stream().map(Values::object).anyMatch(t->"quality".equals(t.get("nodeId"))&&"running".equals(t.get("status"))));
            var mvc=MockMvcBuilders.standaloneSetup(new WorkbenchController(wb,jobs)).setControllerAdvice(new WorkbenchErrors()).build();
            mvc.perform(get("/api/wb/workflow/jobs/"+id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200)).andExpect(jsonPath("$.data.status").value("running"))
                .andExpect(jsonPath("$.data.nodes[1].id").value("quality")).andExpect(jsonPath("$.data.nodes[1].status").value("running"));
            running.put("status","forged");object(nodes.get(1)).put("status","forged");assertEquals("running",jobs.get(id).get("status"));
        }finally{release.countDown();}
        var done=terminal(id);assertEquals("succeeded",done.get("status"));assertEquals(id,done.get("id"));
        assertEquals(10d,((Number)object(object(done.get("result")).get("summary")).get("mean")).doubleValue());
        var files=(List<?>)object(done.get("result")).get("exports");assertEquals(2,files.size());
        for(Object raw:files){var file=object(raw);assertTrue(file.get("url").toString().contains("/"+id+"/"));assertEquals(((Number)file.get("bytes")).intValue(),WorkflowEngine.readExport(root,id,file.get("name").toString()).length);}
        var transitions=(List<?>)done.get("transitions");
        for(String node:List.of("reader","quality","statistics","events","chart","export")){
            var states=transitions.stream().map(Values::object).filter(t->node.equals(t.get("nodeId"))).map(t->t.get("status")).toList();assertEquals(List.of("running","succeeded"),states,node);
        }
        assertNotNull(done.get("finishedAt"));assertTrue(((Number)done.get("revision")).longValue()>2);
    }
    @Test void queueIsBoundedAndQueuedWorkflowIsAnImmutableSubmission()throws Exception{
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var wb=spy(real);
        doAnswer(call->{entered.countDown();if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Test release timed out");return call.callRealMethod();}).when(wb).analyze(anyMap());
        jobs=new WorkflowRunService(new WorkflowEngine(wb,real.plugins()),1,1,3);
        String first=jobs.submit(workflow()).get("id").toString();assertTrue(entered.await(5,TimeUnit.SECONDS));
        String second;
        try{
            var mutable=workflow();second=jobs.submit(mutable).get("id").toString();assertEquals("queued",jobs.get(second).get("status"));assertFalse(jobs.get(second).containsKey("startedAt"));
            object(((List<?>)mutable.get("nodes")).get(1)).put("params",map("heightMin",80));
            WbException full=assertThrows(WbException.class,()->jobs.submit(workflow()));assertEquals(429,full.code());
            verify(wb,times(1)).analyze(anyMap());
        }finally{release.countDown();}
        assertEquals("succeeded",terminal(first).get("status"));assertEquals("succeeded",terminal(second).get("status"));
    }
    @Test void realExecutionFailurePublishesFailedNodeAndDoesNotInventDownstreamSuccess()throws Exception{
        jobs=new WorkflowRunService(new WorkflowEngine(real,real.plugins()),1,1,3);var workflow=workflow();object(((List<?>)workflow.get("nodes")).get(1)).put("params",map("heightMin",80,"heightMax",142));
        String id=jobs.submit(workflow).get("id").toString();var done=terminal(id);assertEquals("failed",done.get("status"));assertNotNull(done.get("error"));
        var nodes=(List<?>)done.get("nodes");assertEquals(2,nodes.size());assertEquals("failed",object(nodes.get(1)).get("status"));
        assertFalse(((List<?>)done.get("transitions")).stream().map(Values::object).anyMatch(t->"chart".equals(t.get("nodeId"))));
    }
    @Test void invalidAndUnknownJobsAreRejectedAndFinishedRetentionIsBounded()throws Exception{
        jobs=new WorkflowRunService(new WorkflowEngine(real,real.plugins()),1,1,2);
        assertThrows(IllegalArgumentException.class,()->jobs.submit(map("nodes",List.of())));assertThrows(IllegalArgumentException.class,()->jobs.get("unknown"));
        String first=jobs.submit(workflow()).get("id").toString();assertEquals("succeeded",terminal(first).get("status"));
        String second=jobs.submit(workflow()).get("id").toString();assertEquals("succeeded",terminal(second).get("status"));
        String third=jobs.submit(workflow()).get("id").toString();assertEquals("succeeded",terminal(third).get("status"));
        assertThrows(IllegalArgumentException.class,()->jobs.get(first));assertEquals("succeeded",jobs.get(second).get("status"));
    }
    @Test void shutdownFailsActualActiveAndQueuedJobsWithoutClaimingCompletion()throws Exception{
        var entered=new CountDownLatch(1);var wb=spy(real);
        doAnswer(call->{entered.countDown();new CountDownLatch(1).await(10,TimeUnit.SECONDS);return call.callRealMethod();}).when(wb).analyze(anyMap());
        jobs=new WorkflowRunService(new WorkflowEngine(wb,real.plugins()),1,1,3);
        String first=jobs.submit(workflow()).get("id").toString();assertTrue(entered.await(5,TimeUnit.SECONDS));String second=jobs.submit(workflow()).get("id").toString();
        jobs.close();assertEquals("failed",jobs.get(first).get("status"));assertEquals("failed",jobs.get(second).get("status"));
        assertThrows(WbException.class,()->jobs.submit(workflow()));
    }
}
