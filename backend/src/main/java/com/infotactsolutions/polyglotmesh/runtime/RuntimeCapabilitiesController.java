package com.infotactsolutions.polyglotmesh.runtime;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/runtime")
public class RuntimeCapabilitiesController {
    private final PolyglotRuntimeService runtimeService;

    public RuntimeCapabilitiesController(PolyglotRuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @GetMapping("/capabilities")
    public RuntimeCapabilities capabilities() {
        return runtimeService.capabilities();
    }
}
