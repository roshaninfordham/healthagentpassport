import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const inputDir = "output/mermaid";
const files = readdirSync(inputDir)
  .filter((file) => file.endsWith(".mmd"))
  .sort();

for (const file of files) {
  const input = join(inputDir, file);
  const output = input.replace(/\.mmd$/u, ".svg");
  console.log(`Rendering ${input}`);

  const result = spawnSync(
    "npx",
    ["-y", "@mermaid-js/mermaid-cli", "-i", input, "-o", output, "-b", "transparent"],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Rendered ${files.length} Mermaid diagrams.`);

