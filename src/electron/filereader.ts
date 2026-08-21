import fs from "fs"
import { BrowserWindow, WebContents, dialog, ipcMain } from "electron"
import {parseFile} from "music-metadata"
import {Song} from '../shared/types.js'
import { mockSongs } from "./mockData.js"
import path from "path"

let filePath :string | null = null
let watcher : fs.FSWatcher | null = null
let mainWindow: BrowserWindow | null = null;

export function setFilepath(fp: string | null){
    filePath = fp;
    watcher?.close();

    if(fp !== null){
        ("setting filepath: " + fp)
        watcher = fs.watch(fp, (eventType, filename) => {
            readFiles();
        })
    }

    readFiles();
}

ipcMain.on("list:set-path", (_, path) => {
    setFilepath(path)
})

ipcMain.on("list:select-folder", async () => {
    const result = await dialog.showOpenDialog({properties: ["openDirectory"]})

    if(result.canceled || result.filePaths.length === 0){
        setFilepath(null)
    }

    setFilepath(result.filePaths[0])
})

async function parseSong(fp: string, artist?: string, album?: string): Promise<Song> {
    const metadata = await parseFile(fp);

    return{
        id: fp,
        title: metadata.common.title ?? path.basename(fp),
        artist: artist ?? "Unknown Artist",
        album: album ?? "",
        trackNumber: metadata.common.track.no ?? 0,
        path: fp,
        duration: metadata.format.duration ?? 0
    }
}

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".flac",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".opus"
]);

function isAudioFile(filename: string): boolean {
    return AUDIO_EXTENSIONS.has(
        path.extname(filename).toLowerCase()
    );
}

async function scanDirectory(
    dir: string,
    depth:number,
    artist?:string,
    album?:string,
){
    const entries = await fs.promises.readdir(dir, {withFileTypes: true})

    const songs: Song[] = [];

    for (const entry of entries){
        const fullPath = path.join(dir, entry.name)

        if(entry.isDirectory()){
            switch(depth){
                case 0:
                    songs.push(
                        ...(await scanDirectory(fullPath, 1, entry.name, album))
                    )
                    break
                case 1:
                    songs.push(
                        ...(await scanDirectory(fullPath, 2, artist, entry.name))
                    )
                    break

                default:
                    songs.push(
                        ...(await scanDirectory(fullPath, depth+1, artist, album))
                    )
            }
        }else if(isAudioFile(entry.name)) {
            songs.push(await parseSong(fullPath, artist, album))
        }
    }

    return songs;
}

export async function readFiles(){
    if(mainWindow){
        if (filePath !== null){
            const files = await scanDirectory(filePath, 0);
            mainWindow.webContents.send("list:update", files);
        }else{
            mainWindow.webContents.send("list:update", mockSongs);
        } 
    }else{
        console.log("Error, could not load window")
    }
}

ipcMain.on("list:reload", readFiles)

export function initFileReader(window: BrowserWindow, fp: string | null){
    mainWindow = window;
    setFilepath(fp);
}