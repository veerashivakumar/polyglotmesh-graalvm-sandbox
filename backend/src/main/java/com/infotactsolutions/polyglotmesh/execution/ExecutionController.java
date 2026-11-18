package com.infotactsolutions.polyglotmesh.execution;

import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/executions")
public class ExecutionController {
    private final ExecutionService executionService;
    public ExecutionController(ExecutionService executionService) { this.executionService = executionService; }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<ExecutionResponse> execute(@RequestBody ExecutionRequest request) {
        return Mono.fromCallable(() -> executionService.execute(request.language(), request.code()))
                .subscribeOn(Schedulers.boundedElastic());
    }
}
