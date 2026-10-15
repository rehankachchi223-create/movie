# Deployment Guide: CinePulse Movie Discovery Platform

This guide explains how to deploy the **CinePulse** Movie Recommendation Platform to **GitHub & GitHub Pages**, as well as hosting the backend API if needed.

---

## 1. Frontend Deployment (GitHub Pages)

The frontend is built with React 19, Vite, and Tailwind CSS. It communicates directly with TMDB and Firebase with in-memory caching fallbacks, meaning it can run completely standalone as a static web app.

### Step 1: Enable GitHub Pages in your Repository
1. Go to your repository on GitHub: `https://github.com/<your-username>/<your-repo-name>`.
2. Navigate to **Settings** > **Pages** (under the "Code and automation" section).
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.

### Step 2: Add Repository Secrets (Recommended)
To provide your live TMDB and Firebase credentials during the automated build:
1. In your GitHub repo, go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** and add the following keys:
   - `VITE_TMDB_API_KEY`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

*(Note: Even if secrets are not set immediately, fallback movie data and in-memory stores allow the app to run).*

### Step 3: Push to GitHub
Commit and push your changes to `master` (or `main`):
```bash
git add .
git commit -m "feat: complete deployment readiness setup for GitHub Pages"
git push origin master
```

### Step 4: Verify Deployment
1. Go to the **Actions** tab in your GitHub repository.
2. You will see the **Deploy Frontend to GitHub Pages** workflow running.
3. Once finished, your site will be live at:
   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```

---

## 2. Technical Safeguards Included

The project has been configured with the following production safeguards:
1. **Root `.gitignore`**: Protects database files (`*.db`), secrets (`.env`), and cache from being accidentally committed.
2. **Relative Base Path (`base: './'`)**: Assets load properly under any repository subpath without blank screens.
3. **`HashRouter` Integration**: Prevents 404 errors when refreshing or opening direct movie links on static web hosting.
4. **Branded Metadata**: Updated `index.html` with title, OpenGraph tags, and mobile responsive headers.

---

## 3. Backend Deployment (Optional: Render / Railway / Fly.io)

If you wish to host the Python FastAPI backend in production:
1. **Render.com**:
   - Create a new **Web Service**.
   - Connect your GitHub repository.
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt && alembic upgrade head`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2. **Docker**:
   - A production [Dockerfile](file:///backend/Dockerfile) is provided in `backend/` for containerized hosting.
