const fs = require('fs');
const path = require('path');

const srcSchema = path.join(__dirname, '../src/main/db/schema.sql');
const destDir = path.join(__dirname, '../dist-electron/main/db');
const destSchema = path.join(destDir, 'schema.sql');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcSchema)) {
  fs.copyFileSync(srcSchema, destSchema);
  console.log('✓ Copied schema.sql to dist-electron/main/db/schema.sql');
}

