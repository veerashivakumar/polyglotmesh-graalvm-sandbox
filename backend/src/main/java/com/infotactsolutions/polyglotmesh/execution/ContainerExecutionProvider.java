package com.infotactsolutions.polyglotmesh.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.*;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CompletableFuture;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
@ConditionalOnProperty(name="polyglotmesh.execution.provider", havingValue="docker", matchIfMissing=true)
public class ContainerExecutionProvider implements ExecutionProvider {
    private static final int MAX_WORKER_RESPONSE=20_000;
    private static final long TIMEOUT_SECONDS=20;
    private final ObjectMapper mapper;
    private final Function<String[], Process> launcher;
    @Autowired
    public ContainerExecutionProvider(ObjectMapper mapper){this(mapper, args->{try{return new ProcessBuilder(args).start();}catch(IOException e){throw new UnavailableException();}});}
    ContainerExecutionProvider(ObjectMapper mapper,Function<String[],Process> launcher){this.mapper=mapper;this.launcher=launcher;}

    @Override public ExecutionResponse execute(String code) {
        String id=UUID.randomUUID().toString();
        String containerName="polyglotmesh-worker-"+id;
        long started=System.nanoTime(); Process process;
        try {
            process=launcher.apply(new String[]{"docker","run","--rm","-i","--name="+containerName,"--network=none","--read-only","--cap-drop=ALL","--security-opt=no-new-privileges",
                    "--memory=128m","--cpus=0.50","--pids-limit=32","--user=65534:65534",
                    "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
                    "--tmpfs=/graal-cache:rw,exec,nosuid,nodev,size=32m,uid=65534,gid=65534,mode=0700",
                    "polyglotmesh-js-worker:day5"});
        } catch(UnavailableException e){throw unavailable();}
        boolean timedOut=false;
        try {
            var input=mapper.writeValueAsBytes(new WorkerRequest(id,"javascript",code));
            process.getOutputStream().write(input);process.getOutputStream().close();
            var responseFuture=CompletableFuture.supplyAsync(()->{try{return process.getInputStream().readNBytes(MAX_WORKER_RESPONSE+1);}catch(IOException e){throw new RuntimeException(e);}});
            if(!process.waitFor(TIMEOUT_SECONDS,TimeUnit.SECONDS)){
                timedOut=true;
                process.destroyForcibly();
                process.waitFor(2,TimeUnit.SECONDS);
                removeContainer(containerName);
                throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,"JavaScript execution exceeded the worker time limit.");
            }
            byte[] response=responseFuture.get(1,TimeUnit.SECONDS);
            if(process.exitValue()!=0||response.length>MAX_WORKER_RESPONSE)throw workerFailed();
            return mapper.readValue(response,ExecutionResponse.class);
        } catch(ResponseStatusException e){throw e;} catch(Exception e){throw workerFailed();}
        finally {
            if(process.isAlive()){
                process.destroyForcibly();
                if(!timedOut)removeContainer(containerName);
            }
            try{process.getInputStream().close();process.getErrorStream().close();}catch(IOException ignored){}
        }
    }
    private static ResponseStatusException unavailable(){return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Isolated execution worker is unavailable. Build the worker image and ensure Docker is running.");}
    private static ResponseStatusException workerFailed(){return new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Execution worker failed to start or exited unexpectedly.");}
    private static void removeContainer(String name){
        try {
            var cleanup=new ProcessBuilder("docker","rm","--force",name).start();
            if(!cleanup.waitFor(3,TimeUnit.SECONDS))cleanup.destroyForcibly();
            cleanup.getInputStream().close();cleanup.getErrorStream().close();
        } catch(Exception ignored) { }
    }
    static final class UnavailableException extends RuntimeException{}
    private record WorkerRequest(String executionId,String language,String code){}
}
