package com.infotactsolutions.polyglotmesh.execution;

public record ExecutionResponse(String executionId, String language, Status status, String output, String error,
                                long executionTimeMs) {
    public enum Status { SUCCESS, ERROR }
}
