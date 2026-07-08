# Health Tracker (multi-user, hosted)

## What this is
A multi-user, hosted version of your original Health Tracker with FULL feature parity plus a chat assistant.

All six original tabs are preserved exactly: Today, Day Summary, Workout, Nutrition, Progress, History. So are CSV export/import, PR timeline, weekly volume bars, weight sparkline, editable lift/macro targets and protein sources.

### What changed under the hood
- Rebuilt as a Next.js app with Supabase Auth (login/signup)
- The original `window.storage` persistence was swapped for Supabase. All your data now lives per-user in a `user_settings` JSON blob, protected by Row Level Security so no user can read another's data.
- The two AI features (meal macro estimator + day-summary parser) that used to call Claude directly from the browser now call server-side gateway routes (`/api/estimate-meal`, `/api/parse-day`) running on gpt-5.5 via your Bifrost gateway, so the API key never touches the browser.
- Added a floating chat assistant (`/api/chat`) that answers health/nutrition questions using the user's own logged data as context.

## Setup steps (do these in order)

### 1. Run the database schema
In your Supabase project dashboard → SQL Editor → New query, paste and run everything in `supabase_schema.sql`. This creates the tables and locks each one down with Row Level Security so no user can ever read another user's rows.

### 2. Install dependencies locally (optional, only if you want to test before deploying)
```
npm install
npm run dev
```
This uses `.env.local`, which already has your Supabase URL and anon key filled in. You still need to add your own Anthropic key to `.env.local` if you want to test the chat feature locally — do not commit that file (it's already in `.gitignore`).

### 3. Push to GitHub
```
git init
git add .
git commit -m "Initial multi-user health tracker"
git remote add origin https://github.com/meearnav/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 4. Deploy on Vercel
1. Go to vercel.com, sign in with GitHub
2. "Add New Project" → import the repo you just pushed
3. In the project's Environment Variables settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://wszqczysdddqrfprfoce.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the anon key you already gave me)
   - `GPT_API_KEY` = your GPT API key for the Bifrost gateway (enter this directly in Vercel, never in a file that gets committed)
   - `BIFROST_URL` = `https://gateway-buildathon.ltl.sh/v1/chat/completions`
4. Deploy

### 5. Supabase auth email settings
Since you chose open public signups: in Supabase dashboard → Authentication → URL Configuration, set your Site URL to your Vercel deployment URL once you have it, so confirmation emails link back correctly.

## Security notes
- The anon key is safe to expose in frontend code by design; Supabase's Row Level Security is what actually protects data, not key secrecy.
- The GPT API key is never exposed to the browser; it's only used inside `/pages/api/chat.js`, which runs server-side on Vercel.
- Anyone can sign up. Consider adding basic abuse protection (Supabase has rate limiting on auth endpoints by default) before sharing the link widely.
