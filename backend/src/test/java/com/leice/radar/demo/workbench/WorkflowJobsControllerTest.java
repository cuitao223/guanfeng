package com.leice.radar.demo.workbench;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static com.leice.radar.demo.workbench.Values.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class WorkflowJobsControllerTest {
    @Test void asynchronousRoutesUseStandardEnvelopeAndSynchronousRunStaysCompatible()throws Exception{
        var workbench=mock(WorkbenchService.class);var runs=mock(WorkflowRunService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new WorkbenchController(workbench,runs)).setControllerAdvice(new WorkbenchErrors()).build();
        when(runs.submit(anyMap())).thenReturn(map("id","job-id","status","queued","revision",1,"nodes",java.util.List.of()));
        mvc.perform(post("/api/wb/workflow/jobs").contentType("application/json").content("{\"nodes\":[]}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200)).andExpect(jsonPath("$.data.status").value("queued"));
        when(runs.get("job-id")).thenReturn(map("id","job-id","status","running","nodes",java.util.List.of(map("id","quality","status","running"))));
        mvc.perform(get("/api/wb/workflow/jobs/job-id")).andExpect(status().isOk()).andExpect(jsonPath("$.data.nodes[0].status").value("running"));
        when(workbench.runWorkflow(anyMap())).thenReturn(map("id","sync-id","status","succeeded"));
        mvc.perform(post("/api/wb/workflow/run").contentType("application/json").content("{}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value("sync-id"));
    }
    @Test void queueFullAndMissingJobReturnBusinessErrors()throws Exception{
        var workbench=mock(WorkbenchService.class);var runs=mock(WorkflowRunService.class);
        var mvc=MockMvcBuilders.standaloneSetup(new WorkbenchController(workbench,runs)).setControllerAdvice(new WorkbenchErrors()).build();
        when(runs.submit(anyMap())).thenThrow(new WbException(429,"Workflow queue is full"));
        mvc.perform(post("/api/wb/workflow/jobs").contentType("application/json").content("{}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(429));
        when(runs.get("missing")).thenThrow(new IllegalArgumentException("Workflow job does not exist"));
        mvc.perform(get("/api/wb/workflow/jobs/missing")).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(400));
    }
}
