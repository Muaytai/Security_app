const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const dest = path.join(root, 'dist', 'sql-wasm.wasm');

try {
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('[OK] sql-wasm.wasm copied to dist/');
  }
} catch (e) {
  console.warn('[WARN] Could not copy sql-wasm.wasm:', e.message);
}
