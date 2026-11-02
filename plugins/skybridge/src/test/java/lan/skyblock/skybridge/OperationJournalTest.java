package lan.skyblock.skybridge;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;

class OperationJournalTest {
    @TempDir Path temp;
    @Test void preparedSurvivesRestartAndMustBeQuarantined() throws Exception {
        Path file = temp.resolve("journal.jsonl");
        new OperationJournal(file).append("op-1", "token", OperationJournal.State.PREPARED);
        var entries = new OperationJournal(file).unresolved();
        assertEquals(1, entries.size());
        assertEquals(OperationJournal.State.PREPARED, entries.getFirst().state());
    }
    @Test void appliedSurvivesRestartForAckOnlyRetry() throws Exception {
        Path file = temp.resolve("journal.jsonl");
        var journal = new OperationJournal(file);
        journal.append("op-1", "token", OperationJournal.State.PREPARED);
        journal.append("op-1", "token", OperationJournal.State.APPLIED);
        assertEquals(OperationJournal.State.APPLIED, new OperationJournal(file).unresolved().getFirst().state());
    }
    @Test void acknowledgedOperationsAreNotRetried() throws Exception {
        Path file = temp.resolve("journal.jsonl");
        var journal = new OperationJournal(file);
        journal.append("op-1", "token", OperationJournal.State.APPLIED);
        journal.append("op-1", "token", OperationJournal.State.ACKNOWLEDGED);
        assertTrue(new OperationJournal(file).unresolved().isEmpty());
    }
    @Test void saleKindSurvivesRestartForCreditOnlyRecovery() throws Exception {
        Path file = temp.resolve("journal.jsonl");
        var journal = new OperationJournal(file);
        journal.append("sale-1", "token", OperationJournal.Kind.SALE, OperationJournal.State.PREPARED);
        journal.append("sale-1", "token", OperationJournal.Kind.SALE, OperationJournal.State.APPLIED);
        var recovered = new OperationJournal(file).unresolved().getFirst();
        assertEquals(OperationJournal.Kind.SALE, recovered.kind());
        assertEquals(OperationJournal.State.APPLIED, recovered.state());
    }
    @Test void legacyDeliveryJournalLinesRemainReadable() throws Exception {
        Path file = temp.resolve("journal.jsonl");
        java.nio.file.Files.writeString(file, "old-op\ttoken\tAPPLIED\n");
        assertEquals(OperationJournal.Kind.DELIVERY, new OperationJournal(file).unresolved().getFirst().kind());
    }
}
