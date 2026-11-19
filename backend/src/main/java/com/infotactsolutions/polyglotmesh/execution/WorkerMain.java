package com.infotactsolutions.polyglotmesh.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.graalvm.polyglot.*;
import org.graalvm.polyglot.io.IOAccess;

/** One job per JVM/container. Protocol is one bounded JSON request and one JSON response on stdio. */
public final class WorkerMain {
    private WorkerMain(){}
    public static void main(String[] args)throws Exception{
        var mapper=new ObjectMapper(); byte[] bytes=System.in.readNBytes(65_537);
        if(bytes.length>65_536)System.exit(2);
        var request=mapper.readValue(bytes,Request.class);
        if(request==null||!"javascript".equals(request.language())||request.code()==null||request.code().isBlank()||request.code().length()>20_000)System.exit(2);
        long started=System.nanoTime();var output=new BoundedOutputStream(16_384);ExecutionResponse.Status status;String error=null;
        try(Context context=Context.newBuilder("js").allowHostAccess(HostAccess.NONE).allowHostClassLookup(n->false).allowIO(IOAccess.NONE)
                .allowEnvironmentAccess(EnvironmentAccess.NONE).allowNativeAccess(false).allowCreateThread(false).allowCreateProcess(false)
                .allowPolyglotAccess(PolyglotAccess.NONE).allowValueSharing(false).out(output).err(output)
                .option("engine.WarnInterpreterOnly", "false")
                .resourceLimits(ResourceLimits.newBuilder().statementLimit(1_000_000,s->true).build()).build()){
            Value result=context.eval("js",request.code());if(result!=null&&!result.isNull()){String captured=output.text();output.append((captured.isEmpty()||captured.endsWith("\n")?"":"\n")+result); }status=ExecutionResponse.Status.SUCCESS;
        }catch(PolyglotException e){String message=e.getMessage()==null?"Guest script failed.":e.getMessage();if(message.length()>300)message=message.substring(0,300);error=e.isSyntaxError()?"JavaScript syntax error: "+message:e.isResourceExhausted()?"Execution exceeded the statement limit.":"JavaScript execution failed: "+message;status=ExecutionResponse.Status.ERROR;}
        var response=new ExecutionResponse(request.executionId()==null?UUID.randomUUID().toString():request.executionId(),"javascript",status,output.text(),error,(System.nanoTime()-started)/1_000_000);
        System.out.write(mapper.writeValueAsBytes(response));System.out.flush();
    }
    private record Request(String executionId,String language,String code){}
}
