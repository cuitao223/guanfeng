package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.*;

class WorkflowArtifactsTest {
    @TempDir Path root;
    private String runId(){return UUID.randomUUID().toString();}
    private String content(Map<String,Object> file,String run)throws Exception{return new String(WorkflowEngine.readExport(root,run,file.get("name").toString()),StandardCharsets.UTF_8);}
    private void verifyFile(Map<String,Object> file,String run)throws Exception{
        Path path=root.resolve("runtime/exports").resolve(run).resolve(file.get("name").toString());
        assertTrue(Files.isRegularFile(path));byte[] bytes=Files.readAllBytes(path);
        assertEquals(bytes.length,((Number)file.get("bytes")).intValue());
        assertEquals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),file.get("sha256"));
        assertEquals("/api/wb/workflow/exports/"+run+"/"+file.get("name"),file.get("url"));
        assertArrayEquals(bytes,WorkflowEngine.readExport(root,run,file.get("name").toString()));
    }
    @Test void profileWorkflowProducesChartAndRealExports()throws Exception{
        Files.createDirectories(root.resolve("frontend"));Files.createDirectories(root.resolve("data/radar"));
        // Explicit synthetic fixture; verifies files, not competition observation evidence.
        Files.writeString(root.resolve("data/radar/fixture_DBS.csv"),"Date_time,Temperature,Humidity,Pressure,127m WindSpeed,127m WindDirection,142m WindSpeed,142m WindDirection\n20260901 00:00:00,20,50,1000,5,180,12,190\n20260901 00:10:00,20,50,1000,999,180,14,190\n20260901 00:20:00,20,50,1000,7,180,8,190\n");
        String previous=System.getProperty("guanfeng.root");System.setProperty("guanfeng.root",root.toString());
        try{
            WorkbenchService wb=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());var workflow=wb.defaultWorkflow();
            for(Object raw:(List<?>)workflow.get("nodes")){var node=object(raw);if(node.get("id").equals("quality"))node.put("params",map("heightMin",127,"heightMax",142));}
            var run=wb.runWorkflow(workflow);assertEquals("succeeded",run.get("status"));String id=run.get("id").toString();
            var chart=object(run.get("chart"));assertEquals("profile",chart.get("kind"));var data=object(chart.get("data"));
            assertEquals(List.of(127d,142d),data.get("heightArr"));assertEquals(9.2,object(data.get("summary")).get("mean"));
            List<?> files=(List<?>)run.get("exports");assertEquals(2,files.size());
            for(Object raw:files){var file=object(raw);verifyFile(file,id);String text=content(file,id);
                if(file.get("format").equals("csv")){
                    assertTrue(text.startsWith("time,height,speed,direction\r\n"));assertEquals(7,text.lines().count());
                    assertTrue(text.contains("2026-09-01 00:00:00,127.0,5.0,180.0"));
                    assertTrue(text.contains("2026-09-01 00:10:00,127.0,999.0,999.0"));
                }else{assertTrue(text.contains("provenance"));assertTrue(text.contains("fixture_DBS.csv"));assertTrue(text.contains("heightMin"));}
            }
            var controller=new WorkbenchController(wb);var response=controller.workflowExport(id,"export.csv");
            assertEquals(200,response.getStatusCode().value());assertEquals("nosniff",response.getHeaders().getFirst("X-Content-Type-Options"));
            assertArrayEquals(Files.readAllBytes(root.resolve("runtime/exports/"+id+"/export.csv")),response.getBody());
            assertEquals(2,((List<?>)object(run.get("result")).get("exports")).size());
            assertTrue(object(run.get("result")).containsKey("chart"));
            var sinks=object(run.get("outputs"));assertEquals(Set.of("chart","export"),sinks.keySet());
            assertEquals(chart,object(sinks.get("chart")).get("chart"));
            assertEquals(files,object(sinks.get("export")).get("exports"));
            assertFalse(object(sinks.get("export")).containsKey("chart"));
            assertFalse(object(sinks.get("chart")).containsKey("exports"));
        }finally{if(previous==null)System.clearProperty("guanfeng.root");else System.setProperty("guanfeng.root",previous);}
    }
    @Test void gridAndScanUseProcessedCellsAndCoordinates()throws Exception{
        // Explicit processed-grid/scan fixtures test serialization without external adapters.
        Map<String,Object> grid=map("datasetId","grid-fixture","grid",map("x",List.of(10d,20d),"y",List.of(50d,60d),"values",List.of(List.of(0d,999d),List.of(3d,4d)),"unit","K"),"provenance",map("source","<script>unsafe & \"quoted\"</script>"));
        assertEquals("grid",WorkflowEngine.chart(grid,map("mode","grid")).get("kind"));String id=runId();
        var files=WorkflowEngine.export(root,id,"grid",grid,map());for(var f:files)verifyFile(f,id);
        assertEquals("x,y,value\r\n10.0,50.0,0.0\r\n20.0,50.0,999.0\r\n10.0,60.0,3.0\r\n20.0,60.0,4.0\r\n",content(files.get(0),id));
        String html=content(files.get(1),id);assertFalse(html.contains("<script>"));assertTrue(html.contains("&lt;script&gt;"));assertTrue(html.contains("&amp;"));assertTrue(html.contains("&quot;"));
        Map<String,Object> scan=map("angles",List.of(0d,90d),"heightArr",List.of(100d,200d),"values",List.of(List.of(-2d,0d),List.of(999d,4d)),"unit","m/s","provenance",map("measurement","line-of-sight radial wind"));
        var chart=WorkflowEngine.chart(scan,map());assertEquals("scan",chart.get("kind"));assertEquals(scan,chart.get("data"));
        String scanId=runId();var scanFiles=WorkflowEngine.export(root,scanId,"scan",scan,map("format","csv"));assertEquals(1,scanFiles.size());verifyFile(scanFiles.get(0),scanId);
        assertEquals("angle,range,radialWind\r\n0.0,100.0,-2.0\r\n0.0,200.0,0.0\r\n90.0,100.0,999.0\r\n90.0,200.0,4.0\r\n",content(scanFiles.get(0),scanId));
    }
    @Test void chartRejectsWrongModeAndMalformedShapes(){
        var grid=map("grid",map("x",List.of(1d),"y",List.of(2d),"values",List.of(List.of(3d))));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.chart(grid,map("mode","scan")));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.chart(grid,map("mode","unknown")));
        object(grid.get("grid")).put("values",List.of(List.of(3d,4d)));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.chart(grid,map()));
        object(grid.get("grid")).put("values",List.of(List.of(Double.NaN)));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.chart(grid,map()));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.export(root,runId(),"bad",grid,map("format","pdf")));
    }
    @Test void downloadRejectsTraversalAndLinks()throws Exception{
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.readExport(root,"..","secret.csv"));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.readExport(root,runId(),"../secret.csv"));
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.readExport(root,runId(),"key.txt"));
        String id=runId();Files.createDirectories(root.resolve("runtime/exports/"+id));Files.writeString(root.resolve("outside.csv"),"private fixture");
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.readExport(root,id,"absent.csv"));
        try{Files.createSymbolicLink(root.resolve("runtime/exports/"+id+"/leak.csv"),root.resolve("outside.csv"));}
        catch(UnsupportedOperationException|java.io.IOException|SecurityException e){assumeTrue(false,"Host does not allow test symbolic links");}
        assertThrows(IllegalArgumentException.class,()->WorkflowEngine.readExport(root,id,"leak.csv"));
    }
}
