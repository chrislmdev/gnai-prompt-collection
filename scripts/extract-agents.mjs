/**
 * Extract the AGENTS array literal from index.html and write JSON for Salesforce static resource.
 * Run from repo root: node scripts/extract-agents.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const marker = "\n    const FIELD_DEFS";
const fieldIdx = html.indexOf(marker);
if (fieldIdx < 0) throw new Error("FIELD_DEFS marker not found");
const slice = html.slice(0, fieldIdx);
const agentsKey = "const AGENTS = ";
const start = slice.lastIndexOf(agentsKey);
if (start < 0) throw new Error("AGENTS not found");
const bracket = slice.indexOf("[", start);
const arrayLiteral = slice.slice(bracket, slice.lastIndexOf("]") + 1);
// eslint-disable-next-line no-new-func
const agents = new Function(`"use strict"; return ${arrayLiteral}`)();
const out = path.join(root, "force-app", "main", "default", "staticresources", "AgentBlueprintsSeed.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(agents, null, 2), "utf8");
console.log("Wrote", out, "(" + agents.length + " blueprints)");
