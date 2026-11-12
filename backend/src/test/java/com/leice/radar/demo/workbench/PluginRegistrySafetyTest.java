package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;

class PluginRegistrySafetyTest {
    @TempDir Path root;
    private final ObjectMapper json=new ObjectMapper();
    private Path manifest()throws Exception{
        Files.createDirectories(root.resolve("plugins"));Files.createDirectories(root.resolve("runtime"));
        Path p=root.resolve("plugins/ratio.json");
        json.writeValue(p.toFile(),map("id","ratio","version","1.0.0","apiVersion","1","inputType","analysis","outputType","analysis","expression","exceedCount / validCount","unit","fraction","inputUnit","m/s"));
        return p;
    }
    private void saveReference(boolean referenced)throws Exception{
        json.writeValue(root.resolve("runtime/project.json").toFile(),map("workflow",map("nodes",referenced?List.of(map("id","ratio","component","ratio","version","1.0.0","params",map())):List.of())));
    }
    @Test void removingReferencedManifestRetainsRegistryAndRestoringAllowsReload()throws Exception{
        Path p=manifest();PluginRegistry registry=new PluginRegistry(root,json);saveReference(true);
        Path hidden=p.resolveSibling("ratio.saved");Files.move(p,hidden);
        var error=assertThrows(IllegalArgumentException.class,registry::reload);
        assertTrue(error.getMessage().contains("previous registry retained"));assertEquals("ratio",registry.resolve("ratio","1.0.0").get("id"));
        Files.move(hidden,p);assertTrue(((List<?>)registry.reload().get("rejected")).isEmpty());
        saveReference(false);Files.move(p,hidden);registry.reload();assertThrows(IllegalArgumentException.class,()->registry.resolve("ratio","1.0.0"));
        Files.move(hidden,p);registry.reload();assertEquals("ratio",registry.resolve("ratio","1.0.0").get("id"));
    }
    @Test void invalidReferencedManifestDoesNotPartiallyReplaceRegistry()throws Exception{
        Path p=manifest();PluginRegistry registry=new PluginRegistry(root,json);saveReference(true);Files.writeString(p,"invalid json");
        assertThrows(IllegalArgumentException.class,registry::reload);assertNotNull(registry.resolve("reader","1.0.0"));assertNotNull(registry.resolve("ratio","1.0.0"));
    }
    @Test void missingReferenceAtStartupIsReportedWithoutPreventingRecovery()throws Exception{
        manifest();saveReference(true);Files.delete(root.resolve("plugins/ratio.json"));PluginRegistry registry=new PluginRegistry(root,json);
        var report=registry.reload();assertFalse(((List<?>)report.get("rejected")).isEmpty());assertNotNull(registry.resolve("reader","1.0.0"));
    }
    @Test void unitsAndInputShapeAreCheckedAndPluginMetadataIsComplete()throws Exception{
        manifest();PluginRegistry registry=new PluginRegistry(root,json);var ratio=registry.resolve("ratio","1.0.0");
        for(String key:List.of("tags","example","testReference","parameters","inputSchema","outputSchema","unit"))assertNotNull(ratio.get(key));
        var data=map("unit","m/s","summary",map("mean",4,"max",5,"validCount",4,"missingCount",0,"exceedCount",1));
        assertDoesNotThrow(()->PluginRegistry.validateInput(ratio,data));
        data.put("unit","knots");assertTrue(assertThrows(IllegalArgumentException.class,()->PluginRegistry.validateInput(ratio,data)).getMessage().contains("requires input unit"));
        data.put("unit","m/s");data.put("summary","bad shape");assertThrows(IllegalArgumentException.class,()->PluginRegistry.validateInput(ratio,data));
        var chart=registry.resolve("chart","1.0.0");
        assertThrows(IllegalArgumentException.class,()->PluginRegistry.validateInput(chart,map("times",List.of(),"unit","km/h")));
        assertThrows(IllegalArgumentException.class,()->PluginRegistry.validateInput(chart,map("grid",map("x",List.of(),"y",List.of(),"values",List.of(),"unit",""))));
        assertDoesNotThrow(()->PluginRegistry.validateInput(chart,map("grid",map("x",List.of(0),"y",List.of(0),"values",List.of(List.of(0)),"unit","K"))));
    }
}
