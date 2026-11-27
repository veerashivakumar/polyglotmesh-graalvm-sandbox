package com.infotactsolutions.polyglotmesh.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class AppCorsConfiguration {
    @Bean
    CorsWebFilter corsWebFilter(@Value("${app.cors.allowed-origin:http://localhost:5173}") String allowedOrigin) {
        if (allowedOrigin == null || allowedOrigin.isBlank() || "*".equals(allowedOrigin.trim())) {
            throw new IllegalArgumentException("app.cors.allowed-origin must name one specific frontend origin");
        }
        var configuration = buildCorsConfiguration(allowedOrigin);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return new CorsWebFilter(source);
    }

    org.springframework.web.cors.CorsConfiguration buildCorsConfiguration(String allowedOrigin) {
        var configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.addAllowedOrigin(allowedOrigin.trim());
        configuration.addAllowedMethod(HttpMethod.GET);
        configuration.addAllowedMethod(HttpMethod.POST);
        configuration.addAllowedMethod(HttpMethod.OPTIONS);
        configuration.addAllowedHeader(HttpHeaders.ACCEPT);
        configuration.addAllowedHeader(HttpHeaders.CONTENT_TYPE);
        return configuration;
    }
}
