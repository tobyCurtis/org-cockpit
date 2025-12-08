const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { execFile } = require("child_process");

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

// Inject sf directory into PATH (cross-platform)
if (SF_BIN && SF_BIN !== "sf" && SF_BIN !== "sf.exe") {
  const sfDir = path.dirname(SF_BIN);
  const sep = process.platform === "win32" ? ";" : ":";

  process.env.PATH = `${sfDir}${sep}${process.env.PATH}`;
}


const isDev = process.env.NODE_ENV === "DEV";

// --------------------------------------------------
// IPC: org actions
// --------------------------------------------------
ipcMain.handle("get-orgs", async () => {
  return new Promise((resolve, reject) => {
    execFile(
      SF_BIN,
      ["org", "list", "--json", "--loglevel", "fatal"],
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error running sf org list:", stderr || err);
          reject(stderr || err.message || "Failed to run sf org list");
          return;
        }

        try {
          let raw = stdout ? stdout.toString() : "";

          const firstBrace = raw.indexOf("{");
          const lastBrace = raw.lastIndexOf("}");

          if (
            firstBrace === -1 ||
            lastBrace === -1 ||
            lastBrace <= firstBrace
          ) {
            console.error("Could not locate JSON braces in sf output:", raw);
            reject("Failed to parse sf org list output");
            return;
          }

          let candidate = raw.slice(firstBrace, lastBrace + 1);

          // Strip ANSI escape codes
          candidate = candidate.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
          // Strip other control chars
          candidate = candidate.replace(
            /[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g,
            ""
          );

          const result = JSON.parse(candidate);
          resolve(result);
        } catch (parseErr) {
          console.error("Failed to parse sf org list output:", parseErr);
          reject("Failed to parse sf org list output");
        }
      }
    );
  });
});

ipcMain.handle("open-org", async (_event, target) => {
  return new Promise((resolve, reject) => {
    if (!target) {
      reject("No target org specified");
      return;
    }

    execFile(
      SF_BIN,
      ["org", "open", "--target-org", target],
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error running sf org open:", stderr || err);
          reject(stderr || err.message || "Failed to open org");
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
ipcMain.handle("add-org", async (_event, options) => {
  return new Promise((resolve, reject) => {
    const mode = options?.mode || "production";
    let instanceUrl = options?.instanceUrl?.trim();
    let alias = options?.alias?.trim();

    const args = ["org", "login", "web"];

    // If alias provided, use it
    if (alias) {
      args.push("--alias", alias);
    }

    if (mode === "sandbox") {
      args.push("--instance-url", "https://test.salesforce.com");
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
    }

    execFile(SF_BIN, args, (err, stdout, stderr) => {
      if (err) {
        console.error("Error running sf org login web:", stderr || err);
        reject(stderr || err.message || "Failed to start org login");
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
