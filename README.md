# School-Project — Deploy & Package

This project is a static frontend (HTML/CSS/JS). Below are recommended steps to turn the local site into a "real" website with a domain name and automatic deploys, and notes about packaging the same code as a downloadable desktop app later.

## Quick summary
- You can host the site as a static site (GitHub Pages, Netlify, or Vercel). All of those provide HTTPS and easy domain configuration.
- If you want a downloadable desktop app that uses the exact same UI and code, wrap the built static assets with Tauri (recommended), Electron, or Neutralino later.

---

## 1) Make the repo public and push to GitHub
If your code isn't on GitHub yet, create a repo and push it. Example commands:

```bash
# from project root
git init
git add .
git commit -m "Initial commit"
# create repo on GitHub UI and then:
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Once pushed, you can use GitHub Pages, Netlify, or Vercel to serve this site.

## 2) Option A — Deploy to GitHub Pages (free)
1. Add the included GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) — it will publish the repository root to the `gh-pages` branch on push to `main`.
2. In GitHub repo Settings -> Pages, select the `gh-pages` branch as the source (if necessary).
3. If you want a custom domain, add a `CNAME` file to the repo root containing your domain (or use the repo settings UI). We've included `CNAME.example` as a placeholder.

Pros: free, simple for static sites. Cons: deploying a project-site vs user-site considerations.

## 3) Option B — Deploy to Netlify (recommended for simplicity)
1. Sign up at https://app.netlify.com and connect your GitHub repo.
2. Set the publish directory to the repo root `/` (no build command needed for static site).
3. Add your custom domain in Netlify's dashboard and follow DNS instructions (Netlify issues SSL automatically via Let's Encrypt).

Netlify also supports drag-and-drop deploy of the site folder if you prefer not to connect via Git.

## 4) Option C — Deploy to Vercel
1. Sign up at https://vercel.com and import your GitHub repo.
2. Vercel auto-detects static sites. Deploy and add your custom domain in the Vercel dashboard.

## 5) DNS & custom domain notes
- If the host asks for a CNAME: point `www` to the host's target (e.g., `your-site.netlify.app` or `cname.vercel-dns.com`).
- For apex/root domain (`example.com`) you may need A records. Netlify/Vercel provide the exact A records to add.
- After DNS propagates, enable HTTPS in the host UI (usually automatic within minutes/hours).

## 6) Desktop app packaging (later)
- Tauri: small bundles, Rust-based backend. Uses the same web assets. Recommended if you want a small final binary and good cross-platform support.
- Electron: popular, easy to set up, but larger executables and memory usage.
- Neutralino: lightweight alternative requiring minimal native code.

When you want to proceed, tell me which runtime you prefer and I will scaffold the packaging (Tauri: requires Rust toolchain installed; Electron: Node tooling).

---

## Files added to help deploy
- `.github/workflows/deploy-pages.yml` — GitHub Actions workflow to deploy to GitHub Pages when pushing `main`.
- `netlify.toml` — Netlify config (publish root and a redirect rule) for quick Netlify deploy.
- `CNAME.example` — example placeholder for a custom domain file.

---

If you want, I can:
- Create the repo on GitHub for you (you must grant access or run the GitHub create step locally).
- Connect the repo to Netlify / Vercel (you usually do this through their web UI for security reasons).
- Later: scaffold a Tauri or Electron wrapper re-using these files so the app can be downloaded and run offline.

Tell me which host you prefer (GitHub Pages / Netlify / Vercel), and whether you already own a domain and its provider — I'll take the next step and either finish the CI config or scaffold the desktop wrapper.
