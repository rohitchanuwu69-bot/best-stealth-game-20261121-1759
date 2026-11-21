// Hand-in program: copies game/ and screenshots/ into the output directory
// and writes dossier.json with the scorer caps. Node standard library only.
import { buildDossier } from "./vendor/makefun-game.ts";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(out, { recursive: true });
for (const name of ["game", "screenshots"]) {
  const src = join(root, name);
  const dst = join(out, name);
  rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true });
}

const dossier = await buildDossier(out, {
  text_max_bytes: 163840,
  screenshots_max_files: 4,
  screenshot_max_bytes: 262144,
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000
});
const dossierPath = join(out, "dossier.json");
writeFileSync(dossierPath, dossier);
