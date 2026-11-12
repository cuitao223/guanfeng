package com.leice.radar.demo.workbench;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leice.radar.series.RadarSeriesService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.nio.file.*;
import static com.leice.radar.demo.workbench.Values.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SessionLifecycleTest {
    @TempDir Path root;
    WorkbenchService wb;
    ProjectStore store;
    String previous;
    @BeforeEach void setup()throws Exception{
        Files.createDirectories(root.resolve("frontend"));previous=System.getProperty("guanfeng.root");System.setProperty("guanfeng.root",root.toString());
        wb=new WorkbenchService(new ObjectMapper(),new RadarSeriesService());store=wb.projects();
    }
    @AfterEach void restore(){if(previous==null)System.clearProperty("guanfeng.root");else System.setProperty("guanfeng.root",previous);}
    String session(String name,String role){return store.session(map("name",name,"role",role)).get("token").toString();}
    String invitedEditor(String sponsor){String invite=store.invite(sponsor,map("role","editor")).get("invite").toString();return store.session(map("name","B","role","editor","invite",invite)).get("token").toString();}
    @Test void leavingLastEditorAllowsFreshEditorWithoutInvite(){
        String a=session("A","editor"),viewer=session("V","viewer");var original=store.current();
        assertEquals(true,store.leave(a).get("left"));assertThrows(WbException.class,()->store.require(a,false));
        assertDoesNotThrow(()->store.require(viewer,false));String fresh=session("new","editor");assertNotEquals(a,fresh);
        assertEquals(original,store.current());
    }
    @Test void leavingOneEditorDoesNotRemoveOtherEditorOrViewer(){
        String a=session("A","editor"),b=invitedEditor(a),viewer=session("V","viewer");
        store.leave(a);assertDoesNotThrow(()->store.require(b,true));assertDoesNotThrow(()->store.require(viewer,false));
        assertThrows(IllegalArgumentException.class,()->session("uninvited","editor"));
        store.leave(b);assertDoesNotThrow(()->session("fresh","editor"));
    }
    @Test void invalidOrRepeatedLeaveDoesNotTouchOtherSessions(){
        String editor=session("A","editor"),viewer=session("V","viewer");
        assertThrows(WbException.class,()->store.leave(null));assertThrows(WbException.class,()->store.leave("unknown"));
        store.leave(viewer);assertThrows(WbException.class,()->store.leave(viewer));assertDoesNotThrow(()->store.require(editor,true));
    }
    @Test void httpLeaveUsesOnlyHeaderAndConfirmsActualRevocation()throws Exception{
        String a=session("A","editor"),b=invitedEditor(a);
        var mvc=MockMvcBuilders.standaloneSetup(new WorkbenchController(wb)).setControllerAdvice(new WorkbenchErrors()).build();
        mvc.perform(post("/api/wb/session/leave").header("X-Session",a).contentType(MediaType.APPLICATION_JSON).content(new ObjectMapper().writeValueAsBytes(map("token",b))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(200)).andExpect(jsonPath("$.data.left").value(true));
        assertThrows(WbException.class,()->store.require(a,false));assertDoesNotThrow(()->store.require(b,true));
        mvc.perform(post("/api/wb/session/leave")).andExpect(status().isOk()).andExpect(jsonPath("$.code").value(400));
        assertDoesNotThrow(()->store.require(b,true));
    }
}
