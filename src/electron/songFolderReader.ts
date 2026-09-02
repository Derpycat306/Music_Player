import fs from "fs";
import { BrowserWindow, dialog, ipcMain } from "electron";
import { parseFile } from "music-metadata";
import path from "path";
import { isAudioFile, isImageFile } from "./extentionHandler.js";
import { savedData } from "./saveHandler.js";

let filePath: string | null = null;
let watcher: fs.FSWatcher | null = null;
let mainWindow: BrowserWindow | null = null;

export function setFilepath(fp: string | null, save: boolean = true) {
    filePath = fp;
    watcher?.close();

    if (fp !== null) {
        "setting filepath: " + fp;
        watcher = fs.watch(fp, () => {
            readFiles();
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

ipcMain.on("list:select-folder", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return;
    }

    setFilepath(result.filePaths[0]);
});

async function parseSong(
    fp: string,
    artist?: string,
    album?: string,
): Promise<Song> {
    const metadata = await parseFile(fp);

    return {
        id: fp,
        title: metadata.common.title ?? path.basename(fp),
        artist: artist ?? "Unknown Artist",
        album: album ?? "",
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
): Promise<{ songs: Song[]; covers: AlbumCover[] }> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    const songs: Song[] = [];
    const covers: AlbumCover[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            switch (depth) {
                case 0:
                    {
                        const result = await scanDirectory(
                            fullPath,
                            1,
                            entry.name,
                            album,
                        );
                        songs.push(...result.songs);
                        covers.push(...result.covers);
                    }
                    break;
                case 1:
                    {
                        const result = await scanDirectory(
                            fullPath,
                            2,
                            artist,
                            entry.name,
                        );
                        songs.push(...result.songs);
                        covers.push(...result.covers);
                    }
                    break;

                default:
                    {
                        const result = await scanDirectory(
                            fullPath,
                            depth + 1,
                            artist,
                            album,
                        );
                        songs.push(...result.songs);
                        covers.push(...result.covers);
                    }
            }
        } else if (isAudioFile(entry.name)) {
            songs.push(await parseSong(fullPath, artist, album));
        } else if (isImageFile(entry.name)) {
            if (album && !covers.find((a) => a.title === album)) {
                covers.push({ id: album, title: album, coverPath: fullPath });
            }
        }
    }

    return { songs, covers };
}

ipcMain.handle("list:get", async () => {
    if(filePath){
        return await scanDirectory(filePath)
    }else{
        return {
            songs: [],
            covers: []
        }
    }
})

export async function readFiles() {
    if (mainWindow) {
        if (filePath !== null) {
            const files = await scanDirectory(filePath);
            mainWindow.webContents.send("list:update", files);
        } else {
            mainWindow.webContents.send("list:update", {
                songs: [],
                covers: [],
            });
        }
    } else {
        console.error("Could not load window");
    }
}

ipcMain.on("list:reload", readFiles);

export function initFileReader(window: BrowserWindow, fp: string | null) {
    mainWindow = window;
    setFilepath(fp, false);
}
