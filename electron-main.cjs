const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

function startBackendServer() {
  const serverPath = path.join(__dirname, 'dist', 'server.cjs');
  
  serverProcess = spawn(process.execPath, [serverPath], {
    env: { ...process.env, NODE_ENV: 'production', PORT: SERVER_PORT.toString() },
    stdio: 'inherit',
    windowsHide: true
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start internal server:', err);
  });
}

function checkServerReady(retries = 30, delay = 300) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve(true);
        }
      }).on('error', () => {
        if (count >= retries) {
          clearInterval(interval);
          reject(new Error('Server readiness check timeout'));
        }
      });
    }, delay);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Система проверки знаний по технике безопасности и охране труда',
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    await checkServerReady();
    await mainWindow.loadURL(SERVER_URL);
    mainWindow.show();
  } catch (err) {
    console.error('Error connecting to backend:', err);
    // Fallback direct load attempt
    mainWindow.loadURL(SERVER_URL);
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (_) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
