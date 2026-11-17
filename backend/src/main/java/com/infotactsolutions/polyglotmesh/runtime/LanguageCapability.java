package com.infotactsolutions.polyglotmesh.runtime;

public record LanguageCapability(String id, String displayName, Status status, String diagnostic) {
    public enum Status {
        AVAILABLE,
        NOT_INSTALLED,
        INITIALIZATION_FAILED,
        NOT_CHECKED
    }
}
