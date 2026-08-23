const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Create log file for troubleshooting
const logPath = path.join(app.getPath('userData'), 'app-debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch (_) {}
  console.log(msg);
}

log(`Starting SafetyTestPro Electron main process. UserData: ${app.getPath('userData')}`);

async function startBackendServer() {
  try {
    process.env.NODE_ENV = 'production';
    process.env.PORT = SERVER_PORT.toString();
    process.env.USER_DATA_PATH = app.getPath('userData');

    log('Loading bundled server...');
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found at: ${serverPath}`);
    }

    require(serverPath);
    log('Backend server initialized successfully.');
  } catch (err) {
    log(`CRITICAL: Failed to load backend server: ${err.stack || err.message}`);
    dialog.showErrorBox(
      'Ошибка запуска сервера',
      `Не удалось запустить внутренний сервер приложения:\n\n${err.message}\n\nЛог сохранен: ${logPath}`
    );
  }
}

function checkServerReady(retries = 60, delay = 300) {
  return new Promise((resolve) => {
    let count = 0;
    const interval = setInterval(() => {
      count++;
      http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          log(`Server responded OK on attempt ${count}`);
          resolve(true);
        }
      }).on('error', (err) => {
        if (count >= retries) {
          clearInterval(interval);
          log(`Server health check timed out after ${retries} attempts. Last error: ${err.message}`);
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

  log('Waiting for backend server to become ready...');
  const isReady = await checkServerReady();

  if (isReady) {
    await mainWindow.loadURL(SERVER_URL);
    mainWindow.show();
    log('Main window opened and displayed successfully.');
  } else {
    // If backend health check failed, try loading anyway or show error
    log('Server was not ready in time, loading localhost URL anyway...');
    try {
      await mainWindow.loadURL(SERVER_URL);
      mainWindow.show();
    } catch (loadErr) {
      log(`Failed to load URL: ${loadErr.message}`);
      dialog.showErrorBox(
        'Ошибка загрузки интерфейса',
        `Не удалось подключиться к локальному серверу (${SERVER_URL}).\nПроверьте, не занят ли порт 3000 другим приложением.`
      );
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startBackendServer();
  await createMainWindow();

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

