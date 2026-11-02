# Testing status

Updated: 2026-10-31

## PASS

- Prisma schema validation and client generation.
- Migration SQL generation from the validated schema.
- SQLite migration deploy, idempotent seed, and live database count query on Node 24.18.0.
- Next.js 16.4.3 production build and ESLint.
- Live website HTTP 200, database health endpoint, and `0.0.0.0:3000` listener.
- Java 21 compiler/runtime and Gradle wrapper execution.
- SkyBridge Java compilation, JAR packaging, and three operation-journal recovery tests.
- Paper 1.21.11 build 132 checksum and bootstrap identity.
- BentoBox 3.17.0 plus BSkyBlock, Challenges, Level, Warps, ControlPanel, and Biomes full enablement.
- BSkyBlock Overworld/Nether/End creation, clean save/shutdown, and restart reload.
- SkyBridge runtime enablement; the single controlled cobblestone delivery path is enabled, while all selling and other economy expansion remain disabled.
- ViaVersion 5.12.2 startup, Java 21 compatibility, 26.3 protocol detection, and real `miftarosky` 26.3 client login.
- Online-mode UUID authentication, whitelist enforcement, normal 50 PPS traffic, and absence of throttle/packet-limit kicks.
- Player-reported `/island` and basic island commands for `miftarosky`.
- Secure linking API, single-use code consumption, hashed session persistence, and HttpOnly session cookie.
- Persistent 250-coin starting balance, one controlled 100-coin debit, append-only ledger, and current 150-coin balance.
- Idempotent purchase retry returns the original purchase; concurrent overspend protection passes against SQLite.
- Existing 64-cobblestone order remains `PENDING` with zero claim attempts across an offline web restart.
- SkyBridge authenticated Java-to-web startup probe passes after forcing HTTP/1.1 JSON transport; secrets are not logged.
- Durable journal recovery tests: PREPARED survives restart and becomes non-retryable, APPLIED is acknowledgement-only, ACKNOWLEDGED is not retried (3/3 Java tests).
- Delivery state-machine and purchase-service suite (7/7 web tests), ESLint, TypeScript/Next.js production build, and Java Gradle build all pass on 2026-10-31.
- Existing BentoBox player and island records plus all three BSkyBlock world directories remain present after clean save/restarts.
- Selling remains disabled.
- Phase 3 database/journal reconciliation: two completed 64-cobblestone purchases, two one-attempt completed deliveries, two acknowledged journal operations, two -100 purchase ledger entries, final balance 50.
- Player-reported live result: the second 64-cobblestone purchase delivered in Minecraft and reduced the displayed wallet from 150 to 50 Coins.
- Additive Phase 4 Prisma migration deploy; existing transaction rows preserved.
- Safe sale state-machine tests: no credit before removal, PREPARED quarantine, APPLIED credit-only recovery, idempotent completion, and unmodified claim release.
- Sale database tests: unpaid idempotent job creation, refusal to credit before claim, one credit after removal, and no double credit under concurrent acknowledgements.
- Once-only gameplay challenge tests: incomplete progress pays zero; concurrent completion creates one 60-coin credit only.
- Phase 4 totals: 18/18 Vitest tests and 5/5 Java tests pass; ESLint, Next.js production build, and Gradle build pass.
- Live disabled-gate test: sale POST returns HTTP 503 and creates zero player sale jobs.
- Responsive categorized Buy, Sell, and transaction-history routes compile in the production build. Unproven buy products are visibly locked.
- Safe process identification: Paper PID 32288 command line/port ownership matched the project server; Gradle PID 3448 was excluded.
- Graceful console shutdown with one player online, complete world/island/database save, and verified process/port exit.
- Stopped-state backup content and SHA-256 verification.
- Phase 4 JAR hash match, rollback JAR preservation, clean Paper/plugin/world startup, and authenticated bridge probe.
- Post-deploy disabled integration: no sale claim, no challenge reward, no wallet/order mutation.
- Final post-deploy suite: 18/18 web tests, 5/5 Java tests, ESLint, Next.js build, and Gradle build.
- BentoBox supported `default` database import and `/island challenges` GUI: PASS. Server enumeration confirms 62 BSkyBlock challenges and 5 levels.
- Minimal temporary permission lifecycle: PASS. Exactly `bskyblock.admin`, `bskyblock.admin.challenges`, and `addon.admin.challenges` were attached at runtime and then all removed together; no OP/wildcard/persistent role.

## FAIL

- Bank 1.10.1 does not enable without Vault. This remains intentionally unresolved to avoid a second economy provider.
- BentoBox 3.23.4 does not run on Java 21; the verified replacement is 3.17.0.
- `/island challenges` has no configured challenges for BSkyBlock, so playable challenges currently fail despite the addon loading.

## BLOCKED

- Live Phase 4 inventory mutation and reward tests remain gated off pending real-player test execution.

## NOT TESTED

- Multiplayer team persistence and island visitor/build/container protection.
- Real in-game `/shop link` success after the HTTP/1.1 fix (startup authentication is verified, but the player command still needs a real player invocation).
- Full-inventory delivery release behavior.
- Selling, including inventory removal, wallet crediting, idempotency, and crash recovery.
- Live inventory snapshots and once-only Minecraft-statistic challenge rewards.
- Two-account concurrent buys/sales, disconnects, and server-restart boundary tests.
- Actual BentoBox challenge completion, requirements consumption, rewards, repeat completion rules, and restart persistence.
- LAN access from a second device and firewall rules.
- Backup restore against a live generated world.

These remain NOT TESTED until exercised on a real server.
