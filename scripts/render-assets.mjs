import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assets = path.join(root, "store-assets");
const icons = path.join(root, "extension", "icons");

fs.mkdirSync(icons, { recursive: true });

const iconSource = path.join(assets, "icon-source.svg");
for (const size of [16, 32, 48, 128]) {
  await sharp(iconSource, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(icons, `icon-${size}.png`));
}

await sharp(iconSource, { density: 512 })
  .resize(128, 128)
  .png({ compressionLevel: 9 })
  .toFile(path.join(assets, "icon-128.png"));

const storeImages = {
  "screenshot-1": [1280, 800],
  "screenshot-2": [1280, 800],
  "small-promo-440x280": [440, 280],
  "marquee-1400x560": [1400, 560]
};

for (const [name, [width, height]] of Object.entries(storeImages)) {
  await sharp(path.join(assets, `${name}.svg`), { density: 144 })
    .resize(width, height)
    .png({ compressionLevel: 9 })
    .toFile(path.join(assets, `${name}.png`));
}

console.log("Rendered extension icons and Chrome Web Store images.");
