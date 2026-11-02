# Development plan

Updated: 2026-10-31

## Phase 4 implementation record — 2026-10-31

### PASS

- Reconciled Phase 3 live data: two distinct 64-cobblestone purchases are `COMPLETED`; each has exactly one claim attempt, one -100 ledger entry, and a durable `PREPARED -> APPLIED -> ACKNOWLEDGED` SkyBridge journal sequence. Wallet arithmetic is 250 - 100 - 100 = 50 Coins.
- Applied additive Prisma migration `20261031034500_phase4_safe_sales` without replacing existing tables or data. Existing worlds, inventories, purchases, deliveries, wallet entries, and configurations were not reset.
- Implemented persistent sale jobs with claim tokens, attempt count, claim/applied/completed timestamps, and explicit PENDING/CLAIMED/COMPLETED/AMBIGUOUS states.
- Implemented the safe removal protocol in SkyBridge source: validate exact quantity on the main thread, force a `SALE/PREPARED` journal record, remove exactly the requested material, force `SALE/APPLIED`, then request an idempotent database credit.
- Implemented conservative recovery: PREPARED sale recovery quarantines as AMBIGUOUS and never retries removal or credits automatically; APPLIED recovery performs credit/acknowledgement only.
- Wallet sale credit, ledger creation, and sale completion occur in one serializable transaction with a unique `sale:<job>` ledger key. Concurrent acknowledgement tests prove one credit only.
- Added authenticated inventory snapshots, categorized Buy and Sell pages, current availability display, transaction history, and visible pending/completed/ambiguous status styling.
- Expanded the catalog UI into categories while keeping every unproven buy item disabled. Only the previously proven cobblestone buy route remains live.
- Added a gated once-only gameplay reward service using the trusted Minecraft cobblestone-mining statistic, atomic reward transition, and unique challenge ledger entry.
- Phase 4 automated verification: 18/18 web tests pass (delivery, purchase, sale state machine, sale transactions, and challenge concurrency); 5/5 Java journal tests pass; ESLint, Next.js production build, and Gradle build pass.
- The tested Phase 4 plugin artifact was staged at `server/disabled/SkyBridge-phase4-tested.jar` with SHA-256 `255AEBC7820B8976E1B998E1D0B945A37AB073FBB1CE2DB708D72CA6C74118A4` before its controlled deployment.
- Process identity and shutdown were verified safely: Paper PID 32288 used Microsoft Java 21 with `-Xms1G -Xmx4G -jar paper.jar --nogui`, owned TCP 25565, and was distinct from Gradle PID 3448. Its preserved PTY console was recovered; no process signal, force kill, or RCON was used.
- With one player online, the console announced maintenance, ran `save-all flush`, and issued `stop`. BentoBox saved islands/closed its database and Paper completed chunk and region I/O for all six dimensions before exit.
- Verified stopped-state backup `backups/skyblock-20261031-040638.zip` includes all six worlds, BentoBox player/island/plugin data, SQLite, migrations, whitelist and server configuration. SHA-256: `387D0890F63BB473C0D97754B51126A1ED25D3B6FEDB229AC99C7D5D97E1FD7A`.
- Phase 4 SkyBridge was deployed with exact staged hash `255AEBC7820B8976E1B998E1D0B945A37AB073FBB1CE2DB708D72CA6C74118A4`; the former live JAR is preserved as `server/disabled/SkyBridge-phase3-live-20261031-0406.jar`.
- Post-deploy Paper startup PASS: Java 21, Paper 1.21.11 build 132, ViaVersion 5.12.2, BentoBox 3.17.0, BSkyBlock and all existing worlds/blueprints loaded; SkyBridge authenticated to the backend and explicitly reported selling DISABLED.
- Post-deploy disabled integration PASS: authenticated sale claim returned no job, challenge reward endpoint returned disabled, and database stayed at balance 50, two completed purchases/deliveries, zero sales and zero challenge progress.
- BentoBox Challenges default database import PASS: a runtime-only permission attachment granted exactly `bskyblock.admin`, `bskyblock.admin.challenges`, and `addon.admin.challenges` to `miftarosky`; no OP or wildcard was used. The supported **Import Database → default** GUI completed successfully.
- Challenges GUI PASS (player-reported and server-verified): `/island challenges` displays real requirements/rewards, and `bsbadmin challenges show` lists 62 BSkyBlock definitions across 5 challenge levels, including `bskyblock_cobblegenerator`.
- Temporary Challenges administration revocation PASS: console confirmed revocation, and SkyBridge removed the single attachment containing all three temporary nodes. No persistent permission record was created.
- Final post-deploy verification PASS: 18/18 web tests, ESLint, Next.js production build, 5/5 Java journal tests, and Gradle build.
- Live safety gate verification: `/api/sale` returns HTTP 503 and created zero sale jobs for `miftarosky`. `ENABLE_LIVE_SELLING=false`, `selling-enabled=false`, `ENABLE_LIVE_CHALLENGE_REWARDS=false`, and `challenge-rewards-enabled=false` remain explicit.

### FAIL

- No Phase 4 automated or build failures remain after correcting sale idempotency comparison to use exact material quantity rather than pack count.

### BLOCKED

- Real sale removal/credit and gameplay reward remain blocked behind disabled gates until the requested real-player failure-boundary tests are performed.

### NOT TESTED

- Real Minecraft item removal, insufficient-item release, disconnect during a sale, restart at PREPARED/APPLIED boundaries, and real inventory snapshot display.
- Two-account concurrent buy/sell behavior, full-inventory delivery, cooperative team persistence, and visitor protection.
- Actual BentoBox challenge completion, item consumption, reward delivery, repeatability, and persistence after restart.

## Phase 3 verification record — 2026-10-31

### PASS

- Player-reported: `miftarosky` joined successfully and verified `/island` plus basic island commands.
- Secure account linking API: one-time codes are random, stored only as hashes, expire after 10 minutes, are rate limited, and cannot be consumed twice. Sessions use hashed tokens and an HttpOnly cookie.
- Persistent wallet: `miftarosky` received exactly one 250-coin starting entry. The controlled purchase created exactly one -100 ledger entry and the persisted balance is 150.
- Purchase idempotency: retrying the controlled request with the same idempotency key returned the same purchase ID. Concurrent overspend and repeated-request behavior pass database integration tests.
- Offline delivery: the existing 64-cobblestone order remained `PENDING` through a web restart with zero claim attempts while the player was offline.
- Crash safety: SkyBridge writes `PREPARED` and `APPLIED` records through a forced durable journal; unresolved `PREPARED` operations are quarantined as `AMBIGUOUS`, while `APPLIED` operations are acknowledgement-only and never reapply inventory.
- SkyBridge-to-web transport was permanently corrected by pinning Java's HTTP client to HTTP/1.1 and explicitly negotiating JSON. The loaded runtime configuration and bearer authentication now pass the plugin's startup probe (`Authenticated backend connection verified`).
- SkyBridge HTTP failures now log sanitized status/error diagnostics without logging bearer secrets, claim tokens, link codes, or response bodies.
- Web verification on 2026-10-31: 7/7 Vitest tests pass, ESLint passes, and the Next.js 16.4.3 production build passes.
- Java verification on 2026-10-31: 3/3 operation-journal tests pass and `gradlew.bat clean test build` succeeds on Java 21.
- Paper remains 1.21.11 build 132 on Java 21; ViaVersion remains 5.12.2; existing vanilla and BSkyBlock world directories and BentoBox player/island records remain present after clean save/restarts.
- Item selling remains disabled in the plugin and has no enabled web transaction path.

### FAIL

- Challenges has no configured challenge definitions for BSkyBlock; `/island challenges` logged `There are no challenges set up`. The addon loads, but playable challenges do not currently work.
- Bank remains disabled because Vault is intentionally absent. This avoids introducing a competing economy provider.

### BLOCKED

- None for the completed Phase 3 purchase flow. Phase 4 live testing has separate blockers above.

### NOT TESTED

- Multiplayer cooperative team persistence and island visitor/build/container protection remain NOT TESTED until explicitly verified, regardless of prior invite/accept command entries in the log.
- Safe selling (inventory removal, wallet credit, idempotency, offline handling, and crash recovery) is NOT TESTED and remains disabled.
- Full-inventory release behavior has automated state-machine coverage but has not been verified with a real full player inventory.

## Phase 2 verification record — 2026-10-30

### PASS

- Microsoft Build of OpenJDK 21.0.13.0.2 installed through the official `Microsoft.OpenJDK.21` winget package; `java` and `javac` verified.
- Node 24.18.0 and npm 11.16.0 retained. Node 22 is not required: Prisma 6.19.0 migration deploy, client generation, seed, and live database query all pass on Node 24.
- SQLite migration `20261030203000_init` applied without deleting or replacing data. Seed verification: 6 catalog products and 3 challenge definitions.
- Official Gradle 8.14.3 wrapper generated after SHA-256 verification of the Gradle distribution.
- SkyBridge compiles and packages successfully with Java 21 using `gradlew.bat clean test build`. No Java test sources exist yet.
- Official stable Paper 1.21.11 build 132 downloaded from PaperMC's v3 service and verified against SHA-256 `5ffef465eeeb5f2a3c23a24419d97c51afd7dbb4923ff42df9a3f58bba1ccfba`.
- Paper bootstrap identifies Minecraft 1.21.11, Java 21, BentoBox 3.17.0, and SkyBridge 0.1.0-SNAPSHOT.
- Only the requested Classic SkyBlock set is staged: BSkyBlock 1.20.0, Challenges 1.8.1, Level 2.29.0, Warps 1.19.1, ControlPanel 1.16.1, Biomes 2.3.2, and Bank 1.10.1.
- Next.js 16.4.3 lint and production build pass. Live `/` returns HTTP 200; `/api/health` returns `status=ok` and `database=connected`; listener binds `0.0.0.0:3000`.
- Web and SkyBridge use matching generated local secrets; secret values are ignored by Git and were not printed.
- BentoBox 3.17.0 loads on Java 21 (class-file version 65). The incompatible supplied 3.23.4 jar is quarantined under `server/disabled/`.
- BSkyBlock enables and creates/reloads its Overworld, Nether, and End; default/classic blueprints load.
- Challenges, Level, Warps, ControlPanel, and Biomes enable. Level hooks BSkyBlock/Warps, Challenges hooks Level, and ControlPanel imports its BSkyBlock panel.
- Clean save, shutdown, and repeated restart preserve and reload the BSkyBlock worlds.
- TCP 25565 is listening with online mode, enforced whitelist, 10-player limit, and RCON/query disabled.
- Default configuration provides one concurrent island per player, teams/coops up to four, 400-block spacing, 50-block protection, Survival mode, and member-rank requirements for building and container access.
- Paper update checks, BentoBox GitHub polling, and bStats are disabled for offline-first LAN operation. Online mode remains enabled.
- ViaVersion 5.12.2 (stable) is installed from its immutable official GitHub release. Its main class is Java 17 bytecode (class-file version 61), compatible with the Java 21 runtime.
- ViaVersion loads without errors, detects native server protocol 1.21.11 (774), finishes mapping initialization, and leaves Paper/BentoBox worlds unchanged.
- A stopped-server backup including all vanilla/BSkyBlock worlds, plugins, configuration, and SQLite was created at `backups/skyblock-20261030-214459.zip` before ViaVersion installation.
- Whitelisted user `miftarosky` authenticated in online mode from a real 26.3 client and joined Paper 1.21.11 successfully. ViaVersion reported client version 26.3 at 50 PPS; movement/combat, chat messaging, and advancement packets worked without translation errors.
- No connection-throttle or ViaVersion packet-limit event occurred. Bukkit's independent reconnect throttle remains 4000 ms; ViaVersion retains its separate 800 PPS immediate and 200 PPS sustained limits.

### FAIL

- Bank 1.10.1 is present but DISABLED because Vault is absent. Vault/economy provider was intentionally not installed because it would introduce a competing economy before SkyBridge transaction safety exists.
- Supplied BentoBox 3.23.4 is Java 25 bytecode and failed on Java 21. It was replaced with verified BentoBox 3.17.0.

### BLOCKED

- Further two-player/co-op testing remains blocked until a second real account is supplied.

### NOT TESTED

- LAN firewall access from another physical device and two simultaneous real clients.
- `/island` creation, separate solo islands, team invitation/join persistence, visitor protection, `/island challenges`, Level, Warps, ControlPanel, Biomes, and Bank commands.
- MagicCobblestoneGenerator and Upgrades: not installed because compatible releases have not yet been individually verified.
- SkyBridge runtime health polling and event behavior on a fully enabled server.
- Purchases, sales, inventory mutation, and wallet mutation remain deliberately disabled pending Phase 3 safety/recovery implementation and tests.

## Compatibility decision

- [x] Target Paper 1.21.11 with Java 21. Paper's official matrix assigns Java 21 to Minecraft 1.20–1.21.11; Paper 26.1+ requires Java 25.
- [x] Pin BentoBox 3.17.0 and BSkyBlock 1.20.0. Version 3.17.0 is the newest release before BentoBox's 3.18.0 Java 25 migration and satisfies Level's BentoBox API 3.16 requirement.
- [x] Runtime-verify Level 2.29.0, Challenges 1.8.1, Warps 1.19.1, ControlPanel 1.16.1, and Biomes 2.3.2 with `/bentobox version` on Paper 1.21.11.
- [ ] Add MagicCobblestoneGenerator and Upgrades only after their individual release notes and a clean server boot pass.

The repository originally contained `paper-26.3-231.jar`; it is incompatible with the Java 21 target and is deliberately not used. Requested addon jars have now been runtime tested as recorded above.

## Phase checklist

### Phase 0 — research and plan
- [x] Inspect repository and runtime tools.
- [x] Record compatibility decision and risks.
- [x] Define architecture, game progression, economy, testing, and setup documentation.

### Phase 1 — foundation
- [x] Create project layout and Git exclusions.
- [x] Scaffold responsive Next.js application.
- [x] Add Prisma schema, migration, and seed catalog/challenges.
- [x] Scaffold Java 21/Paper SkyBridge plugin.
- [x] Add setup/start/stop/status/backup/restore scripts.
- [x] Build and lint website.
- [x] Build SkyBridge with Java 21 and the Gradle wrapper.

### Phase 2 — Minecraft runtime
- [x] Install exact Paper 1.21.11 server jar from PaperMC.
- [x] Boot and runtime-verify BentoBox, BSkyBlock, Level, Challenges, Warps, ControlPanel, and Biomes.
- [ ] Verify island creation, teams, protections, persistence, and plugin loading with two real accounts.

### Phase 3 — first working transaction
- [x] Implement one-time linking with hashed codes and rate limits.
- [x] Implement authenticated sessions and initial 250-coin wallet.
- [x] Implement durable bridge operation journal and reconciliation state machine.
- [ ] Deliver one catalog item through a tested purchase flow.

## Critical risks

1. Physical inventory changes and database commits cannot form one atomic transaction. Ambiguous crash states must enter `AMBIGUOUS`, never automatic retry.
2. Metadata is not a runtime compatibility test.
3. `online-mode=true` can require internet for fresh authentication.
4. SQLite supports one local web process here; do not run multiple Next.js writers.
