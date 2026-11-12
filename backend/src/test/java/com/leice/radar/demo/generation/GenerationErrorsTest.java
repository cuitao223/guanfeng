package com.leice.radar.demo.generation;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class GenerationErrorsTest {
    @Test void missingTaskUsesApiEnvelopeAndLanguageHeader() throws Exception {
        GenerationService service=mock(GenerationService.class);
        when(service.get("missing")).thenThrow(new IllegalArgumentException("Generation task does not exist"));
        var mvc=MockMvcBuilders.standaloneSetup(new GenerationController(service)).setControllerAdvice(new GenerationErrors()).build();
        mvc.perform(get("/api/wb/generation/missing").header("X-Lang","En"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(400)).andExpect(jsonPath("$.data").isMap());
        mvc.perform(get("/api/wb/generation/missing").header("X-Lang","Cn"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(400));
    }
}
