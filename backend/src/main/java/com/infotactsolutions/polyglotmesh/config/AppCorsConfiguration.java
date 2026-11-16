package com.infotactsolutions.polyglotmesh.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class AppCorsConfiguration {
    @Bean
    CorsWebFilter corsWebFilter(@Value("${app.cors.allowed-origin:http://localhost:5173}") String allowedOrigin) {
        var configuration = new org.springframework.web.cors.CorsConfiguration();
        configuration.addAllowedOrigin(allowedOrigin);
        configuration.addAllowedMethod("GET");
        configuration.addAllowedHeader("Content-Type");
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return new CorsWebFilter(source);
    }
}
