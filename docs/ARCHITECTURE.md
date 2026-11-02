# Architecture

One Next.js process owns SQLite through Prisma and serves the LAN UI and authenticated API. SkyBridge runs inside Paper, polls over loopback, and never accepts arbitrary console commands. Identity is always the Minecraft UUID. Wallets are personal; BentoBox owns island membership and shared progression.

Every bridge operation has a stable UUID and durable records on both sides. The planned state flow is `PENDING -> CLAIMED -> APPLIED -> COMPLETED`. SkyBridge journals intent before touching inventory and completion afterward. A crash after physical mutation but before a durable completion marker produces `AMBIGUOUS` and requires reconciliation; automatic retry is forbidden.

Buying reserves coins and creates delivery atomically. Offline/full-inventory delivery remains pending or moves to a mailbox. Selling creates a request first; SkyBridge removes real inventory, then the backend credits once through a unique ledger idempotency key. This is not production-ready until Phase 3 failure-boundary tests pass.
