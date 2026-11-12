package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static com.leice.radar.demo.workbench.Values.*;

@Service
public final class WorkflowRunService {
    private static final ObjectMapper JSON=new ObjectMapper();
    private final WorkflowEngine engine;
    private final ThreadPoolExecutor executor;
    private final Map<String,Job> jobs=new LinkedHashMap<>();
    private final int retainedJobs;

    @Autowired
    public WorkflowRunService(WorkbenchService workbench){this(new WorkflowEngine(workbench,workbench.plugins()),2,8,64);}

    WorkflowRunService(WorkflowEngine engine,int workers,int queueCapacity,int retainedJobs){
        if(workers<1||queueCapacity<1||retainedJobs<workers+queueCapacity)throw new IllegalArgumentException("Invalid workflow queue limits");
        this.engine=engine;this.retainedJobs=retainedJobs;
        AtomicInteger sequence=new AtomicInteger();
        executor=new ThreadPoolExecutor(workers,workers,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(queueCapacity),task->{
            Thread thread=new Thread(task,"workflow-run-"+sequence.incrementAndGet());thread.setDaemon(true);return thread;
        },new ThreadPoolExecutor.AbortPolicy());
    }

    public synchronized Map<String,Object> submit(Map<String,Object> workflow){
        Map<String,Object> input=copy(workflow);
        engine.validate(input);
        if(executor.isShutdown())throw new WbException(429,"Workflow queue is shutting down");
        // Retain a bounded number of snapshots; active jobs are never evicted.
        if(jobs.size()>=retainedJobs){
            var iterator=jobs.entrySet().iterator();
            while(iterator.hasNext()&&jobs.size()>=retainedJobs){if(iterator.next().getValue().terminal())iterator.remove();}
        }
        if(jobs.size()>=retainedJobs)throw new WbException(429,"Workflow queue is full; retry after active jobs finish");
        String id=UUID.randomUUID().toString();Job job=new Job(id,input);jobs.put(id,job);
        // Capture the accepted queued state before scheduling. Fast jobs may finish before the HTTP response.
        Map<String,Object> accepted=job.snapshot();
        try{executor.execute(()->execute(job,input));}
        catch(RejectedExecutionException rejected){jobs.remove(id);throw new WbException(429,"Workflow queue is full; retry after active jobs finish");}
        return accepted;
    }

    public Map<String,Object> get(String id){
        Job job;
        synchronized(this){job=jobs.get(id);}
        if(job==null)throw new IllegalArgumentException("Workflow job does not exist or is no longer retained");
        return job.snapshot();
    }

    private void execute(Job job,Map<String,Object> workflow){
        try{engine.run(workflow,job.id,job::update);}
        catch(Exception error){job.fail(error.getMessage()==null?"Workflow execution failed":error.getMessage());}
    }

    @PreDestroy public void close(){
        executor.shutdownNow();
        synchronized(this){for(Job job:jobs.values())if(!job.terminal())job.fail("Workflow service stopped before execution completed");}
    }

    private static Map<String,Object> copy(Map<String,Object> value){return JSON.convertValue(value,new TypeReference<Map<String,Object>>(){});}

    private static final class Job {
        private final String id;
        private final String submittedAt=Instant.now().toString();
        private final List<Map<String,Object>> transitions=new ArrayList<>();
        private final Map<String,String> nodeStates=new HashMap<>();
        private Map<String,Object> state;
        private long revision;
        Job(String id,Map<String,Object> workflow){
            this.id=id;state=map("id",id,"status","queued","submittedAt",submittedAt,"nodes",List.of(),"workflow",workflow);
            transition(null,"queued",submittedAt);revision=1;
        }
        synchronized boolean terminal(){return Set.of("succeeded","failed").contains(state.get("status"));}
        synchronized void update(Map<String,Object> snapshot){
            if(terminal())return;
            Map<String,Object> next=copy(snapshot);String status=String.valueOf(next.get("status"));
            if(!Objects.equals(state.get("status"),status))transition(null,status,String.valueOf(next.getOrDefault("finishedAt",next.getOrDefault("startedAt",Instant.now().toString()))));
            for(Object item:(List<?>)next.getOrDefault("nodes",List.of())){
                Map<String,Object> node=object(item);String nodeId=String.valueOf(node.get("id")),nodeStatus=String.valueOf(node.get("status"));
                if(!Objects.equals(nodeStates.put(nodeId,nodeStatus),nodeStatus))transition(nodeId,nodeStatus,String.valueOf(node.getOrDefault("finishedAt",node.get("startedAt"))));
                if("failed".equals(nodeStatus))next.put("error",node.getOrDefault("error","Workflow node failed"));
            }
            next.put("submittedAt",submittedAt);state=next;revision++;
        }
        synchronized void fail(String message){
            if(terminal())return;
            state=copy(state);String now=Instant.now().toString();
            for(Object item:(List<?>)state.getOrDefault("nodes",List.of())){
                Map<String,Object> node=object(item);
                if("running".equals(node.get("status"))){node.put("status","failed");node.put("finishedAt",now);node.put("error",message);transition(String.valueOf(node.get("id")),"failed",now);}
            }
            state.put("status","failed");state.put("error",message);state.put("finishedAt",now);transition(null,"failed",now);revision++;
        }
        private void transition(String nodeId,String status,String at){
            Map<String,Object> event=map("sequence",transitions.size()+1,"status",status,"at",at);
            if(nodeId!=null)event.put("nodeId",nodeId);
            transitions.add(event);
        }
        synchronized Map<String,Object> snapshot(){
            Map<String,Object> result=copy(state);result.put("revision",revision);
            result.put("transitions",JSON.convertValue(transitions,new TypeReference<List<Map<String,Object>>>(){}));return result;
        }
    }
}
