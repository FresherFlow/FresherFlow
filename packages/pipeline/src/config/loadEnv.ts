import fs from "node:fs";
import path from "node:path";

// Standalone env loader with zero heavy imports.
//
// Keep this module free of any scraper/browser (Playwright) imports so that
// consumers which only need env loading (e.g. the pg pool used by the web app's
// ingestion routes) do not drag the whole pipeline into their bundle.
export function loadEnvSync() {
  const candidatePaths = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "../../.env"),
    path.join(process.cwd(), "../.env"),
    path.join(process.cwd(), "apps/ingestion/.env"),
    path.join(process.cwd(), "../apps/ingestion/.env"),
    path.join(process.cwd(), "../../apps/ingestion/.env"),
    path.join(process.cwd(), "scripts/job-discovery/.env"),
    path.join(process.cwd(), "scripts/search/.env"),
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, "utf8");
        for (const line of envContent.split("\n")) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || "").trim();
            if (value.startsWith('"') && value.endsWith('"'))
              value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'"))
              value = value.slice(1, -1);
            if (process.env[key] === undefined && value !== "") {
              process.env[key] = value;
            }
          }
        }
      } catch {
        // Ignore env load errors on systems where file is missing
      }
    }
  }
}

export const loadEnv = loadEnvSync;
