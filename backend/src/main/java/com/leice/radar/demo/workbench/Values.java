package com.leice.radar.demo.workbench;

import java.util.LinkedHashMap;
import java.util.Map;

public final class Values {
    private Values() { }
    public static Map<String,Object> map(Object... pairs) {
        Map<String,Object> out = new LinkedHashMap<>();
        for (int i=0;i<pairs.length;i+=2) out.put(pairs[i].toString(),pairs[i+1]);
        return out;
    }
    public static String text(Map<String,Object> m,String key,String fallback) {
        Object v=m.get(key); return v==null ? fallback : v.toString();
    }
    public static double number(Map<String,Object> m,String key,double fallback) {
        Object v=m.get(key); if(v==null)return fallback;
        try { double d=Double.parseDouble(v.toString()); if(!Double.isFinite(d))throw new NumberFormatException();return d; }
        catch(NumberFormatException e){throw new IllegalArgumentException("Invalid finite number: "+key);}
    }
    public static boolean valid(double d) {return Double.isFinite(d) && d!=999 && d>-999;}
    @SuppressWarnings("unchecked") public static Map<String,Object> object(Object value) {
        if(!(value instanceof Map<?,?>)) throw new IllegalArgumentException("Expected object");
        return (Map<String,Object>) value;
    }
}
