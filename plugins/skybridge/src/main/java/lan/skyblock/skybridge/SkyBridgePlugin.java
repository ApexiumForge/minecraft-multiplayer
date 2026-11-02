package lan.skyblock.skybridge;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.Statistic;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import world.bentobox.challenges.events.ChallengeCompletedEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.permissions.PermissionAttachment;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public final class SkyBridgePlugin extends JavaPlugin implements Listener {
    private final Gson gson = new Gson();
    private final Set<UUID> online = ConcurrentHashMap.newKeySet();
    private HttpClient http;
    private URI backend;
    private String secret;
    private OperationJournal journal;
    private volatile boolean polling;
    private boolean deliveryEnabled;
    private boolean sellingEnabled;
    private boolean challengeRewardsEnabled;
    private final Map<UUID, PermissionAttachment> temporaryChallengeAdmins = new HashMap<>();

    @Override public void onEnable() {
        saveDefaultConfig();
        secret = getConfig().getString("bridge-secret", "CHANGE_ME");
        if (secret.equals("CHANGE_ME") || secret.length() < 32) {
            getLogger().severe("SkyBridge disabled: configure a bridge-secret of at least 32 characters.");
            Bukkit.getPluginManager().disablePlugin(this);
            return;
        }
        try {
            journal = new OperationJournal(getDataFolder().toPath().resolve(getConfig().getString("journal-file", "operations.jsonl")));
        } catch (Exception error) {
            getLogger().severe("SkyBridge disabled: operation journal cannot be opened: " + error.getMessage());
            Bukkit.getPluginManager().disablePlugin(this);
            return;
        }
        backend = URI.create(getConfig().getString("backend-url", "http://127.0.0.1:3000"));
        deliveryEnabled = getConfig().getBoolean("delivery-enabled", false);
        sellingEnabled = getConfig().getBoolean("selling-enabled", false);
        challengeRewardsEnabled = getConfig().getBoolean("challenge-rewards-enabled", false);
        http = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(getConfig().getInt("connect-timeout-seconds", 3)))
            .build();
        Bukkit.getPluginManager().registerEvents(this, this);
        Bukkit.getOnlinePlayers().forEach(player -> { online.add(player.getUniqueId()); reportPresence(player, true); });
        long ticks = Math.max(40L, getConfig().getLong("poll-seconds", 5) * 20L);
        Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::pollSafely, ticks, ticks);
        Bukkit.getScheduler().runTaskAsynchronously(this, this::probeBackend);
        getLogger().info("SkyBridge enabled; linking active; item delivery " + (deliveryEnabled ? "ENABLED" : "DISABLED") + "; selling " + (sellingEnabled ? "ENABLED" : "DISABLED") + ".");
    }

    private void probeBackend() {
        JsonObject body = new JsonObject();
        body.add("onlineUuids", gson.toJsonTree(java.util.List.of()));
        if (post("/api/bridge/deliveries/claim", body) != null) {
            getLogger().info("Authenticated backend connection verified.");
        }
    }

    @EventHandler public void onJoin(PlayerJoinEvent event) {
        online.add(event.getPlayer().getUniqueId());
        reportPresence(event.getPlayer(), true);
        Bukkit.getScheduler().runTaskLater(this, () -> reportInventory(event.getPlayer()), 20L);
    }
    @EventHandler public void onQuit(PlayerQuitEvent event) { online.remove(event.getPlayer().getUniqueId()); reportPresence(event.getPlayer(), false); }

    @EventHandler public void onChallengeCompleted(ChallengeCompletedEvent event) {
        if (!challengeRewardsEnabled) return;
        JsonObject body = new JsonObject();
        body.addProperty("uuid", event.getPlayerUUID().toString());
        body.addProperty("challengeId", event.getChallengeID());
        body.addProperty("completionCount", event.getCompletionCount());
        body.addProperty("admin", event.isAdmin());
        CompletableFuture.runAsync(() -> post("/api/bridge/challenges/completed", body));
    }

    private void reportPresence(Player player, boolean isOnline) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", player.getUniqueId().toString()); body.addProperty("name", player.getName()); body.addProperty("online", isOnline);
        CompletableFuture.runAsync(() -> post("/api/bridge/presence", body));
    }

    private void reportInventory(Player player) {
        if (!player.isOnline()) return;
        JsonObject counts = new JsonObject();
        for (ItemStack stack : player.getInventory().getStorageContents()) {
            if (stack != null && !stack.getType().isAir()) {
                String key = stack.getType().name();
                counts.addProperty(key, (counts.has(key) ? counts.get(key).getAsInt() : 0) + stack.getAmount());
            }
        }
        JsonObject body = new JsonObject();
        body.addProperty("uuid", player.getUniqueId().toString());
        body.add("counts", counts);
        CompletableFuture.runAsync(() -> post("/api/bridge/inventory", body));
    }

    private void pollSafely() {
        if (polling || !isEnabled()) return;
        polling = true;
        try {
            boolean unresolved = false;
            for (OperationJournal.Entry entry : journal.unresolved()) {
                unresolved = true;
                if (entry.state() == OperationJournal.State.PREPARED) {
                    if (reportResult(entry, "AMBIGUOUS")) journal.append(entry.operationId(), entry.claimToken(), entry.kind(), OperationJournal.State.AMBIGUOUS);
                } else if (entry.state() == OperationJournal.State.APPLIED) {
                    if (reportResult(entry, "APPLIED")) journal.append(entry.operationId(), entry.claimToken(), entry.kind(), OperationJournal.State.ACKNOWLEDGED);
                }
            }
            if (!unresolved && !online.isEmpty()) {
                if (deliveryEnabled) claimNext();
                if (sellingEnabled) claimNextSale();
                Bukkit.getScheduler().runTask(this, () -> Bukkit.getOnlinePlayers().forEach(this::reportInventory));
                if (challengeRewardsEnabled) Bukkit.getScheduler().runTask(this, () -> Bukkit.getOnlinePlayers().forEach(this::reportChallengeProgress));
            }
        } catch (Exception error) {
            getLogger().warning("Delivery poll failed safely: " + error.getMessage());
        } finally { polling = false; }
    }

    private void reportChallengeProgress(Player player) {
        JsonObject body = new JsonObject();
        body.addProperty("uuid", player.getUniqueId().toString());
        body.addProperty("key", "gather-cobble-64");
        body.addProperty("value", player.getStatistic(Statistic.MINE_BLOCK, Material.COBBLESTONE));
        CompletableFuture.runAsync(() -> post("/api/bridge/challenges/progress", body));
    }

    private void claimNext() {
        JsonObject body = new JsonObject();
        body.add("onlineUuids", gson.toJsonTree(online.stream().map(UUID::toString).toList()));
        JsonObject response = post("/api/bridge/deliveries/claim", body);
        if (response == null || response.get("job") == null || response.get("job").isJsonNull()) return;
        JsonObject job = response.getAsJsonObject("job");
        Bukkit.getScheduler().runTask(this, () -> deliver(job));
    }

    private void deliver(JsonObject job) {
        String operationId = job.get("operationId").getAsString();
        String claimToken = job.get("claimToken").getAsString();
        UUID playerId = UUID.fromString(job.get("playerUuid").getAsString());
        Player player = Bukkit.getPlayer(playerId);
        Material material = Material.matchMaterial(job.get("material").getAsString());
        int amount = job.get("amount").getAsInt();
        if (player == null || material == null || amount < 1 || capacity(player, material) < amount) {
            CompletableFuture.runAsync(() -> reportResult(new OperationJournal.Entry(operationId, claimToken, OperationJournal.Kind.DELIVERY, OperationJournal.State.PREPARED), "RELEASE"));
            return;
        }
        try {
            journal.append(operationId, claimToken, OperationJournal.State.PREPARED);
            Map<Integer, ItemStack> leftover = player.getInventory().addItem(new ItemStack(material, amount));
            if (!leftover.isEmpty()) {
                journal.append(operationId, claimToken, OperationJournal.State.AMBIGUOUS);
                CompletableFuture.runAsync(() -> reportResult(new OperationJournal.Entry(operationId, claimToken, OperationJournal.Kind.DELIVERY, OperationJournal.State.AMBIGUOUS), "AMBIGUOUS"));
                getLogger().severe("Unexpected partial delivery quarantined: " + operationId);
                return;
            }
            journal.append(operationId, claimToken, OperationJournal.State.APPLIED);
            player.sendMessage("§aShop delivery received: §f" + amount + " " + material.name());
            CompletableFuture.runAsync(() -> {
                var entry = new OperationJournal.Entry(operationId, claimToken, OperationJournal.Kind.DELIVERY, OperationJournal.State.APPLIED);
                try { if (reportResult(entry, "APPLIED")) journal.append(operationId, claimToken, OperationJournal.State.ACKNOWLEDGED); }
                catch (Exception error) { getLogger().warning("Delivery acknowledgement deferred: " + operationId); }
            });
        } catch (Exception error) {
            getLogger().severe("Delivery entered safe ambiguous state " + operationId + ": " + error.getMessage());
        }
    }

    private void claimNextSale() {
        JsonObject body = new JsonObject();
        body.add("onlineUuids", gson.toJsonTree(online.stream().map(UUID::toString).toList()));
        JsonObject response = post("/api/bridge/sales/claim", body);
        if (response == null || response.get("job") == null || response.get("job").isJsonNull()) return;
        Bukkit.getScheduler().runTask(this, () -> removeForSale(response.getAsJsonObject("job")));
    }

    private void removeForSale(JsonObject job) {
        String operationId = job.get("operationId").getAsString();
        String claimToken = job.get("claimToken").getAsString();
        UUID playerId = UUID.fromString(job.get("playerUuid").getAsString());
        Player player = Bukkit.getPlayer(playerId);
        Material material = Material.matchMaterial(job.get("material").getAsString());
        int amount = job.get("amount").getAsInt();
        var entry = new OperationJournal.Entry(operationId, claimToken, OperationJournal.Kind.SALE, OperationJournal.State.PREPARED);
        if (player == null || material == null || amount < 1 || count(player, material) < amount) {
            CompletableFuture.runAsync(() -> reportResult(entry, "RELEASE"));
            return;
        }
        try {
            journal.append(operationId, claimToken, OperationJournal.Kind.SALE, OperationJournal.State.PREPARED);
            ItemStack[] contents = player.getInventory().getStorageContents();
            int remaining = amount;
            for (int i = 0; i < contents.length && remaining > 0; i++) {
                ItemStack stack = contents[i];
                if (stack == null || stack.getType() != material) continue;
                int removed = Math.min(stack.getAmount(), remaining);
                remaining -= removed;
                if (removed == stack.getAmount()) contents[i] = null;
                else stack.setAmount(stack.getAmount() - removed);
            }
            if (remaining != 0) throw new IllegalStateException("inventory changed during validated removal");
            player.getInventory().setStorageContents(contents);
            journal.append(operationId, claimToken, OperationJournal.Kind.SALE, OperationJournal.State.APPLIED);
            player.sendMessage("§aSale accepted: §f" + amount + " " + material.name() + "§a. Coins credited safely.");
            CompletableFuture.runAsync(() -> {
                var applied = new OperationJournal.Entry(operationId, claimToken, OperationJournal.Kind.SALE, OperationJournal.State.APPLIED);
                try { if (reportResult(applied, "APPLIED")) journal.append(operationId, claimToken, OperationJournal.Kind.SALE, OperationJournal.State.ACKNOWLEDGED); }
                catch (Exception error) { getLogger().warning("Sale credit acknowledgement deferred: " + operationId); }
            });
        } catch (Exception error) {
            getLogger().severe("Sale entered safe ambiguous state " + operationId + ": " + error.getMessage());
        }
    }

    private int count(Player player, Material material) {
        int count = 0;
        for (ItemStack stack : player.getInventory().getStorageContents()) if (stack != null && stack.getType() == material) count += stack.getAmount();
        return count;
    }

    private int capacity(Player player, Material material) {
        int capacity = 0, max = material.getMaxStackSize();
        for (ItemStack stack : player.getInventory().getStorageContents()) {
            if (stack == null || stack.getType().isAir()) capacity += max;
            else if (stack.getType() == material) capacity += Math.max(0, max - stack.getAmount());
        }
        return capacity;
    }

    private boolean reportResult(OperationJournal.Entry entry, String result) {
        JsonObject body = new JsonObject();
        body.addProperty("operationId", entry.operationId()); body.addProperty("claimToken", entry.claimToken());
        body.addProperty("result", result); body.addProperty("journalId", entry.operationId());
        String path = entry.kind() == OperationJournal.Kind.SALE ? "/api/bridge/sales/result" : "/api/bridge/deliveries/result";
        return post(path, body) != null;
    }

    private JsonObject post(String path, JsonObject body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(backend.resolve(path))
                .timeout(Duration.ofSeconds(getConfig().getInt("request-timeout-seconds", 5)))
                .header("Authorization", "Bearer " + secret)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("User-Agent", "SkyBridge/0.1")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body))).build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                getLogger().warning(path + " returned HTTP " + response.statusCode() + errorSuffix(response.body()));
                return null;
            }
            try {
                JsonObject parsed = gson.fromJson(response.body(), JsonObject.class);
                if (parsed == null) getLogger().warning(path + " returned an empty JSON response");
                return parsed;
            } catch (RuntimeException error) {
                getLogger().warning(path + " returned invalid JSON (HTTP " + response.statusCode() + ", " + response.body().length() + " bytes)");
                return null;
            }
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            getLogger().warning(path + " interrupted while contacting the backend");
            return null;
        } catch (Exception error) {
            getLogger().warning(path + " unavailable: " + error.getClass().getSimpleName() + ": " + error.getMessage());
            return null;
        }
    }

    private String errorSuffix(String body) {
        try {
            JsonObject parsed = gson.fromJson(body, JsonObject.class);
            if (parsed != null && parsed.has("error")) return " (" + parsed.get("error").getAsString() + ")";
        } catch (RuntimeException ignored) { }
        return "";
    }

    @Override public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player) && args.length == 3 && args[0].equalsIgnoreCase("challenge-admin")) {
            Player target = Bukkit.getPlayerExact(args[2]);
            if (target == null) { sender.sendMessage("Player must be online."); return true; }
            if (args[1].equalsIgnoreCase("grant")) {
                revokeChallengeAdmin(target.getUniqueId());
                PermissionAttachment attachment = target.addAttachment(this);
                attachment.setPermission("bskyblock.admin", true);
                attachment.setPermission("bskyblock.admin.challenges", true);
                attachment.setPermission("addon.admin.challenges", true);
                temporaryChallengeAdmins.put(target.getUniqueId(), attachment);
                target.recalculatePermissions();
                sender.sendMessage("Granted only temporary BentoBox Challenges administration to " + target.getName() + ".");
                target.sendMessage("§eTemporary Challenges administration granted. Use /bsbadmin challenges and only Import Database.");
                return true;
            }
            if (args[1].equalsIgnoreCase("revoke")) {
                revokeChallengeAdmin(target.getUniqueId());
                sender.sendMessage("Revoked temporary BentoBox Challenges administration from " + target.getName() + ".");
                target.sendMessage("§aTemporary Challenges administration revoked.");
                return true;
            }
        }
        if (!(sender instanceof Player player)) { sender.sendMessage("Players only."); return true; }
        if (args.length == 1 && args[0].equalsIgnoreCase("link")) {
            player.sendMessage("§7Creating a secure one-time link code...");
            JsonObject body = new JsonObject(); body.addProperty("uuid", player.getUniqueId().toString());
            CompletableFuture.supplyAsync(() -> post("/api/bridge/link-code", body)).thenAccept(response -> Bukkit.getScheduler().runTask(this, () -> {
                if (response == null || !response.has("code")) player.sendMessage("§cCould not create a link code. Try again shortly.");
                else { player.sendMessage("§aYour one-time code is §e" + response.get("code").getAsString()); player.sendMessage("§7It expires in 10 minutes. Enter it only on the SKYBLOCK LAN website."); }
            }));
            return true;
        }
        player.sendMessage("§eUse /shop link"); return true;
    }

    private void revokeChallengeAdmin(UUID playerId) {
        PermissionAttachment attachment = temporaryChallengeAdmins.remove(playerId);
        if (attachment != null) {
            Player player = Bukkit.getPlayer(playerId);
            if (player != null) player.removeAttachment(attachment);
            else attachment.remove();
        }
    }

    @Override public void onDisable() {
        for (UUID playerId : java.util.List.copyOf(temporaryChallengeAdmins.keySet())) revokeChallengeAdmin(playerId);
    }
}
