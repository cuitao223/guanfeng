package com.leice.radar.demo.workbench;

import java.math.BigDecimal;
import java.util.*;

/** Small validator for the parameter-schema subset used by component manifests. */
public final class ComponentParameters {
    private ComponentParameters(){}

    public static void validate(Object schema,Object parameters,String path){
        if(!(schema instanceof Map<?,?> rules))throw new IllegalArgumentException(path+" has an invalid parameter schema");
        if(!(parameters instanceof Map<?,?>))throw new IllegalArgumentException(path+" must be an object");
        finite(parameters,path);
        check(rules,parameters,path);
    }
    private static void finite(Object value,String path){
        if(value instanceof Number number&&!Double.isFinite(number.doubleValue()))fail(path,"must contain only finite numbers");
        if(value instanceof Map<?,?> object)for(var entry:object.entrySet())finite(entry.getValue(),path+"."+entry.getKey());
        else if(value instanceof Collection<?> array){int i=0;for(Object item:array)finite(item,path+"["+(i++)+"]");}
    }
    private static void check(Map<?,?> schema,Object value,String path){
        Object type=schema.get("type");
        if(type instanceof String name){if(!matches(name,value))fail(path,"must have type "+name);}
        else if(type instanceof List<?> types){if(types.stream().noneMatch(name->name instanceof String s&&matches(s,value)))fail(path,"does not match the allowed types");}
        else if(type!=null)fail(path,"has an invalid type schema");
        if(schema.get("enum") instanceof List<?> values&&values.stream().noneMatch(item->equalValue(item,value)))fail(path,"must match an enum value");
        if(schema.containsKey("const")&&!equalValue(schema.get("const"),value))fail(path,"must match the constant value");
        if(value instanceof Number number){
            BigDecimal actual=decimal(number);
            if(schema.get("minimum") instanceof Number min&&actual.compareTo(decimal(min))<0)fail(path,"is below minimum");
            if(schema.get("maximum") instanceof Number max&&actual.compareTo(decimal(max))>0)fail(path,"exceeds maximum");
        }
        if(value instanceof String string&&schema.get("minLength") instanceof Number min&&string.codePointCount(0,string.length())<min.intValue())fail(path,"is shorter than minLength");
        if(value instanceof Map<?,?> object){
            if(schema.get("required") instanceof List<?> required)for(Object name:required)if(!object.containsKey(name))fail(path+"."+name,"is required");
            Map<?,?> properties=schema.get("properties") instanceof Map<?,?> p?p:Map.of();
            for(var entry:object.entrySet()){
                String child=path+"."+entry.getKey();Object rule=properties.get(entry.getKey());
                if(rule instanceof Map<?,?> childSchema)check(childSchema,entry.getValue(),child);
                else if(rule!=null)fail(child,"has an invalid property schema");
                else if(Boolean.FALSE.equals(schema.get("additionalProperties")))fail(child,"is not an allowed parameter");
                else if(schema.get("additionalProperties") instanceof Map<?,?> extra)check(extra,entry.getValue(),child);
            }
        }
        if(value instanceof Collection<?> array&&schema.get("items") instanceof Map<?,?> itemSchema){int i=0;for(Object item:array)check(itemSchema,item,path+"["+(i++)+"]");}
    }
    private static boolean matches(String type,Object value){
        return switch(type){
            case "object" -> value instanceof Map<?,?>;
            case "array" -> value instanceof Collection<?>;
            case "string" -> value instanceof String;
            case "boolean" -> value instanceof Boolean;
            case "number" -> value instanceof Number n&&Double.isFinite(n.doubleValue());
            case "integer" -> value instanceof Number n&&Double.isFinite(n.doubleValue())&&decimal(n).stripTrailingZeros().scale()<=0;
            case "null" -> value==null;
            default -> throw new IllegalArgumentException("Unsupported parameter schema type: "+type);
        };
    }
    private static boolean equalValue(Object left,Object right){
        if(left instanceof Number a&&right instanceof Number b)return decimal(a).compareTo(decimal(b))==0;
        return Objects.equals(left,right);
    }
    private static BigDecimal decimal(Number number){
        if(!Double.isFinite(number.doubleValue()))throw new IllegalArgumentException("Parameter schema and values require finite numbers");
        return new BigDecimal(number.toString());
    }
    private static void fail(String path,String message){throw new IllegalArgumentException(path+" "+message);}
}
