package com.infotactsolutions.polyglotmesh.execution;

public interface ExecutionProvider {
    ExecutionResponse execute(String code);
    default boolean inProcess() { return false; }
}
