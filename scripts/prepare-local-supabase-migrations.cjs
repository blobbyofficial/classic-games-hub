/** Copies this repository's numbered SQL migrations to a temporary, LOCAL Supabase
 * workspace using valid 14-digit migration timestamps. Does not connect to
 * any hosted Supabase project or run SQL against a database.
 */
const fs = require("node:fs");
const path = require("node:path");

function prepareMigrations(sourceDir, destinationDir) {
  const files = fs.readdirSync(sourceDir).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  if (!files.length) throw Error("No numbered SQL migrations available");
  const seen = new Set();
  fs.mkdirSync(destinationDir, { recursive: true });
  const output = [];
  for (const file of files) {
    const version = Number(file.split("_")[0]);
    if (!Number.isSafeInteger(version) || version < 1 || version > 999999) {
      throw Error(`Invalid SQL migration version in ${file}`);
    }
    if (seen.has(version)) throw Error(`Duplicate SQL migration version ${version}`);
    seen.add(version);
    // Versions are sequence numbers, not HHMMSS timestamps. Convert their
    // elapsed seconds into a *valid* time, rather than emitting 000083 seconds.
    if (version > 86399) throw Error(`Version exceeds daily timestamp window: ${version}`);
    const hour = Math.floor(version / 3600);
    const minute = Math.floor((version % 3600) / 60);
    const second = version % 60;
    const timestamp = `20261017${[hour, minute, second].map(x => String(x).padStart(2, "0")).join("")}`;
    const destination = path.join(destinationDir, `${timestamp}_${file.replace(/^\d+_/, "")}`);
    fs.copyFileSync(path.join(sourceDir, file), destination);
    output.push(destination);
  }
  return output;
}
if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const out = prepareMigrations(path.join(root, "database/migrations"), path.join(root, "supabase/migrations"));
  console.log(`Prepared ${out.length} numbered migrations for disposable local Supabase`);
}
module.exports = { prepareMigrations };
