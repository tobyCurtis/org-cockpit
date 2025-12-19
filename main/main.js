const { app, BrowserWindow, ipcMain, clipboard } = require("electron");
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");

function findSfBinary() {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");

  // --- 1. Windows paths ---
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\sf\\bin\\sf.exe",
      "C:\\Program Files (x86)\\sf\\bin\\sf.exe",
      "C:\\ProgramData\\sf\\bin\\sf.exe",
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }

    // Git Bash path like "/c/Program Files/sf/bin/sf"
    const gitBashGuess = "/c/Program Files/sf/bin/sf";
    if (fs.existsSync(gitBashGuess)) {
      // Convert to Windows path
      const win = path.resolve(
        "C:\\",
        gitBashGuess.replace(/^\/c\//i, "").replace(/\//g, "\\")
      );
      if (fs.existsSync(win)) return win;
    }

    // Try resolving from PATH
    const which = require("which");
    try {
      const resolved = which.sync("sf");
      return resolved;
    } catch (e) {
      // continue
    }

    return "sf.exe"; // fallback
  }

  // --- 2. macOS-specific ---
  if (fs.existsSync("/usr/local/bin/sf")) return "/usr/local/bin/sf"; // Intel
  if (fs.existsSync("/opt/homebrew/bin/sf")) return "/opt/homebrew/bin/sf"; // Apple Silicon

  // --- 3. NVM Node installs ---
  const nvmDir = path.join(os.homedir(), ".nvm/versions/node");
  if (fs.existsSync(nvmDir)) {
    const nodes = fs.readdirSync(nvmDir);
    for (const n of nodes) {
      const binPath = path.join(nvmDir, n, "bin/sf");
      if (fs.existsSync(binPath)) return binPath;
    }
  }

  // --- 4. Linux common paths ---
  const linuxBins = ["/usr/bin/sf", "/usr/local/bin/sf"];
  for (const bin of linuxBins) {
    if (fs.existsSync(bin)) return bin;
  }

  // --- Fallback ---
  return "sf";
}

const SF_BIN = findSfBinary();
const EXEC_OPTS =
  process.platform === "win32" && /\.cmd$/i.test(SF_BIN) ? { shell: true } : {};

// Small helper to run sf with consistent options (notably shell:true for .cmd on Windows)
function runSf(args, cb) {
  return execFile(SF_BIN, args, EXEC_OPTS, cb);
}

// Inject sf directory into PATH (cross-platform)
if (SF_BIN && SF_BIN !== "sf" && SF_BIN !== "sf.exe") {
  const sfDir = path.dirname(SF_BIN);
  const sep = process.platform === "win32" ? ";" : ":";

  process.env.PATH = `${sfDir}${sep}${process.env.PATH}`;
}


const isDev = !app.isPackaged;

function parseSfJson(raw) {
  if (!raw) throw new Error("Empty sf output");
  const str = raw.toString();
  const firstBrace = str.indexOf("{");
  const lastBrace = str.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Could not locate JSON braces in sf output");
  }

  let candidate = str.slice(firstBrace, lastBrace + 1);
  candidate = candidate.replace(/\u001b\[[0-9;]*[A-Za-z]/g, ""); // strip ANSI
  candidate = candidate.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  return JSON.parse(candidate);
}

// --------------------------------------------------
// Track long-running add-org process so we can cancel
// --------------------------------------------------
let addOrgProcess = null;
let addOrgCancelled = false;
const logPrefix = "[add-org]";

// --------------------------------------------------
// IPC: org actions
// --------------------------------------------------
ipcMain.handle("get-orgs", async () => {
  return new Promise((resolve, reject) => {
    runSf(["org", "list", "--json", "--loglevel", "fatal"], (err, stdout, stderr) => {
      if (err) {
        console.error("Error running sf org list:", stderr || err);
        reject(stderr || err.message || "Failed to run sf org list");
        return;
      }

      try {
        const result = parseSfJson(stdout);
        resolve(result);
      } catch (parseErr) {
        console.error("Failed to parse sf org list output:", parseErr);
        reject("Failed to parse sf org list output");
      }
    });
  });
});

ipcMain.handle("open-org", async (_event, target) => {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject("No target org specified");
      return;
    }

    runSf(["org", "open", "--target-org", target], (err, stdout, stderr) => {
      if (err) {
        console.error("Error running sf org open:", stderr || err);
        reject(stderr || err.message || "Failed to open org");
        return;
      }

      resolve(true);
    });
  });
});

// --------------------------------------------------
// IPC: add-org (production / sandbox / custom)
// --------------------------------------------------
ipcMain.handle("add-org", async (_event, options) => {
  return new Promise((resolve, reject) => {
    addOrgCancelled = false;

    const mode = options?.mode || "production";
    let instanceUrl = options?.instanceUrl?.trim();
    let alias = options?.alias?.trim();

    const args = ["org", "login", "web"];

    let tmpAuthUrlFile = null;
    let aliasArg = alias ? ["--alias", alias] : [];

    if (mode === "sandbox") {
      args.push("--instance-url", "https://test.salesforce.com");
      if (aliasArg.length) {
        args.push(...aliasArg);
      }
    } else if (mode === "custom") {
      if (!instanceUrl) {
        reject("Custom instance URL is required");
        return;
      }

      if (!/^https?:\/\//i.test(instanceUrl)) {
        instanceUrl = "https://" + instanceUrl;
      }
      instanceUrl = instanceUrl.replace(/"/g, "");

      args.push("--instance-url", instanceUrl);
      if (aliasArg.length) {
        args.push(...aliasArg);
      }
    } else if (mode === "authurl") {
      if (!instanceUrl) {
        reject("Auth URL is required");
        return;
      }
      try {
        tmpAuthUrlFile = path.join(os.tmpdir(), `sf-auth-${Date.now()}.txt`);
        fs.writeFileSync(tmpAuthUrlFile, instanceUrl, { encoding: "utf8" });
      } catch (e) {
        reject("Failed to write auth URL");
        return;
      }

      args.splice(0, args.length, "org", "login", "sfdx-url");
      if (aliasArg.length) {
        args.push(...aliasArg);
      }
      args.push("--sfdx-url-file", tmpAuthUrlFile);
      args.push("--no-prompt");
    } else {
      if (aliasArg.length) {
        args.push(...aliasArg);
      }
    }

    if (addOrgProcess) {
      try {
        console.log(`${logPrefix} killing stale addOrgProcess pid=${addOrgProcess.pid}`);
        addOrgProcess.kill();
      } catch (e) {
        console.warn(`${logPrefix} failed to kill stale process`, e);
      }
    }

    addOrgProcess = runSf(args, (err, stdout, stderr) => {
      addOrgProcess = null;
      if (tmpAuthUrlFile) {
        fs.rm(tmpAuthUrlFile, { force: true }, () => {});
      }

      if (addOrgCancelled) {
        resolve({ cancelled: true });
        return;
      }

      if (err) {
        console.error(`${logPrefix} error running sf org login web:`, stderr || err);
        reject(stderr || err.message || "Failed to start org login");
        return;
      }

        console.log(`${logPrefix} org login completed successfully`);
      resolve({ success: true });
    });

    console.log(`${logPrefix} started login pid=${addOrgProcess.pid} mode=${mode} alias=${alias || "(none)"}`);

    addOrgProcess.on("exit", (code, signal) => {
      console.log(`${logPrefix} process exit pid=${addOrgProcess?.pid} code=${code} signal=${signal} cancelled=${addOrgCancelled}`);
    });
  });
});

// --------------------------------------------------
// IPC: cancel add-org
// --------------------------------------------------
ipcMain.handle("cancel-add-org", async () => {
  addOrgCancelled = true;
  if (addOrgProcess) {
    try {
      const pid = addOrgProcess.pid;
      console.log(`${logPrefix} cancelling login pid=${pid} (SIGTERM)`);
      addOrgProcess.kill();
      setTimeout(() => {
        if (addOrgProcess && !addOrgProcess.killed) {
          console.log(`${logPrefix} forcing kill pid=${pid} (SIGKILL fallback)`);
          addOrgProcess.kill("SIGKILL");
        }
      }, 500);
    } catch (e) {
      console.warn(`${logPrefix} failed to kill add-org process:`, e);
    }
  }
  return { cancelled: true };
});

// --------------------------------------------------
// IPC: generate auth URL and copy to clipboard
// --------------------------------------------------
ipcMain.handle("generate-auth-url", async (_event, target) => {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject("No target org specified");
      return;
    }

    runSf(
      ["org", "display", "--target-org", target, "--verbose", "--json"],
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error running sf org display:", stderr || err);
          reject(stderr || err.message || "Failed to generate auth URL");
          return;
        }

        try {
          const parsed = parseSfJson(stdout);
          const authUrl =
            parsed?.result?.sfdxAuthUrl ||
            parsed?.result?.authUrl ||
            parsed?.result?.sfdxAuthUrlV2;

          if (!authUrl) {
            reject("Auth URL not available for this org");
            return;
          }

          clipboard.writeText(authUrl);
          resolve({ success: true, authUrl });
        } catch (e) {
          reject(e instanceof Error ? e.message : String(e));
        }
      },
    );
  });
});

// --------------------------------------------------
// IPC: delete org
// --------------------------------------------------
ipcMain.handle("delete-org", async (_event, target) => {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject("No target org specified");
      return;
    }

    runSf(["org", "logout", "--target-org", target, "--noprompt"], (err, stdout, stderr) => {
      if (err) {
        console.error("Error running sf org logout:", stderr || err);
        reject(stderr || err.message || "Failed to delete org");
        return;
      }

      resolve({ success: true });
    });
  });
});

// --------------------------------------------------
// Window creation
// --------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Org Cockpit",
    icon: path.join(__dirname, "main/icon.icns"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Prevent the page from changing the title
  win.on("page-title-updated", (event) => {
    event.preventDefault();
    win.setTitle("Org Cockpit");
  });

  if (isDev) {
    win.loadURL("http://localhost:5173/");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
    win.loadFile(indexPath);
  }
}


// --------------------------------------------------
// App lifecycle
// --------------------------------------------------
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
