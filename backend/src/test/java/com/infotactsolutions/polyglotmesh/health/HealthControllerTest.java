package com.infotactsolutions.polyglotmesh.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.reactive.server.WebTestClient.bindToController;

import org.junit.jupiter.api.Test;

class HealthControllerTest {
    private final org.springframework.test.web.reactive.server.WebTestClient client =
            bindToController(new HealthController()).build();

    @Test
    void returnsStructuredHealthyResponse() {
        client.get().uri("/api/health").exchange()
                .expectStatus().isOk()
                .expectHeader().contentTypeCompatibleWith("application/json")
                .expectBody(HealthResponse.class)
                .value(response -> {
                    assertThat(response.service()).isEqualTo("PolyglotMesh");
                    assertThat(response.status()).isEqualTo("UP");
                    assertThat(response.timestamp()).isNotNull();
                });
    }
}
