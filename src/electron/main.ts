import { app, BrowserWindow, ipcMain, protocol } from "electron";
import path from "path";
import { isDev } from "./utils.js";
import electronUpdater from "electron-updater";
import { getPreloadPath } from "./pathResolve.js";
import { initFileReader as initSongFolderReader } from "./songFolderReader.js";
import { initProtocol } from "./requestProtocol.js";
import { savedData } from "./saveHandler.js";
import "./excelSaver.js";

const autoUpdater = electronUpdater.autoUpdater;

autoUpdater.logger = console;
autoUpdater.on("error", (error) => {
    console.error("Updater error:", error);
});

ipcMain.handle("update:check", async () => {
    if (!app.isPackaged) {
        return { available: false };
    }

    const result = await autoUpdater.checkForUpdates();

    if (!result) {
        return { available: false };
    }

    return {
        available: result.isUpdateAvailable,
        version: result.updateInfo.version,
    };
});

ipcMain.handle("update:install", async () => {
    if (!app.isPackaged) {
        return;
    }

    await autoUpdater.downloadUpdate();
    autoUpdater.quitAndInstall();
});

protocol.registerSchemesAsPrivileged([
    {
        scheme: "music",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            stream: true,
        },
    },
]);

app.on("ready", () => {
    initProtocol();

    const mainWindow = new BrowserWindow({
        icon: path.join(app.getAppPath(), "assets", "icon.png"),
        minWidth: 400,
        webPreferences: {
            preload: getPreloadPath(),
        },
    });

    const settings = savedData.settings.load()
    initSongFolderReader(mainWindow, settings.baseFolder);

    if (isDev()) {
        mainWindow.loadURL("http://localhost:5123");
    } else {
        mainWindow.loadFile(
            path.join(app.getAppPath(), "/dist-react/index.html"),
        );
    }

    let isClosing = false

    mainWindow.on("close", async (event) => {
        if(isClosing)return;
        event.preventDefault();
        mainWindow.webContents.send("window-close")
    })

    ipcMain.once("save-complete", () => {
        isClosing = true
        mainWindow.close();
    })
});