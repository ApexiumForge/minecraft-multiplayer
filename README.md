# SKYBLOCK LAN

Private LAN-only Minecraft SkyBlock with a real Paper plugin, BentoBox islands, a Next.js companion shop, and a transaction-safe SQLite ledger.

Phase 0 research and Phase 1 foundation are implemented. The web application and Prisma schema build locally. SkyBridge is scaffolded, but cannot be compiled on this machine until a Java 21 JDK is installed. No Minecraft integration test has been claimed.

Start with [docs/SETUP.md](docs/SETUP.md), then review [docs/PLAN.md](docs/PLAN.md).

Never port-forward ports 25565 or 3000. Never commit `.env`, databases, worlds, server jars, or bridge secrets. The existing Paper 26.3 jar outside this project is not copied: Paper 26.3 requires Java 25, while this project pins Paper 1.21.11 and Java 21.
