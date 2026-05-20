# Publish to GitHub as `chessreview`

The code is committed locally but **not on GitHub yet** until you authenticate once.

## Option A — GitHub CLI (recommended)

Run in your terminal (interactive):

```bash
cd /home/shwetank/CascadeProjects/chess-review

# Log in (browser opens)
/tmp/gh_2.67.0_linux_amd64/bin/gh auth login

# Create public repo chessreview and push
GH_BIN=/tmp/gh_2.67.0_linux_amd64/bin/gh ./scripts/github-push.sh chessreview
```

Your repo will be: `https://github.com/<your-username>/chessreview`

## Option B — SSH (no gh login)

1. Add this SSH key: https://github.com/settings/ssh/new  

   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBbwTw5EkwAhz8Bg/oZfgyZMYaXiM5hS/u44Fi19SC8D setu.dhyani@gmail.com
   ```

2. Create an **empty** repo named `chessreview` (no README): https://github.com/new  

3. Replace `YOUR_USERNAME` and push:

```bash
cd /home/shwetank/CascadeProjects/chess-review
git remote add origin git@github.com:YOUR_USERNAME/chessreview.git
git push -u origin main
```

## Vercel

Import `chessreview` at https://vercel.com/new — framework **Vite**, optional env `VITE_GEMINI_API_KEY`.
