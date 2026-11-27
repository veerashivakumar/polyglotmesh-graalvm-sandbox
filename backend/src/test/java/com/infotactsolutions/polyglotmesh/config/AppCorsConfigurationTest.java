package com.infotactsolutions.polyglotmesh.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

class AppCorsConfigurationTest {
    private static final String DEV_ORIGIN = "http://localhost:5173";

    @Test
    void allowsDevelopmentOriginPreflightForExecutionPost() {
        var configuration = new AppCorsConfiguration().buildCorsConfiguration(DEV_ORIGIN);
        assertThat(configuration.getAllowedOrigins()).containsExactly(DEV_ORIGIN);
        assertThat(configuration.getAllowedMethods()).containsExactlyInAnyOrder("GET", "POST", "OPTIONS");
        assertThat(configuration.getAllowedHeaders()).containsExactlyInAnyOrder(HttpHeaders.ACCEPT, HttpHeaders.CONTENT_TYPE);
        assertThat(configuration.checkOrigin(DEV_ORIGIN)).isNotNull();
        assertThat(configuration.checkOrigin("http://evil.example")).isNull();
    }

    @Test
    void rejectsWildcardConfiguration() {
        assertThatThrownBy(() -> new AppCorsConfiguration().corsWebFilter("*"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
