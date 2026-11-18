package com.infotactsolutions.polyglotmesh.api;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebInputException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ServerWebInputException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleInvalidRequest(ServerWebInputException exception) {
        return Map.of("status", 400, "error", "Bad Request", "message", "Request body is missing or invalid.", "timestamp", Instant.now());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public org.springframework.http.ResponseEntity<Map<String, Object>> handleRequestException(ResponseStatusException exception) {
        var status = HttpStatus.valueOf(exception.getStatusCode().value());
        return org.springframework.http.ResponseEntity.status(status).body(Map.of(
                "status", status.value(), "error", status.getReasonPhrase(),
                "message", exception.getReason() == null ? "Invalid request." : exception.getReason(),
                "timestamp", Instant.now()));
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, Object> handleUnexpectedException(Exception exception) {
        return Map.of("status", 500, "error", "Internal Server Error", "timestamp", Instant.now());
    }
}
