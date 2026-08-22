import { app, BrowserWindow, ipcRenderer, net, protocol } from "electron";
import path from "path";
import { isDev } from "./utils.js";
import { getPreloadPath } from "./pathResolve.js";
import { initFileReader } from "./filereader.js";
import { initProtocol } from "./requestProtocol.js";

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
        webPreferences: {
            preload: getPreloadPath(),
        },
    });

    initFileReader(mainWindow, null);

    if (isDev()) {
        mainWindow.loadURL("http://localhost:5123");
    } else {
        mainWindow.loadFile(
            path.join(app.getAppPath(), "/dist-react/index.html"),
        );
    }
});
