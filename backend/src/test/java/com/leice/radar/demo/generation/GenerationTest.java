package com.leice.radar.demo.generation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.demo.workbench.WorkbenchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GenerationTest {
    @TempDir Path temp;
    ObjectMapper mapper=new ObjectMapper();
    @Test void concurrentTaskRecordsAreAtomicAndSnapshotsAreIsolated()throws Exception{
        GenerationTask task=new GenerationTask(temp.resolve("task"),mapper,new LinkedHashMap<>(Map.of("status","running","calls",new ArrayList<>())));
        ExecutorService pool=Executors.newFixedThreadPool(8);
        List<Future<?>> futures=new ArrayList<>();
        for(int i=0;i<80;i++){int index=i;futures.add(pool.submit(()->task.append("calls",Map.of("index",index))));}
        for(Future<?> f:futures)f.get();pool.shutdown();
        assertEquals(80,((List<?>)task.snapshot().get("calls")).size());
        ((List<?>)task.snapshot().get("calls")).clear();
        assertEquals(80,mapper.readTree(task.dir.resolve("task.json").toFile()).path("calls").size());
        assertEquals(80,((List<?>)task.snapshot().get("calls")).size());
    }
    @Test void childEnvironmentDoesNotInheritAnyModelVariablesOrNodeOptions(){
        ProcessBuilder builder=new ProcessBuilder("node");builder.environment().put("GUANFENG_KEY_FILE","secret-path");builder.environment().put("OPENAI_API_KEY","secret");builder.environment().put("NODE_OPTIONS","--require dangerous");
        GenerationService.cleanEnvironment(builder);
        assertFalse(builder.environment().containsKey("GUANFENG_KEY_FILE"));assertFalse(builder.environment().containsKey("OPENAI_API_KEY"));assertFalse(builder.environment().containsKey("NODE_OPTIONS"));assertEquals("1",builder.environment().get("NO_COLOR"));
    }
    @Test void restartMarksRunningTaskInterruptedAndDeploymentLost()throws Exception{
        String id=UUID.randomUUID().toString();Path directory=temp.resolve("runtime/generation/"+id);Files.createDirectories(directory);
        mapper.writeValue(directory.resolve("task.json").toFile(),Map.of("id",id,"status","running","deployment",Map.of("status","running","port",1234)));
        WorkbenchService workbench=mock(WorkbenchService.class);when(workbench.root()).thenReturn(temp);
        try(Closing service=new Closing(new GenerationService(workbench,mapper,18080))){
            Map<String,Object> result=service.value.get(id);assertEquals("interrupted",result.get("status"));assertEquals("lost",GenerationService.map(result.get("deployment")).get("status"));
            assertThrows(IllegalArgumentException.class,()->service.value.deploy(id));
            assertThrows(IllegalArgumentException.class,()->service.value.get("../outside"));
        }
    }
    @Test void terminalSourceExportIsRealZipAndExcludesRuntimeLogs()throws Exception{
        String id=UUID.randomUUID().toString();Path directory=temp.resolve("runtime/generation/"+id);Files.createDirectories(directory.resolve("src"));
        mapper.writeValue(directory.resolve("task.json").toFile(),Map.of("id",id,"status","ready","deployment",Map.of("status","stopped")));
        Files.writeString(directory.resolve("src/App.vue"),"<template>test fixture</template>");Files.writeString(directory.resolve("runtime-error.log"),"not for export");
        WorkbenchService workbench=mock(WorkbenchService.class);when(workbench.root()).thenReturn(temp);
        try(Closing service=new Closing(new GenerationService(workbench,mapper,18080));ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(service.value.export(id)))){
            List<String> entries=new ArrayList<>();for(ZipEntry entry;(entry=zip.getNextEntry())!=null;)entries.add(entry.getName());
            assertTrue(entries.contains("src/App.vue"));assertTrue(entries.contains("task.json"));assertFalse(entries.contains("runtime-error.log"));
        }
    }
    @Test void corruptPersistedTaskIsListedAsFailedInsteadOfDisappearing()throws Exception{
        String id=UUID.randomUUID().toString();Path dir=temp.resolve("runtime/generation/"+id);Files.createDirectories(dir);Files.writeString(dir.resolve("task.json"),"{bad");
        WorkbenchService workbench=mock(WorkbenchService.class);when(workbench.root()).thenReturn(temp);
        try(Closing service=new Closing(new GenerationService(workbench,mapper,18080))){assertEquals("failed",service.value.get(id).get("status"));assertEquals(1,service.value.list().size());}
    }
    @Test void stagesKeepActualStartTimeAndFinishOneRecord()throws Exception{
        GenerationTask task=new GenerationTask(temp,mapper,new LinkedHashMap<>(Map.of("stages",new ArrayList<>())));
        task.append("stages",Map.of("id","role","status","running","startedAt","original"));task.finishStage("role",Map.of("id","role","status","succeeded","startedAt","original","finishedAt","later"));
        var stages=mapper.readTree(task.dir.resolve("task.json").toFile()).get("stages");assertEquals(1,stages.size());assertEquals("succeeded",stages.get(0).get("status").asText());assertEquals("original",stages.get(0).get("startedAt").asText());
    }
    private record Closing(GenerationService value)implements AutoCloseable{public void close(){value.close();}}
}
