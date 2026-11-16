package com.infotactsolutions.polyglotmesh.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.reactive.server.WebTestClient.bindToController;

import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

class ApiExceptionHandlerTest {
    private final org.springframework.test.web.reactive.server.WebTestClient client =
            bindToController(new BrokenController()).controllerAdvice(new ApiExceptionHandler()).build();

    @Test
    void hidesInternalExceptionDetails() {
        client.get().uri("/broken").exchange()
                .expectStatus().is5xxServerError()
                .expectBody()
                .jsonPath("$.error").isEqualTo("Internal Server Error")
                .jsonPath("$.message").doesNotExist();
    }

    @RestController
    static class BrokenController {
        @GetMapping("/broken")
        String broken() {
            throw new IllegalStateException("private implementation detail");
        }
    }
}
