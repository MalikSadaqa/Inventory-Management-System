# Deploying to production

Target setup: one Hetzner Cloud server running `docker-compose.prod.yml`, reachable at
**https://portal.chocolate-design.com** through a Cloudflare Tunnel, with Cloudflare Access
allowing only approved email addresses.

```
browser ──HTTPS──> Cloudflare (Access login) ──tunnel──> cloudflared ──> nginx (frontend)
                                                                           ├── /      React app
                                                                           └── /api/  backend ──> postgres
```

The server accepts no incoming web traffic: `cloudflared` connects out to Cloudflare, so the
only open port is SSH. HTTPS certificates are handled by Cloudflare.

Cloudflare's dashboard is reorganized from time to time; if a menu name below has moved, the
same settings exist under a nearby name.

---

## 1. Create the server (Hetzner Cloud)

1. In the [Hetzner Cloud Console](https://console.hetzner.cloud), create a project, then **Add Server**:
   - **Location:** closest to your users (e.g. Falkenstein or Nuremberg for Europe / Middle East).
   - **Image:** Ubuntu 24.04.
   - **Type:** a shared-vCPU plan with **2 vCPU / 4 GB RAM** or more. 2 GB is the minimum; builds struggle below that.
   - **SSH key:** add your public key (`cat ~/.ssh/id_ed25519.pub` on your Mac; create one with `ssh-keygen -t ed25519` if needed).
   - **Backups:** enable. This snapshots the whole server daily and is your safety net beyond the database dumps.
2. Create a **Firewall** and attach it to the server, with a single inbound rule: **TCP 22** (SSH),
   ideally only from your own IP. No other inbound ports are needed.
3. Note the server's IP address and connect:
   ```
   ssh root@<server-ip>
   ```

## 2. Install Docker and get the code

On the server:

```
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```

The repository is private, so give the server read-only access with a deploy key:

```
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
cat ~/.ssh/github_deploy.pub
```

On GitHub: repository **Settings → Deploy keys → Add deploy key**, paste the key, leave
"Allow write access" **off**. Then on the server:

```
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_deploy
EOF
git clone git@github.com:MalikSadaqa/Inventory-Management-System.git /opt/portal
cd /opt/portal
```

## 3. Restrict access with Cloudflare Access (do this before going live)

Set this up first so the portal is never reachable without a login.

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com) (first visit asks you to pick a team name and the free plan).
2. **Settings → Authentication → Login methods:** make sure **One-time PIN** is enabled
   (users get a code by email; no passwords to manage).
3. **Access → Applications → Add an application → Self-hosted:**
   - **Application name:** Portal
   - **Domain:** `portal.chocolate-design.com`
   - **Policy:** name it "Staff", action **Allow**, include **Emails**, and list each allowed address.
4. Save. To add or remove someone later, edit this policy; no redeploy needed.

## 4. Create the Cloudflare Tunnel

1. Zero Trust → **Networks → Tunnels → Create a tunnel** → type **Cloudflared** → name it `portal`.
2. On the install step choose **Docker**. The shown command ends with `--token <long token>`;
   copy **only the token**. Don't run the command (Compose runs cloudflared for you).
3. Add a **public hostname** (route) for the tunnel:
   - **Subdomain:** `portal`, **Domain:** `chocolate-design.com`
   - **Service type:** `HTTP`, **URL:** `frontend:80`
4. Save. Cloudflare creates the DNS record automatically.

## 5. Configure and start

On the server, in `/opt/portal`:

```
cp .env.prod.example .env
openssl rand -base64 32 | tr -d '/+='     # use the output as POSTGRES_PASSWORD
nano .env                                  # set APP_DOMAIN, POSTGRES_PASSWORD, CLOUDFLARE_TUNNEL_TOKEN
chmod 600 .env
docker compose -f docker-compose.prod.yml up -d --build
```

Check it:

```
docker compose -f docker-compose.prod.yml ps        # all services "Up", postgres "healthy"
docker compose -f docker-compose.prod.yml logs -f cloudflared   # look for "Registered tunnel connection"
```

Open https://portal.chocolate-design.com: you should get the Cloudflare login, then the app.
The API docs are at https://portal.chocolate-design.com/api/docs.

> Keep `POSTGRES_PASSWORD` safe and don't change it after the first start: Postgres stores it
> when the database is created, so a later change in `.env` locks the backend out.

## Updating to a new version

```
cd /opt/portal
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The database volume is kept across updates. The backup service restarts too, so every update
also takes a fresh database dump first.

> **Schema changes need care once real data exists.** Tables are created with `create_all`,
> which only creates *missing* tables; it never alters existing ones. Before deploying a change
> to the models (new column, changed constraint), add a migration step (Alembic) rather than
> resetting the database.

## Backups

The `db-backup` service writes a compressed dump to `/opt/portal/backups/` when it starts and
then every 24 hours, keeping 14 days.

- **Copy them off the server** regularly (e.g. `scp root@<server-ip>:/opt/portal/backups/*.gz .`
  or a Hetzner Storage Box). A backup on the same disk doesn't survive losing the server.
- **Take one manually** (e.g. before risky changes):
  ```
  docker compose -f docker-compose.prod.yml exec -T postgres \
    sh -c 'pg_dump -U "$POSTGRES_USER" --no-owner "$POSTGRES_DB"' | gzip > backups/manual-$(date +%Y%m%d-%H%M).sql.gz
  ```
- **Restore** a dump (replaces all current data; stop the backend first so nothing writes meanwhile):
  ```
  docker compose -f docker-compose.prod.yml stop backend
  docker compose -f docker-compose.prod.yml exec -T postgres \
    sh -c 'dropdb -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
  gunzip -c backups/<file>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres \
    sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
  docker compose -f docker-compose.prod.yml start backend
  ```

## Troubleshooting

| Symptom | Check |
|---|---|
| Cloudflare error page ("Bad gateway", 502) | `logs frontend` / `logs backend`; is the tunnel route URL exactly `frontend:80`? |
| Tunnel not connecting | `logs cloudflared`; usually a wrong or truncated `CLOUDFLARE_TUNNEL_TOKEN` |
| App loads but shows "Request failed" | `logs backend`; database health with `ps` |
| No login screen | The Access application's domain must match the tunnel hostname exactly |

All `logs`/`ps` commands are `docker compose -f docker-compose.prod.yml <command> <service>`.
