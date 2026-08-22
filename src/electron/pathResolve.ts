import path from "path";
import { app } from "electron";
import { electron } from "process";
import { isDev } from "./utils.js";

export function getPreloadPath() {
    const preloadPath = path.join(
        app.getAppPath(),
        isDev() ? "." : "..",
        "dist-electron/electron/preload.cjs",
    );

    return preloadPath;
}
