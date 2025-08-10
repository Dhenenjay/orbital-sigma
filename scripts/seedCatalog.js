// Node script to POST AOIs and instrumentMap to Convex seed endpoint.
// Usage (PowerShell):
//   $env:SEED_SECRET={{SEED_SECRET}}
//   node .\scripts\seedCatalog.js --convexUrl https://<your-dev-deployment>.convex.cloud

const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    const v = args[i + 1];
    if (k && v) out[k.replace(/^--/, "")] = v;
  }
  return out;
}

(async () => {
  const { convexUrl } = parseArgs();
  if (!convexUrl) {
    console.error("Missing --convexUrl");
    process.exit(1);
  }
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    console.error("SEED_SECRET env var is required");
    process.exit(1);
  }

  const aoisPath = path.resolve(process.cwd(), "data", "aois.json");
  const instrPath = path.resolve(process.cwd(), "data", "instrumentMap.json");

  const aois = JSON.parse(fs.readFileSync(aoisPath, "utf-8"));
  const instrumentMap = JSON.parse(fs.readFileSync(instrPath, "utf-8"));

  const url = `${convexUrl}/seedCatalog`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-seed-secret": secret,
    },
    body: JSON.stringify({ aois, instrumentMap }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Seeding failed:", res.status, res.statusText, text);
    process.exit(1);
  }

  console.log("Seeding ok:", text);
})();

