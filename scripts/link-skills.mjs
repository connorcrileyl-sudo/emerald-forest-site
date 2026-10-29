// Makes .claude/skills/* real symlinks to .agents/skills/*.
// Git on Windows checks symlinks out as small text files holding the
// target path unless core.symlinks is on, and Claude Code then can't
// see the skills. Runs on `npm install`; safe to run again.
import {
  readdirSync,
  lstatSync,
  readFileSync,
  unlinkSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../.claude/skills/", import.meta.url));
if (!existsSync(dir)) process.exit(0);

for (const name of readdirSync(dir)) {
  const path = join(dir, name);
  if (lstatSync(path).isSymbolicLink()) continue;
  if (!lstatSync(path).isFile()) continue;
  const target = readFileSync(path, "utf8").trim();
  if (!target.startsWith("../../.agents/skills/")) continue;
  unlinkSync(path);
  try {
    symlinkSync(target, path, "dir");
    console.log(`linked .claude/skills/${name}`);
  } catch {
    // No symlink rights (Windows without Developer Mode): fall back to a
    // junction, which needs none and works the same for reading.
    symlinkSync(join(path, "..", target), path, "junction");
    console.log(`linked .claude/skills/${name} (junction)`);
  }
}
