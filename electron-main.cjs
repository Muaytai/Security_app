const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

function startBackendServer() {
  try {
    process.env.NODE_ENV = 'production';
    process.env.PORT = SERVER_PORT.toString();
    // Directly require the bundled server in the Electron background environment
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    require(serverPath);
    console.log('Backend server initialized successfully.');
  } catch (err) {
    console.error('Failed to load internal server:', err);
  }
}

function checkServerReady(retries = 40, delay = 250) {
  return new Promise((resolve) => {
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
          resolve(false);
        }
      });
    }, delay);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
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

  await checkServerReady();
  await mainWindow.loadURL(SERVER_URL);
  mainWindow.show();

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
