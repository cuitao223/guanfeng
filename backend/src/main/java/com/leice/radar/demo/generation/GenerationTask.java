package com.leice.radar.demo.generation;

import java.io.IOException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;

/** All record access, including snapshots for HTTP responses, holds the same monitor. */
final class GenerationTask {
    final Path dir;
    private final ObjectMapper mapper;
    private final Map<String,Object> data;
    GenerationTask(Path dir, ObjectMapper mapper, Map<String,Object> data) {this.dir=dir;this.mapper=mapper;this.data=new LinkedHashMap<>(data);}
    synchronized Map<String,Object> snapshot() {return mapper.convertValue(data,new TypeReference<>(){});}
    synchronized Object get(String key) {return data.get(key);}
    synchronized void put(String key,Object value) {data.put(key,value);save();}
    @SuppressWarnings("unchecked") synchronized void append(String key,Object value) {((List<Object>)data.computeIfAbsent(key,k->new ArrayList<>())).add(value);save();}
    @SuppressWarnings("unchecked") synchronized void finishStage(String id, Map<String,Object> value) { List<Map<String,Object>> stages=(List<Map<String,Object>>)data.get("stages"); for(int i=0;i<stages.size();i++) if(id.equals(stages.get(i).get("id"))) {stages.set(i,new LinkedHashMap<>(value));save();return;} }
    synchronized void state(String status) {data.put("status",status);data.put("updatedAt",Instant.now().toString());save();}
    synchronized void save() {
        try {
            Files.createDirectories(dir);
            Path temp=dir.resolve("task.json.tmp");
            mapper.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(),data);
            Path target=dir.resolve("task.json");
            IOException last=null;
            for(int attempt=0;attempt<6;attempt++) {
                try { Files.move(temp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); last=null; break; }
                catch(IOException e) { last=e; try { Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING); last=null; break; } catch(IOException retry) { last=retry; try { Thread.sleep(30L*(attempt+1)); } catch(InterruptedException interrupted) { Thread.currentThread().interrupt(); throw retry; } } }
            }
            if(last!=null) throw last;
        }catch(Exception e){throw new IllegalStateException("Task persistence failed",e);}
    }
}
