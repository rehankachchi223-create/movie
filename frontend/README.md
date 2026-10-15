# Movie Recommendation Platform Frontend

A React + Vite movie recommendation frontend using Firebase Authentication and Cloud Firestore.

## Features

- Cinematic dark movie-platform design
- Authentication flow with registration, login, and logout
- Home page with featured hero and movie rows
- Discover page with search, filters, sorting, and pagination
- Movie details with ratings, favorites, watchlist, and recommendations
- Personalized recommendations page
- Profile dashboard with favorites, watchlist, history, and ratings
- Responsive navigation for desktop and mobile

## Tech Stack

- React
- Vite
- Tailwind CSS
- React Router
- Firebase Authentication
- Cloud Firestore

## Setup

1. Install dependencies:
   npm install

2. Create the environment file:
   cp .env.example .env

3. Add the six Firebase web configuration values as `VITE_FIREBASE_*` entries in `.env`.

4. Start the dev server:
   npm run dev

## Production build

npm run build

## Firebase and Vercel

The active frontend uses Firebase Authentication and Cloud Firestore directly. The FastAPI/SQLAlchemy backend is legacy and is not required to run or deploy the frontend. SQLite and PostgreSQL are not used by the Vercel deployment.

1. In TMDB, create an account, open **Settings → API**, and request an API key. Use the v3 API key for the importer.
2. In Firebase Console, open **Project settings → Service accounts → Generate new private key**. Store the downloaded JSON securely outside the repository.
3. In `frontend/.env`, keep the six `VITE_FIREBASE_*` web config values and add `TMDB_API_KEY=your-v3-key` and `TMDB_MAX_PAGES=10`. Do not prefix the TMDB key with `VITE_`.
4. In PowerShell, run the importer from the `frontend` directory, setting the service-account path first:

   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\secure\movie-firebase-admin.json'
   npm run import:tmdb
   ```

   This imports popular English-language movies with US origin and their available poster/backdrop paths. Ten pages is up to 200 movies. The importer can run up to 500 pages; the frontend currently downloads the full movie collection, so avoid importing thousands until its catalog reads are paginated.
5. In Firebase Console, open **Firestore Database → Rules**, publish the repository's `firestore.rules`, then reload the site. Public clients can read catalog data; only the trusted Admin SDK importer can write movies and genres.
6. Import the repository into Vercel with `frontend` as the Root Directory. Vercel uses `npm run build` and the `dist` output. Add the six Firebase web config variables in Vercel project settings for Production, Preview, and Development, then deploy.
7. Add the deployed Vercel domain under Firebase Authentication's Authorized domains.

The service-account file and TMDB key must never be committed or uploaded to Vercel. TMDB listings are filtered to US-origin English-language movies, which is a practical approximation of Hollywood content, not a complete industry-defined catalog.

The bundled starter catalog matches the existing local SQLite database (12 movies, 13 genres); that database has no users or saved interactions. The backend folder and SQL files are retained as legacy code/data and are not part of the Firebase/Vercel runtime.
