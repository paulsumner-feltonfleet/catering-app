/**
 * One-off: bulk-upload `scripts/seed/items.json` into Firestore's
 * `items` collection. Run AFTER you have:
 *  - Created a Firebase project
 *  - Generated a service-account JSON (Project settings → Service accounts → Generate key)
 *  - Saved it as `service-account.json` in the project root (gitignored)
 *
 * Run: npm run upload-seed
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin: typeof import("firebase-admin") = require("firebase-admin");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SEED_PATH = resolve(ROOT, "scripts/seed/items.json");
const KEY_PATH = resolve(ROOT, "service-account.json");

type SeedItem = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  category: string;
  subcategory?: string;
  code?: string;
  sortOrder: number;
  archived: boolean;
};

async function main() {
  const serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();

  const items: SeedItem[] = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  console.log(`Uploading ${items.length} items to Firestore...`);

  // Firestore batch limit is 500 ops; chunk to be safe.
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const item of slice) {
      const ref = db.collection("items").doc(item.id);
      batch.set(ref, {
        ...item,
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
    written += slice.length;
    console.log(`  ${written}/${items.length}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
