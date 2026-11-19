package com.infotactsolutions.polyglotmesh.execution;

import com.infotactsolutions.polyglotmesh.runtime.LanguageCapability;
import com.infotactsolutions.polyglotmesh.runtime.PolyglotRuntimeService;
import com.infotactsolutions.polyglotmesh.runtime.RuntimeCapabilities;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ExecutionService {
    static final int MAX_SOURCE_CHARS = 20_000;
    static final int MAX_OUTPUT_BYTES = 16_384;
    private final ExecutionProvider provider;
    private final PolyglotRuntimeService runtimeService;

    public ExecutionService(ExecutionProvider provider, PolyglotRuntimeService runtimeService) {
        this.provider = provider;
        this.runtimeService = runtimeService;
    }

    public ExecutionResponse execute(String language, String code) {
        if (!"javascript".equals(language) && !"js".equals(language)) throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Only JavaScript execution is supported.");
        if (code == null || code.isBlank()) throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Code must not be blank.");
        if (code.length() > MAX_SOURCE_CHARS) throw new ResponseStatusException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "Code exceeds the 20000 character limit.");
        if (provider.inProcess() && (runtimeService.capabilities().status() != RuntimeCapabilities.RuntimeStatus.INITIALIZED
                || runtimeService.capabilities().languages().stream().noneMatch(item -> item.id().equals("js") && item.status() == LanguageCapability.Status.AVAILABLE)))
            throw new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "JavaScript runtime is unavailable.");
        return provider.execute(code);
    }
}
