package com.infotactsolutions.polyglotmesh.runtime;

import java.util.List;

public record RuntimeCapabilities(
        String runtimeName,
        RuntimeStatus status,
        String runtimeVersion,
        String hostJavaVersion,
        List<LanguageCapability> languages,
        String diagnostic) {
    public enum RuntimeStatus {
        INITIALIZED,
        UNAVAILABLE
    }
}
