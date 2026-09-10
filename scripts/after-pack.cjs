const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const stockFiles = [
    path.join(context.appOutDir, 'version'),
    path.join(context.appOutDir, 'resources', 'default_app.asar'),
  ];

  for (const file of stockFiles) {
    fs.rmSync(file, { force: true });
  }
};
