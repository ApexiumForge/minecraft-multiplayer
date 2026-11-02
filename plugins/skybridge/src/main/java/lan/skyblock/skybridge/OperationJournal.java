package lan.skyblock.skybridge;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class OperationJournal {
    enum Kind { DELIVERY, SALE }
    enum State { PREPARED, APPLIED, AMBIGUOUS, ACKNOWLEDGED }
    record Entry(String operationId, String claimToken, Kind kind, State state) {}
    private final Path path;
    private final Map<String, Entry> latest = new HashMap<>();

    OperationJournal(Path path) throws IOException { this.path = path; load(); }

    synchronized void append(String operationId, String claimToken, State state) throws IOException {
        append(operationId, claimToken, Kind.DELIVERY, state);
    }

    synchronized void append(String operationId, String claimToken, Kind kind, State state) throws IOException {
        String line = operationId + "\t" + claimToken + "\t" + kind.name() + "\t" + state.name() + "\n";
        Files.createDirectories(path.getParent());
        try (FileChannel channel = FileChannel.open(path, StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND)) {
            channel.write(ByteBuffer.wrap(line.getBytes(StandardCharsets.UTF_8)));
            channel.force(true);
        }
        latest.put(operationId, new Entry(operationId, claimToken, kind, state));
    }

    synchronized List<Entry> unresolved() {
        return latest.values().stream().filter(e -> e.state == State.PREPARED || e.state == State.APPLIED || e.state == State.AMBIGUOUS).toList();
    }

    private void load() throws IOException {
        if (!Files.exists(path)) return;
        for (String line : Files.readAllLines(path, StandardCharsets.UTF_8)) {
            String[] parts = line.split("\\t");
            if (parts.length == 3) latest.put(parts[0], new Entry(parts[0], parts[1], Kind.DELIVERY, State.valueOf(parts[2])));
            else if (parts.length == 4) latest.put(parts[0], new Entry(parts[0], parts[1], Kind.valueOf(parts[2]), State.valueOf(parts[3])));
        }
    }
}
