# Windows setup

Microsoft Build of OpenJDK 21 is installed. Node.js 24.18.0 is also verified with Prisma 6.19.0 and the web build; downgrading to Node 22 LTS is not necessary for the current project.

Paper 1.21.11 stable build 132 is pinned as `server/paper.jar`. Do not replace it with the existing Paper 26.3 jar, which requires Java 25.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
```

Copy only verified plugin jars into `server/plugins/` and addons into `server/plugins/BentoBox/addons/`. Boot BentoBox alone, stop, add BSkyBlock, then Level and Challenges individually. Check `/bentobox version` and logs after every boot.

The verified Java 21 core is BentoBox 3.17.0. Do not restore BentoBox 3.23.4 from `server/disabled`; it requires Java 25. Bank is intentionally disabled without Vault so it cannot create a conflicting economy. Add each real Java username with `whitelist add <MinecraftName>` in the server console.

Create `apps/web/.env` from `.env.example` and generate two independent random secrets. Run `.\scripts\start.ps1`. The web server binds `0.0.0.0:3000`; SkyBridge uses `http://127.0.0.1:3000`.

Keep `online-mode=true`, `white-list=true`, `server-port=25565`, and `max-players=10`. Allow TCP 25565 and 3000 only on the Windows Private profile. Scripts do not silently change firewall policy. Fresh launcher authentication can fail without internet; never silently disable online mode.
