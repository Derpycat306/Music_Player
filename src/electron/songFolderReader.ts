import fs from "fs";
import { BrowserWindow, dialog, ipcMain } from "electron";
import { parseFile } from "music-metadata";
import path from "path";
import { isAudioFile, isImageFile, removeExtension } from "./extentionHandler.js";
import { savedData } from "./saveHandler.js";

let filePath: string | null = null;
let watcher: fs.FSWatcher | null = null;
let mainWindow: BrowserWindow | null = null;
let reloadTimer: NodeJS.Timeout | null = null;
let scanInProgress = false;
let scanRequested = false;
let activeScan: { root: string; promise: Promise<{ songs: Song[]; covers: AlbumCover[] }> } | null = null;

function scanLibrary(root: string): Promise<{ songs: Song[]; covers: AlbumCover[] }> {
    if (activeScan?.root === root) return activeScan.promise;

    const promise = scanDirectory(root).finally(() => {
        if (activeScan?.promise === promise) activeScan = null;
    });
    activeScan = { root, promise };
    return promise;
}

export function setFilepath(fp: string | null, save: boolean = true) {
    filePath = fp;
    if (reloadTimer) {
        clearTimeout(reloadTimer);
        reloadTimer = null;
    }
    watcher?.close();

    if (fp !== null) {
        watcher = fs.watch(fp, () => {
            if (reloadTimer) clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                reloadTimer = null;
                void readFiles();
            }, 250);
        });
    }

    readFiles();

    if(save){
        const data : Partial<Settings> = {baseFolder: fp}
        savedData.settings.save(data)
    }
}

ipcMain.on("list:set-path", (_, path) => {
    setFilepath(path);
});

ipcMain.handle("list:select-folder", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    const selectedPath = result.filePaths[0];
    setFilepath(selectedPath);
    return selectedPath;
});

async function parseSong(
    fp: string,
    artist?: string,
    album?: string,
): Promise<Song> {
    const metadata = await parseFile(fp);

    return {
        id: fp,
        title: metadata.common.title ?? removeExtension(path.basename(fp)),
        artist: artist ?? metadata.common.artist ?? null,
        album: album ?? metadata.common.album ?? null,
        trackNumber: metadata.common.track.no ?? 0,
        path: fp,
        duration: metadata.format.duration ?? 0,
    };
}

async function scanDirectory(
    dir: string,
    depth: number = 0,
    artist?: string,
    album?: string,
    inheritedArt?: string,
    result: { songs: Song[]; covers: AlbumCover[] } = { songs: [], covers: [] },
): Promise<{ songs: Song[]; covers: AlbumCover[] }> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    const { songs, covers } = result;
    const directoryArt = entries.find((entry) =>
        entry.isFile() && isImageFile(entry.name),
    );
    const effectiveArt = directoryArt
        ? path.join(dir, directoryArt.name)
        : inheritedArt;

    if (directoryArt) {
        if (depth === 0) {
            covers.push({
                id: "root-art",
                title: "",
                coverPath: path.join(dir, directoryArt.name),
            });
        } else if (depth === 1 && artist) {
            covers.push({
                id: `artist-art:${encodeURIComponent(artist)}`,
                title: artist,
                coverPath: path.join(dir, directoryArt.name),
            });
        } else if (depth >= 2 && album) {
            covers.push({
                id: `album-art:${encodeURIComponent(artist ?? "")}:${encodeURIComponent(album)}`,
                title: album,
                coverPath: path.join(dir, directoryArt.name),
            });
        }
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            switch (depth) {
                case 0:
                    {
                        await scanDirectory(
                            fullPath,
                            1,
                            entry.name,
                            album,
                            effectiveArt,
                            result,
                        );
                    }
                    break;
                case 1:
                    {
                        await scanDirectory(
                            fullPath,
                            2,
                            artist,
                            entry.name,
                            effectiveArt,
                            result,
                        );
                    }
                    break;

                default:
                    {
                        await scanDirectory(
                            fullPath,
                            depth + 1,
                            artist,
                            album,
                            effectiveArt,
                            result,
                        );
                    }
            }
        } else if (isAudioFile(entry.name)) {
            songs.push(await parseSong(fullPath, artist, album));
        }
    }

    return { songs, covers };
}

ipcMain.handle("list:get", async () => {
    if(filePath){
        return await scanLibrary(filePath)
    }else{
        return {
            songs: [],
            covers: []
        }
    }
})

export async function readFiles() {
    if (scanInProgress) {
        scanRequested = true;
        return;
    }

    scanInProgress = true;
    try {
        do {
            scanRequested = false;
            const root = filePath;
            const files = root !== null
                ? await scanLibrary(root)
                : { songs: [], covers: [] };
            if (root !== filePath) {
                scanRequested = true;
                continue;
            }

            if (mainWindow) {
                mainWindow.webContents.send("list:update", files);
            } else {
                console.error("Could not load window");
            }
        } while (scanRequested);
    } finally {
        scanInProgress = false;
    }
}

ipcMain.on("list:reload", readFiles);

export function initFileReader(window: BrowserWindow, fp: string | null) {
    mainWindow = window;
    setFilepath(fp, false);
}
