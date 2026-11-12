package com.leice.radar.demo.workbench;

import com.leice.radar.web.ApiResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.config.annotation.*;
import org.springframework.context.annotation.Configuration;

@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(basePackages="com.leice.radar.demo")
public class WorkbenchErrors {
    @ExceptionHandler(WbException.class) public Object business(WbException e){return ApiResponse.error(e.code(),e.getMessage());}
    @ExceptionHandler(IllegalArgumentException.class) public Object argument(IllegalArgumentException e){return ApiResponse.error(400,e.getMessage());}
    @ExceptionHandler(Exception.class) public Object unexpected(Exception e){return ApiResponse.error(500,"Operation failed; inspect local diagnostic evidence ("+e.getClass().getSimpleName()+")");}
}

@Configuration
class WorkbenchCors implements WebMvcConfigurer {
    @Override public void addCorsMappings(CorsRegistry registry){registry.addMapping("/api/wb/**").allowedOriginPatterns("http://localhost:[*]","http://127.0.0.1:[*]").allowedMethods("GET","POST","PUT","OPTIONS").allowedHeaders("Content-Type","X-Session","X-Lang","Authorization").exposedHeaders("Content-Disposition");}
}
