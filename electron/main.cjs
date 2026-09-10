const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  session,
  shell,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const isDev = !app.isPackaged;
const appIcon = path.join(__dirname, '..', 'build', 'icon.ico');
const productionEntry = path.join(__dirname, '..', 'dist', 'index.html');
const productionUrl = pathToFileURL(productionEntry).toString();
const rendererUrl = isDev ? process.env.ELECTRON_RENDERER_URL : '';
const apiKeyFileName = 'gemini-api-key';

let mainWindow = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.homoeconomicus.app');
    registerSecureStorageHandlers();
    denyRendererPermissions();
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 860,
    minHeight: 620,
    title: 'Homo Economicus',
    backgroundColor: '#f7f9f7',
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedAppUrl(url)) return;
    event.preventDefault();
    openExternalUrl(url);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(productionEntry);
  }
}

function isTrustedAppUrl(url) {
  if (rendererUrl) return url.startsWith(rendererUrl);
  return url === productionUrl || url.startsWith(`${productionUrl}#`);
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      shell.openExternal(parsed.toString());
    }
  } catch {
    // Ignore malformed or unsupported external URLs.
  }
}

function denyRendererPermissions() {
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}

function registerSecureStorageHandlers() {
  ipcMain.handle('secure-api-key:get', () => {
    const keyPath = getApiKeyPath();
    if (!fs.existsSync(keyPath)) return '';
    ensureEncryptionAvailable();

    const encrypted = Buffer.from(fs.readFileSync(keyPath, 'utf8'), 'base64');
    return safeStorage.decryptString(encrypted);
  });

  ipcMain.handle('secure-api-key:set', (_event, key) => {
    if (typeof key !== 'string' || !key.trim() || key.length > 1024) {
      throw new Error('Invalid Gemini API key.');
    }
    ensureEncryptionAvailable();

    const encrypted = safeStorage.encryptString(key.trim());
    fs.writeFileSync(getApiKeyPath(), encrypted.toString('base64'), {
      encoding: 'utf8',
      mode: 0o600,
    });
    return true;
  });

  ipcMain.handle('secure-api-key:clear', () => {
    const keyPath = getApiKeyPath();
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
    return true;
  });
}

function getApiKeyPath() {
  return path.join(app.getPath('userData'), apiKeyFileName);
}

function ensureEncryptionAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Windows secure storage is not available on this device.');
  }
}
