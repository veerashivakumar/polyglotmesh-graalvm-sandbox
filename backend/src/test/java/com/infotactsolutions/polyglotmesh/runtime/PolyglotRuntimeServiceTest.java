package com.infotactsolutions.polyglotmesh.runtime;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PolyglotRuntimeServiceTest {
    @Test
    void initializesRealEngineAndDetectsInstalledGuestLanguage() {
        var service = new PolyglotRuntimeService();
        try {
            var capabilities = service.capabilities();
            assertThat(capabilities.status()).isEqualTo(RuntimeCapabilities.RuntimeStatus.INITIALIZED);
            assertThat(capabilities.runtimeName()).isNotBlank();
            assertThat(capabilities.runtimeVersion()).isNotBlank();
            assertThat(capabilities.hostJavaVersion()).isEqualTo(System.getProperty("java.version"));
            assertThat(capabilities.languages()).filteredOn(language -> language.id().equals("js"))
                    .singleElement().extracting(LanguageCapability::status)
                    .isEqualTo(LanguageCapability.Status.AVAILABLE);
            assertThat(capabilities.languages()).filteredOn(language -> language.id().equals("python"))
                    .singleElement().extracting(LanguageCapability::status)
                    .isEqualTo(LanguageCapability.Status.NOT_INSTALLED);
        } finally {
            service.close();
        }
    }

    @Test
    void reportsUnavailableWhenEngineInitializationFails() {
        var service = new PolyglotRuntimeService(() -> {
            throw new LinkageError("private initialization detail");
        });

        var capabilities = service.capabilities();
        assertThat(capabilities.status()).isEqualTo(RuntimeCapabilities.RuntimeStatus.UNAVAILABLE);
        assertThat(capabilities.diagnostic()).doesNotContain("private initialization detail");
        assertThat(capabilities.languages()).allSatisfy(language ->
                assertThat(language.status()).isEqualTo(LanguageCapability.Status.NOT_CHECKED));
        service.close();
    }

    @Test
    void closesEngineDuringServiceShutdown() {
        var service = new PolyglotRuntimeService();
        service.close();
        service.close();
        assertThat(service.capabilities().status()).isEqualTo(RuntimeCapabilities.RuntimeStatus.INITIALIZED);
    }
}
