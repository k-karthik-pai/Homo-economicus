import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedTarget = process.argv[2] || '--win';
const allowedTargets = new Set(['--dir', '--win']);

if (!allowedTargets.has(requestedTarget)) {
  console.error(`Unsupported desktop build target: ${requestedTarget}`);
  process.exit(1);
}

const targetName = requestedTarget.replace(/^--/, '');
const tempOutput = path.join(tmpdir(), `homo-economicus-${targetName}-build`);
const releaseOutput = path.join(repoRoot, 'release');

runNodeScript(path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), ['build']);

if (existsSync(tempOutput)) rmSync(tempOutput, { recursive: true, force: true });
mkdirSync(tempOutput, { recursive: true });

const builderArgs = [];
if (requestedTarget) builderArgs.push(requestedTarget);
const localElectronDist = findLocalElectronDist();
if (localElectronDist) {
  console.log(`Using local Electron runtime: ${localElectronDist}`);
  builderArgs.push(`--config.electronDist=${localElectronDist}`);
}
builderArgs.push(`--config.directories.output=${tempOutput}`, '--publish=never');

runNodeScript(path.join(repoRoot, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'), builderArgs, {
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
});

if (existsSync(releaseOutput)) rmSync(releaseOutput, { recursive: true, force: true });
mkdirSync(releaseOutput, { recursive: true });
cpSync(tempOutput, releaseOutput, { recursive: true });

console.log(`Desktop artifacts copied to ${releaseOutput}`);

function findLocalElectronDist() {
  const installedDist = path.join(repoRoot, 'node_modules', 'electron', 'dist');
  if (existsSync(installedDist)) return installedDist;

  const electronPackagePath = path.join(repoRoot, 'node_modules', 'electron', 'package.json');
  if (!existsSync(electronPackagePath) || process.platform !== 'win32') return null;

  const electronVersion = JSON.parse(readFileSync(electronPackagePath, 'utf8')).version;
  const zipName = `electron-v${electronVersion}-win32-${process.arch}.zip`;
  const cacheRoots = [
    process.env.ELECTRON_CACHE,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'electron', 'Cache'),
  ].filter(Boolean);

  for (const cacheRoot of cacheRoots) {
    if (!existsSync(cacheRoot)) continue;

    const directZip = path.join(cacheRoot, zipName);
    if (existsSync(directZip)) return directZip;

    for (const entry of readdirSync(cacheRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const nestedZip = path.join(cacheRoot, entry.name, zipName);
      if (existsSync(nestedZip)) return nestedZip;
    }
  }

  return null;
}

function runNodeScript(scriptPath, args, env = {}) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
