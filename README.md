# Catering — Weekly Orders

A small web app for the school catering team to record weekly stock orders.
Replaces the multi-tab Excel workbook (`22.4.26.xlsx`) with a single hosted app
that keeps a master item list, lets the user enter quantities for the current
week, and shows live totals that can never break.

**Stack**: React + TypeScript + Vite, Tailwind CSS, Firebase (Auth + Firestore),
hosted on Netlify.

---

## Demo mode (run it locally with no setup)

The app ships with a demo mode that uses the existing items extracted from the
spreadsheet and stores everything in your browser. No Firebase or sign-in
needed.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. You'll see a "Demo" badge in the header and be
auto-signed-in as a fake demo user. Data is saved to `localStorage` so a
refresh keeps it. Clear it via your browser's site data tools.

---

## Running it for real (with Firebase + Google sign-in)

### 1. Create the Firebase project (Paul does this once)

1. Go to <https://console.firebase.google.com> → **Add project**.
2. Project name: `catering-feltonfleet` (or anything).
3. Disable Google Analytics if it asks — not needed.
4. Once created, in the project dashboard:
   - **Build → Firestore Database → Create database** → start in
     **production mode**, location `eur3` or `europe-west2`.
   - **Build → Authentication → Get started → Sign-in method → Google** →
     enable. Set support email to your address. Save.
5. Add a web app:
   - Project settings (gear icon) → **Your apps → Add app → Web** (`</>`).
   - Nickname: `catering-app`. **Don't** tick Firebase Hosting (we use Netlify).
   - Copy the `firebaseConfig` snippet that appears.

### 2. Local config

Create `.env.local` from `.env.example` and paste the values from the snippet:

```env
VITE_FIREBASE_API_KEY=AIza…
VITE_FIREBASE_AUTH_DOMAIN=catering-feltonfleet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=catering-feltonfleet
VITE_FIREBASE_STORAGE_BUCKET=catering-feltonfleet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=1:…:web:…
```

Run `npm run dev` again — the "Demo" badge should disappear and you'll see
the Google sign-in screen.

### 3. Seed the items list to Firestore (one-off)

The 624 items extracted from `22.4.26.xlsx` are in `scripts/seed/items.json`.
Re-generate any time with `npm run import-spreadsheet`.

To upload them to Firestore:

1. Firebase console → **Project settings → Service accounts → Generate new
   private key**. Save the downloaded JSON as **`service-account.json`** in
   the project root (it's gitignored).
2. Run:

   ```bash
   npm run upload-seed
   ```

3. Delete `service-account.json` after — we don't need it again.

### 4. Deploy security rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add catering-feltonfleet
firebase deploy --only firestore:rules
```

The rules in `firestore.rules` lock the database to two emails:
- `catering@feltonfleet.co.uk`
- `paul.sumner@feltonfleet.co.uk`

To change the allowlist, edit both `firestore.rules` and
`src/types.ts` (`ALLOWED_EMAILS`), then re-deploy and rebuild.

### 5. Deploy to Netlify

```bash
npm install -g netlify-cli
netlify login
netlify init        # link to a new or existing site
netlify env:set VITE_FIREBASE_API_KEY "AIza…"
# …repeat for each VITE_FIREBASE_* variable…
netlify deploy --prod
```

Or push to GitHub and connect the repo from the Netlify dashboard — set the
six `VITE_FIREBASE_*` env vars under **Site settings → Environment
variables**, then trigger a deploy.

### 6. Add the Netlify origin to Firebase Auth

Firebase console → **Authentication → Settings → Authorised domains → Add
domain** → paste your Netlify URL (e.g.
`catering-feltonfleet.netlify.app`). Without this, Google sign-in fails on
the live site.

### 7. Test

Visit the deployed URL, sign in with `catering@feltonfleet.co.uk` (or
`paul.sumner@feltonfleet.co.uk`). You should see the items, the start-of-week
prompt, etc. Try with any other Google account — you should be politely
rejected.

---

## Architecture

```
src/
  auth/             Google sign-in + email allowlist
  components/       UI building blocks (TopNav, Modal, ItemForm)
  lib/
    db.ts           Firestore reads/writes (with demo-mode fallback)
    week.ts         Week creation, cloning, totals
    money.ts        GBP formatting
    utils.ts        Date helpers, debounce, cn
  pages/
    ThisWeek.tsx    Daily driver — sidebar + items + live totals + autosave
    PastWeeks.tsx   List of past weeks
    WeekView.tsx    Read-only past-week view + "copy to current week"
    Items.tsx       Master list — add/edit/archive
  firebase.ts       Firebase init (no-op if env vars missing → demo mode)
  types.ts          Item, Week, allowlist, category order

scripts/
  import-spreadsheet.ts   xlsx → seed JSON
  upload-seed.ts          seed JSON → Firestore (Admin SDK)
  seed/items.json         624 items from 22.4.26.xlsx
```

### Data model

**`items` collection** — master list (one doc per item). Edits here apply to
*future* weeks only.

**`weeks` collection** — one doc per week, ID is the week-ending date
(`2026-05-03`). Each week stores a snapshot of every item's name, unit and
price at the time, so past weeks always show the figures that were live when
the order was placed. This mirrors how the spreadsheet duplicates the file
each week, but without the manual copying.

### Why "demo mode"?

Firebase requires an account, project, and credentials. So the app falls
back to localStorage when `VITE_FIREBASE_API_KEY` is empty — useful for
preview, testing UI changes, and giving someone a feel for the app without
giving them real data access.

---

## Open questions / v2

Pending feedback from the catering team:

- **Bulk-invoice price splits** (the `=49.02/8` workaround in the
  spreadsheet) — needs a proper data model in v2 if it's a real workflow.
- **What the totals are actually for** — supplier ordering vs budget
  reporting vs reconciliation — drives PDF/CSV export decisions.
- **Allergens, dietary tracking, supplier contacts, budgets per category** —
  none of these are in v1; trivial to add if they're wanted.
