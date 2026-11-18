package com.infotactsolutions.polyglotmesh.execution;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

final class BoundedOutputStream extends OutputStream {
    private final int maxBytes;
    private final ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    private boolean truncated;

    BoundedOutputStream(int maxBytes) { this.maxBytes = maxBytes; }

    @Override public synchronized void write(int value) {
        if (buffer.size() < maxBytes) buffer.write(value); else truncated = true;
    }

    @Override public synchronized void write(byte[] bytes, int offset, int length) throws IOException {
        int accepted = Math.min(length, maxBytes - buffer.size());
        if (accepted > 0) buffer.write(bytes, offset, accepted);
        if (accepted < length) truncated = true;
    }

    synchronized void append(String text) {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        int accepted = Math.min(bytes.length, maxBytes - buffer.size());
        if (accepted > 0) buffer.write(bytes, 0, accepted);
        if (accepted < bytes.length) truncated = true;
    }

    synchronized String text() {
        return buffer.toString(StandardCharsets.UTF_8) + (truncated ? "\n[output truncated]" : "");
    }
}
