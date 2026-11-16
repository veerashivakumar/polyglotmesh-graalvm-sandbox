package com.infotactsolutions.polyglotmesh.health;

import java.time.Instant;

public record HealthResponse(String service, String status, Instant timestamp) {
    public static HealthResponse up() {
        return new HealthResponse("PolyglotMesh", "UP", Instant.now());
    }
}
