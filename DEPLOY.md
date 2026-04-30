# Going live — step by step

About 45 minutes start to finish. Do them in order.

## 1. Install the CLI tools (one-time, 2 min)

In a terminal, anywhere:

```bash
npm install -g firebase-tools netlify-cli
```

## 2. Create the Firebase project (5 min)

1. Open <https://console.firebase.google.com> — sign in with your Google account.
2. **Add project** → name it `catering-feltonfleet` → Continue.
3. Google Analytics: **disable** → Create project.
4. Wait for it to finish, then **Continue**.

Now in the project, set up three things:

### 2a. Firestore database
- Left menu → **Build → Firestore Database → Create database**.
- **Production mode** → Next.
- Location: `europe-west2` (London). Enable.

### 2b. Google sign-in
- Left menu → **Build → Authentication → Get started**.
- **Sign-in method** tab → click **Google** → toggle **Enable**.
- Project support email: `paul.sumner@feltonfleet.co.uk`. **Save**.

### 2c. Web app config
- Top-left gear icon → **Project settings**.
- Scroll to **Your apps** → click the **`</>`** (Web) icon.
- App nickname: `catering` → **don't tick** Firebase Hosting → **Register app**.
- A snippet appears with `const firebaseConfig = { ... }`. **Keep this tab open** — you'll copy values from it next.

## 3. Local Firebase config (2 min)

In this project folder:

```bash
cp .env.example .env.local
```

Open `.env.local` and paste the values from the Firebase snippet:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=catering-feltonfleet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catering-feltonfleet
VITE_FIREBASE_STORAGE_BUCKET=catering-feltonfleet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234:web:abc
```

Save. (`.env.local` is already gitignored.)

## 4. Test that auth works locally (2 min)

```bash
npm run dev
```

Open <http://localhost:5173>. The **"Demo"** badge in the top-left should be **gone**, and you'll see the Google sign-in screen. Sign in with `paul.sumner@feltonfleet.co.uk`.

After signing in you'll see an error card saying the database is blocking access — that's expected: production-mode Firestore denies *all* reads until we deploy our rules in step 5. Auth itself works, which is what this step verifies.

Leave the server running.

## 5. Deploy the security rules (3 min)

Without this the app can't read or write anything.

```bash
firebase login
firebase use --add
```

Pick `catering-4ac98` from the list. Alias: `default` (just press Enter).

```bash
firebase deploy --only firestore:rules
```

You should see `✔ Deploy complete!`.

This locks the database to **catering@feltonfleet.co.uk** and **paul.sumner@feltonfleet.co.uk** only.

Refresh <http://localhost:5173> — you should now see the "Start the week ending …" prompt. The Items page will be empty until step 6.

## 6. Upload the items to Firestore (3 min)

The 624 items are in `scripts/seed/items.json`. To push them:

1. Firebase console → gear icon → **Project settings → Service accounts** tab → **Generate new private key** → **Generate key**. A `.json` file downloads.
2. Rename it to **`service-account.json`** and move it into this project folder (next to `package.json`).
3. Run:
   ```bash
   npm run upload-seed
   ```
   You should see counts up to `624/624` then `Done.`
4. **Delete `service-account.json`** — it's a private key, never commit it. (It's gitignored, but better to remove it from your machine when done.)

Refresh <http://localhost:5173> — all 624 items should now appear on the **Items** page.

## 7. Push the code to GitHub (5 min)

If this folder isn't a git repo yet:

```bash
git init
git add .
git commit -m "Initial catering app"
```

Then create a **private** repo at <https://github.com/new>:
- Repository name: `catering-app`
- Private
- Don't tick any "Add a README/license/.gitignore" boxes.
- Create.

Follow the lines GitHub shows under **"…push an existing repository"**:

```bash
git remote add origin https://github.com/<your-username>/catering-app.git
git branch -M main
git push -u origin main
```

## 8. Connect Netlify (10 min)

1. <https://app.netlify.com> → **Log in** with GitHub.
2. **Add new site → Import an existing project → Deploy with GitHub** → authorise → pick `catering-app`.
3. Build settings auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Before clicking Deploy**, click **Add environment variables → New variable** and add **all six** (use the same values as your `.env.local`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Click **Deploy catering-app**. Wait 1–2 minutes. You'll get a URL like
   `https://lustrous-tiramisu-1234.netlify.app`.

Optional: rename it. **Site configuration → Change site name** → e.g.
`catering-feltonfleet` → URL becomes `catering-feltonfleet.netlify.app`.

## 9. Whitelist the Netlify domain in Firebase (1 min)

Without this, Google sign-in will fail on the live URL.

1. Firebase console → **Authentication → Settings** tab → **Authorised
   domains**.
2. **Add domain** → paste your Netlify URL **without** `https://`, e.g.
   `catering-feltonfleet.netlify.app` → Add.

## 10. Live test (3 min)

1. Open the Netlify URL in Chrome.
2. Sign in with `catering@feltonfleet.co.uk` → should see all 624 items.
3. Sign out, sign in with any other Google account → should be politely
   rejected.
4. Sign back in as the catering account, enter a couple of quantities, refresh
   the page → they should persist.

Done. Send the URL to the catering team.

---

## When something goes wrong

- **Sign-in fails on the live URL** → step 9 wasn't done, or the domain is
  wrong (check for typos, no `https://`).
- **App loads but everything errors with "permission-denied"** → step 6
  wasn't run, or you're signed in as the wrong account.
- **Netlify build fails** → an env var in step 8 is missing or has a typo. The
  most-often-missed one is `VITE_FIREBASE_APP_ID`.
- **`firebase use --add` says no projects found** → you're logged in as the
  wrong Google account. Run `firebase logout` then `firebase login` again.
- **`npm run upload-seed` errors with "permission denied"** →
  `service-account.json` is missing, has the wrong name, or is in the wrong
  folder.

## Updating the app later

Once everything's wired up:

- Code changes: `git push` and Netlify rebuilds automatically (~1 min).
- Items list / prices: edit them in the app's **Items** page — no redeploy
  needed.
- Allowlist of users: edit `firestore.rules` AND `src/types.ts`
  (`ALLOWED_EMAILS`), then `firebase deploy --only firestore:rules` and
  `git push`.
