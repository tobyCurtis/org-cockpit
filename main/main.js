const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

console.log('🔥 RUNNING UPDATED MAIN.JS');

const fs = require("fs");
const os = require("os");

function findSfBinary() {
  if (fs.existsSync("/usr/local/bin/sf")) return "/usr/local/bin/sf";
  if (fs.existsSync("/opt/homebrew/bin/sf")) return "/opt/homebrew/bin/sf";

  const nvmDir = path.join(os.homedir(), ".nvm/versions/node");
  if (fs.existsSync(nvmDir)) {
    const nodes = fs.readdirSync(nvmDir);
    for (const n of nodes) {
      const binPath = path.join(nvmDir, n, "bin/sf");
      if (fs.existsSync(binPath)) return binPath;
    }
  }

  return "sf";
}

const SF_BIN = findSfBinary();
console.log("🔍 Using sf binary:", SF_BIN);

// 🧠 Make sure sf's directory (and thus node) is on PATH
if (SF_BIN && SF_BIN !== "sf") {
  const sfDir = path.dirname(SF_BIN);
  const currentPath = process.env.PATH || "";
  process.env.PATH = `${sfDir}:${currentPath}:/usr/local/bin:/opt/homebrew/bin`;
  console.log("🛠 Effective PATH for child processes:", process.env.PATH);
}

const isDev = process.env.NODE_ENV === 'DEV';

// --------------------------------------------------
// Helper: parse Salesforce CLI JSON robustly
// --------------------------------------------------
function parseSfJson(stdout) {
  if (!stdout) {
    throw new Error('No output from sf command');
  }

  const raw = stdout.toString();

  console.log('---------- RAW SF STDOUT (stringified) ----------');
  console.log(JSON.stringify(raw));
  console.log('-------------------------------------------------');

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Could not locate JSON braces in sf output');
  }

  // Slice between first { and last }
  let candidate = raw.slice(firstBrace, lastBrace + 1).trim();

  // 1) Try straightforward parse
  try {
    console.log('Attempting direct JSON.parse on candidate substring...');
    return JSON.parse(candidate);
  } catch (e) {
    console.log('Direct JSON.parse failed, will try fallbacks:', e.message);
  }

  // 2) Fallback: trim from the right until JSON.parse works
  for (let end = candidate.length; end > 0; end--) {
    const text = candidate.slice(0, end).trim();
    if (!text) continue;
    try {
      console.log(`Trying trimmed substring length=${end}...`);
      return JSON.parse(text);
    } catch {
      // keep trimming
    }
  }

  // 3) Fallback: quoted JSON string case: "\"{...}\""
  if (candidate[0] === '"' && candidate[candidate.length - 1] === '"') {
    try {
      console.log('Trying double-parse for quoted JSON string...');
      const inner = JSON.parse(candidate);     // remove outer quotes
      return JSON.parse(inner);                // parse inner JSON
    } catch (e) {
      console.log('Double-parse fallback failed:', e.message);
    }
  }

  throw new Error('Could not parse JSON from sf output');
}

// --------------------------------------------------
// IPC: org actions
// --------------------------------------------------
ipcMain.handle('get-orgs', async () => {
  return new Promise((resolve, reject) => {
    console.log('👉 Using SF_BIN for get-orgs:', SF_BIN);

    execFile(
      SF_BIN,
      ['org', 'list', '--json', '--loglevel', 'fatal'],
      (err, stdout, stderr) => {
        console.log('========== EXEC sf org list --json --loglevel fatal ==========');
        console.log('STDERR:');
        console.log(stderr);
        console.log('STDOUT (raw):');
        console.log(stdout);
        console.log('===============================================================');

        if (err) {
          console.error('Error running sf org list:', stderr || err);
          reject(stderr || err.message || 'Failed to run sf org list');
          return;
        }

        try {
          let raw = stdout ? stdout.toString() : '';

          const firstBrace = raw.indexOf('{');
          const lastBrace = raw.lastIndexOf('}');

          if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
            console.error('Could not locate JSON braces in sf output:', raw);
            reject('Failed to parse sf org list output');
            return;
          }

          let candidate = raw.slice(firstBrace, lastBrace + 1);

          // Strip ANSI escape codes
          candidate = candidate.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
          // Strip other control chars
          candidate = candidate.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');

          console.log('JSON substring after cleaning:');
          console.log(candidate);

          const result = JSON.parse(candidate);
          resolve(result);
        } catch (parseErr) {
          console.error('Failed to parse sf org list output:', parseErr);
          reject('Failed to parse sf org list output');
        }
      }
    );
  });
});


ipcMain.handle('open-org', async (_event, target) => {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject('No target org specified');
      return;
    }

    console.log(`Opening org: ${target} via`, SF_BIN);

    execFile(
      SF_BIN,
      ['org', 'open', '--target-org', target],
      (err, stdout, stderr) => {
        console.log('========== EXEC sf org open ==========');
        console.log('STDERR:');
        console.log(stderr);
        console.log('STDOUT:');
        console.log(stdout);
        console.log('======================================');

        if (err) {
          console.error('Error running sf org open:', stderr || err);
          reject(stderr || err.message || 'Failed to open org');
          return;
        }

        resolve(true);
      }
    );
  });
});


// --------------------------------------------------
// IPC: add-org (production / sandbox / custom)
// --------------------------------------------------
ipcMain.handle('add-org', async (_event, options) => {
  return new Promise((resolve, reject) => {
    const mode = options?.mode || 'production';
    let instanceUrl = options?.instanceUrl?.trim();

    console.log('Starting sf org login web, mode:', mode, 'instanceUrl:', instanceUrl, 'via', SF_BIN);

    const args = ['org', 'login', 'web'];

    if (mode === 'sandbox') {
      args.push('--instance-url', 'https://test.salesforce.com');
    } else if (mode === 'custom') {
      if (!instanceUrl) {
        reject('Custom instance URL is required');
        return;
      }

      if (!/^https?:\/\//i.test(instanceUrl)) {
        instanceUrl = 'https://' + instanceUrl;
      }
      instanceUrl = instanceUrl.replace(/"/g, '');

      args.push('--instance-url', instanceUrl);
    }

    console.log('Running command:', SF_BIN, args.join(' '));

    execFile(SF_BIN, args, (err, stdout, stderr) => {
      console.log('========== EXEC sf org login web ==========');
      console.log('STDERR:');
      console.log(stderr);
      console.log('STDOUT:');
      console.log(stdout);
      console.log('============================================');

      if (err) {
        console.error('Error running sf org login web:', stderr || err);
        reject(stderr || err.message || 'Failed to start org login');
        return;
      }

      resolve(true);
    });
  });
});

// --------------------------------------------------
// Dev server loader with retry
// --------------------------------------------------
function loadDevServer(win) {
  const url = 'http://localhost:5173/';

  win.loadURL(url).catch((err) => {
    console.error('Initial loadURL failed, will retry in 1s:', err.message);
    setTimeout(() => {
      win.loadURL(url).catch((err2) => {
        console.error('Second loadURL failed:', err2.message);
      });
    }, 1000);
  });
}



// --------------------------------------------------
// Window creation
// --------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    console.log('🚀 DEV MODE: loading Vite dev server');
    loadDevServer(win);
    win.webContents.openDevTools();
  } else {
    console.log('📦 PROD MODE: loading built frontend');
    win.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

// --------------------------------------------------
// App lifecycle
// --------------------------------------------------
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
