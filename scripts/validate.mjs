import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const extension = path.join(root, "extension");
const manifestPath = path.join(extension, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(extension, relativePath));
}

check(manifest.manifest_version === 3, "manifest_version must be 3");
check(/^\d+\.\d+\.\d+$/.test(manifest.version), "version must use x.y.z format");
check(JSON.stringify(manifest.permissions) === JSON.stringify(["storage"]), "storage must be the only extension permission");
check(!manifest.host_permissions, "host_permissions must not be declared separately");

for (const script of manifest.content_scripts || []) {
  check(JSON.stringify(script.matches) === JSON.stringify(["https://chatgpt.com/*"]), "content scripts must match only chatgpt.com");
  for (const file of [...(script.js || []), ...(script.css || [])]) check(exists(file), `missing manifest resource: ${file}`);
}

for (const file of Object.values(manifest.icons || {})) check(exists(file), `missing icon: ${file}`);
check(exists(manifest.action?.default_popup), "missing popup HTML");

const jsFiles = [];
for (const directory of ["content", "popup"]) {
  for (const file of fs.readdirSync(path.join(extension, directory))) {
    if (file.endsWith(".js")) jsFiles.push(path.join(extension, directory, file));
  }
}

for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  check(!/\beval\s*\(|new\s+Function\s*\(/.test(source), `dynamic code execution found in ${path.relative(root, file)}`);
  check(!/https?:\/\//.test(source), `network URL found in runtime JavaScript: ${path.relative(root, file)}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${manifest.name} v${manifest.version}: Manifest V3, storage-only, chatgpt.com-only.`);
