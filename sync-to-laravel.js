import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');
const publicDir = path.resolve(__dirname, '../public');
const frontendDir = path.resolve(__dirname, '../frontend');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const item of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanOldAssets(targetAssetsDir, currentAssetNames) {
  if (!fs.existsSync(targetAssetsDir)) return;
  for (const file of fs.readdirSync(targetAssetsDir)) {
    if (/^index-.*\.(js|css)(\.map)?$/.test(file)) {
      if (!currentAssetNames.has(file)) {
        try {
          fs.unlinkSync(path.join(targetAssetsDir, file));
          console.log(`[Auto-Sync] Cleaned old asset: ${file}`);
        } catch (e) {}
      }
    }
  }
}

export function syncToLaravel() {
  if (!fs.existsSync(distDir)) {
    console.warn('[Auto-Sync] dist directory not found, skipping sync.');
    return;
  }

  const distAssetsDir = path.join(distDir, 'assets');
  const currentAssets = new Set(
    fs.existsSync(distAssetsDir) ? fs.readdirSync(distAssetsDir) : []
  );

  cleanOldAssets(path.join(publicDir, 'assets'), currentAssets);
  cleanOldAssets(path.join(frontendDir, 'assets'), currentAssets);

  copyRecursiveSync(distDir, publicDir);
  copyRecursiveSync(distDir, frontendDir);

  console.log(
    '\x1b[32m%s\x1b[0m',
    '✓ [Auto-Sync] Successfully copied React build to Laravel public/ and frontend/!'
  );
}

// Run immediately when executed directly
if (process.argv[1] === __filename) {
  syncToLaravel();
}
