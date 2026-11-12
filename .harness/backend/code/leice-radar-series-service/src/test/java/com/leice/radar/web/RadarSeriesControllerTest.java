package com.leice.radar.web;

import com.leice.radar.config.RadarProperties;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RadarSeriesControllerTest {

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        RadarProperties properties = new RadarProperties();
        properties.setDataDir("samples");
        RadarMessages messages = new RadarMessages();
        RadarSeriesController controller = new RadarSeriesController(
                new RadarSeriesService(), new RadarFileResolver(properties), messages);
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new RadarExceptionHandler(messages))
                .build();
    }

    @Test
    void returnsWindProfileEnvelope() throws Exception {
        mvc.perform(get("/radar/series/dbs/wind-profile").param("file", "dbs-sample.csv"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.msg").value("OK"))
                .andExpect(jsonPath("$.data.heightArr[0]").value(100.0))
                .andExpect(jsonPath("$.data.values[0][0]").value(5.2));
    }

    @Test
    void localizesMissingFileMessage() throws Exception {
        mvc.perform(get("/radar/series/dbs/snr")
                        .param("file", "no-such-file.csv")
                        .header("X-Lang", "Cn"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value("测量文件不存在：no-such-file.csv"));
    }

    @Test
    void rejectsPathOutsideDataDirectory() throws Exception {
        mvc.perform(get("/radar/series/dbs/snr").param("file", "../pom.xml"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value("The requested file is outside the configured data directory"));
    }
}
