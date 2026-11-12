package com.leice.radar.demo.generation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.demo.workbench.WorkbenchService;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class GenerationParsingTest {
    @TempDir Path root;
    @Test void providerJsonEnvelopeAndFencesAreDecodedWithoutChangingSource() throws Exception {
        WorkbenchService workbench=mock(WorkbenchService.class);
        when(workbench.root()).thenReturn(root);
        GenerationService service=new GenerationService(workbench,new ObjectMapper(),18080);
        try {
            var direct=service.parse("{\"app\":\"complete source\"}");
            var wrapped=service.parse("```json\n{\"type\":\"json_object\",\"content\":{\"app\":\"complete source\"}}\n```");
            assertEquals(direct,wrapped);
            assertThrows(IllegalArgumentException.class,()->service.parse("[]"));
        } finally {service.close();}
    }
}
