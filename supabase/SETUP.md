# Review stats (no Supabase needed)

Store review counts on your **Oracle engine server** in a simple JSON file.

## How it works

```
chessreview.org finishes a review
        ↓
POST to your engine server (same tunnel as Stockfish)
        ↓
~/chessreview/data/review-stats.json  (count + last 500 events)
        ↓
Clock counter + /admin read from there
```

No Supabase, no Google Cloud SQL, no new accounts.

---

## On your Oracle VM (`chessreview-org`)

### 1. Pull latest code

```bash
cd ~/chessreview
git pull
```

### 2. Add to the env file **systemd actually loads**

`~/chessreview/.env` is only read when you start the server manually. **systemd uses its own file.**

Check which file:

```bash
sudo systemctl cat chessreview-engine | grep EnvironmentFile
```

Usually `/etc/chessreview/engine.env`. Add both lines there:

```bash
sudo nano /etc/chessreview/engine.env
```

```bash
# Use plain password in .env — Node re-reads it (systemd mangles leading $).
STATS_REVIEWS_BASELINE=120
ADMIN_SECRET=your-password-here
```

Also keep them in `~/chessreview/.env` if you run manually sometimes.

**No quotes** around the password. Restart (not Vercel redeploy):

```bash
sudo systemctl restart chessreview-engine
```

Test:

```bash
curl -s -H "X-Admin-Key: your-real-password-here" http://127.0.0.1:8765/stats/admin
```

---

## On Vercel (optional but helps admin + country)

Add the **same tunnel URL** you use for Stockfish:

| Key | Value |
|-----|--------|
| `EVAL_SERVER_URL` | `https://your-tunnel.trycloudflare.com` |
| `ADMIN_SECRET` | same password as on the VM |
| `STATS_REVIEWS_BASELINE` | optional if only set on VM |

`VITE_EVAL_SERVER_URL` is already set for analysis — add `EVAL_SERVER_URL` with the same value so Vercel APIs can proxy stats.

Redeploy after changing env vars.

---

## URLs

| What | URL |
|------|-----|
| Live count (public) | `https://your-tunnel.trycloudflare.com/stats` |
| Admin dashboard | https://chessreview.org/admin |
| Raw data file | `~/chessreview/data/review-stats.json` on VM |

---

## Supabase

**Optional legacy path** — you can ignore it. File storage on your server is the default now.
