import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const extension = path.join(root, "extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8"));
const dist = path.join(root, "dist");
const staging = path.join(dist, "package");
const zipName = `ChatTime-for-ChatGPT-v${manifest.version}.zip`;
const zipPath = path.join(dist, zipName);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.cpSync(extension, staging, { recursive: true });

execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: staging });
fs.rmSync(staging, { recursive: true, force: true });

const digest = crypto.createHash("sha256").update(fs.readFileSync(zipPath)).digest("hex");
fs.writeFileSync(path.join(dist, "SHA256SUMS.txt"), `${digest}  ${zipName}\n`);

console.log(`Built ${path.relative(root, zipPath)} (${fs.statSync(zipPath).size} bytes)`);
console.log(`SHA-256 ${digest}`);
