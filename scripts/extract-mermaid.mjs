import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const files = process.argv.slice(2);
const outputDir = "output/mermaid";

if (files.length === 0) {
  console.error("Usage: node scripts/extract-mermaid.mjs <markdown files...>");
  process.exit(1);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

let count = 0;

for (const file of files) {
  const markdown = readFileSync(file, "utf8");
  const blocks = markdown.matchAll(/```mermaid\n([\s\S]*?)```/g);
  let index = 0;

  for (const block of blocks) {
    index += 1;
    count += 1;
    const prefix = file.replace(/\.md$/u, "").replace(/[\\/]/gu, "__");
    const name = `${prefix}-${String(index).padStart(2, "0")}.mmd`;
    writeFileSync(join(outputDir, name), `${block[1].trim()}\n`);
  }
}

console.log(`Extracted ${count} Mermaid diagrams to ${outputDir}`);
