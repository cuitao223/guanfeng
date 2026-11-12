package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static com.leice.radar.demo.workbench.Values.*;

public final class ProjectStore {
    private final ObjectMapper json;
    private final Path file;
    private Map<String,Object> state;
    private final Map<String,Map<String,Object>> sessions=new ConcurrentHashMap<>();
    private final Map<String,String> invites=new ConcurrentHashMap<>();
    public ProjectStore(Path root,ObjectMapper json,Map<String,Object> workflow) throws Exception {
        this.json=json;file=root.resolve("runtime/project.json");
        if(Files.isRegularFile(file))state=json.readValue(file.toFile(),new TypeReference<>(){});
        else {state=map("id","demo","title","Observation wind analysis","revision",1,"workflow",workflow,"updatedBy","initial","history",new ArrayList<>(List.of(snapshot(1,"initial","Observation wind analysis",workflow)))) ;persist();}
    }
    public synchronized Map<String,Object> session(Map<String,Object> request){
        String name=text(request,"name","").trim(),role=text(request,"role","viewer");
        if(name.isBlank()||name.length()>60)throw new IllegalArgumentException("Editor name must have 1..60 characters");
        if(!List.of("editor","viewer").contains(role))throw new IllegalArgumentException("Unknown role");
        if(role.equals("editor")&&sessions.values().stream().anyMatch(x->"editor".equals(x.get("role")))){
            String invite=text(request,"invite","");if(!role.equals(invites.remove(invite)))throw new IllegalArgumentException("Another editor must provide an editor invite");
        }
        String token=UUID.randomUUID().toString();Map<String,Object> s=map("token",token,"name",name,"role",role);sessions.put(token,s);return s;
    }
    public synchronized Map<String,Object> leave(String token){
        require(token,false);sessions.remove(token);return map("left",true);
    }
    public Map<String,Object> require(String token,boolean edit){
        Map<String,Object> s=token==null?null:sessions.get(token);if(s==null)throw new WbException(400,"Session required");
        if(edit&&!"editor".equals(s.get("role")))throw new WbException(400,"Read-only session cannot edit");return s;
    }
    public Map<String,Object> invite(String token,Map<String,Object> body){require(token,true);String role=text(body,"role","editor");if(!List.of("editor","viewer").contains(role))throw new IllegalArgumentException("Unknown role");String id=UUID.randomUUID().toString();invites.put(id,role);return map("invite",id,"role",role);}
    public synchronized Map<String,Object> get(String token){require(token,false);return copy(state);}
    public synchronized Map<String,Object> current(){return copy(state);}
    public synchronized Map<String,Object> update(String token,Map<String,Object> request){
        Map<String,Object> actor=require(token,true);int expected=(int)number(request,"revision",-1),now=((Number)state.get("revision")).intValue();
        if(expected!=now)throw new WbException(409,"Revision conflict; reload the shared project before editing");
        Map<String,Object> workflow=object(request.get("workflow"));String title=text(request,"title",state.get("title").toString());
        state.put("revision",now+1);state.put("workflow",workflow);state.put("title",title);state.put("updatedBy",actor.get("name"));
        history().add(snapshot(now+1,actor.get("name").toString(),title,workflow));persist();return copy(state);
    }
    public synchronized Map<String,Object> rollback(String token,Map<String,Object> request){
        require(token,true);int target=(int)number(request,"targetRevision",-1);Map<String,Object> old=version(target);
        return update(token,map("revision",request.get("revision"),"workflow",old.get("workflow"),"title",old.get("title")));
    }
    public synchronized Map<String,Object> diff(String token,int from,int to){require(token,false);Map<String,Object>a=version(from),b=version(to);List<Map<String,Object>> changes=new ArrayList<>();for(String key:List.of("title","workflow"))if(!Objects.equals(a.get(key),b.get(key)))changes.add(map("field",key,"before",a.get(key),"after",b.get(key)));return map("from",from,"to",to,"changes",changes);}
    @SuppressWarnings("unchecked") private List<Map<String,Object>> history(){return (List<Map<String,Object>>)state.get("history");}
    private Map<String,Object> version(int n){return history().stream().filter(v->((Number)v.get("revision")).intValue()==n).findFirst().orElseThrow(()->new IllegalArgumentException("Unknown project revision"));}
    private Map<String,Object> snapshot(int revision,String author,String title,Map<String,Object> workflow){return map("revision",revision,"author",author,"time",Instant.now().toString(),"title",title,"workflow",copy(workflow));}
    private Map<String,Object> copy(Map<String,Object> input){return json.convertValue(input,new TypeReference<>(){});}
    private void persist(){try{Path temp=file.resolveSibling("project.tmp");json.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(),state);Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(Exception e){throw new IllegalStateException("Project persistence failed",e);}}
}
