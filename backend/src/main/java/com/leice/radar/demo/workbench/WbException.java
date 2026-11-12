package com.leice.radar.demo.workbench;
public final class WbException extends RuntimeException {
    private final int code;
    public WbException(int code,String message){super(message);this.code=code;}
    public int code(){return code;}
}
