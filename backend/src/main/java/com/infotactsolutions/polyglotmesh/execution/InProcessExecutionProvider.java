package com.infotactsolutions.polyglotmesh.execution;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.graalvm.polyglot.*;
import org.graalvm.polyglot.io.IOAccess;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="polyglotmesh.execution.provider", havingValue="in-process")
public class InProcessExecutionProvider implements ExecutionProvider, AutoCloseable {
    private static final int MAX_OUTPUT_BYTES=16_384;
    private static final long MAX_STATEMENTS=1_000_000, TIMEOUT_MS=2_000;
    private final ScheduledExecutorService canceller=Executors.newScheduledThreadPool(2, r->{var t=new Thread(r,"execution-canceller");t.setDaemon(true);return t;});
    @Override public boolean inProcess(){return true;}
    @Override public ExecutionResponse execute(String code){
        long started=System.nanoTime(); var output=new BoundedOutputStream(MAX_OUTPUT_BYTES); var timedOut=new AtomicBoolean();
        Context context=Context.newBuilder("js").allowHostAccess(HostAccess.NONE).allowHostClassLookup(n->false).allowIO(IOAccess.NONE)
                .allowEnvironmentAccess(EnvironmentAccess.NONE).allowNativeAccess(false).allowCreateThread(false).allowCreateProcess(false)
                .allowPolyglotAccess(PolyglotAccess.NONE).allowValueSharing(false).out(output).err(output).option("engine.WarnInterpreterOnly","false")
                .resourceLimits(ResourceLimits.newBuilder().statementLimit(MAX_STATEMENTS,s->true).build()).build();
        var timeout=canceller.schedule(()->{timedOut.set(true);try{context.close(true);}catch(RuntimeException ignored){}},TIMEOUT_MS,TimeUnit.MILLISECONDS);
        ExecutionResponse.Status status; String error=null;
        try { Value value=context.eval("js",code); if(value!=null&&!value.isNull()){String captured=output.text();output.append((captured.isEmpty()||captured.endsWith("\n")?"":"\n")+value); } status=ExecutionResponse.Status.SUCCESS; }
        catch(PolyglotException e){String m=e.getMessage()==null||e.getMessage().isBlank()?"Guest script failed.":e.getMessage();if(m.length()>300)m=m.substring(0,300);error=timedOut.get()?"Execution exceeded the 2000 ms time limit.":e.isSyntaxError()?"JavaScript syntax error: "+m:e.isResourceExhausted()?"Execution exceeded the statement limit.":"JavaScript execution failed: "+m;status=ExecutionResponse.Status.ERROR;}
        finally{timeout.cancel(false);try{context.close(true);}catch(RuntimeException ignored){}}
        return new ExecutionResponse(UUID.randomUUID().toString(),"javascript",status,output.text(),error,Duration.ofNanos(System.nanoTime()-started).toMillis());
    }
    @Override public void close(){canceller.shutdownNow();}
}
