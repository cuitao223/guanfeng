package com.leice.radar.demo.generation;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;

@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes=GenerationController.class)
public class GenerationErrors {
    @ExceptionHandler({IllegalArgumentException.class,HttpMessageNotReadableException.class})
    public Map<String,Object> invalid(Exception error,HttpServletRequest request){
        return failure(400,"Cn".equalsIgnoreCase(request.getHeader("X-Lang"))?"生成请求无效，请检查输入和任务状态":"Invalid generation request; check input and task state");
    }
    @ExceptionHandler(Exception.class)
    public Map<String,Object> failed(Exception error,HttpServletRequest request){
        return failure(500,"Cn".equalsIgnoreCase(request.getHeader("X-Lang"))?"生成操作失败，请查看任务中的阶段与错误记录":"Generation operation failed; inspect task stages and errors");
    }
    private Map<String,Object> failure(int code,String message){return Map.of("code",code,"msg",message,"data",Map.of());}
}
