import fs from "fs"
import { BrowserWindow, WebContents, ipcMain } from "electron"
import {parseFile} from "music-metadata"
import {Song} from '../shared/types.js'
import { mockSongs } from "./mockData.js"

let filePath :string | null = null
let watcher : fs.FSWatcher | null = null
let mainWindow: BrowserWindow | null = null;

export function setFilepath(fp: string | null){
    filePath = fp;
    watcher?.close();

    if(fp !== null){
        watcher = fs.watch(fp, (eventType, filename) => {
            readFiles();
        })
    }

    readFiles();
}

ipcMain.on("list:set-path", (_, path) => {
    setFilepath(path)
})

async function parseSong(fp: string): Promise<Song> {
    const metadata = await parseFile(fp);

    return{
        id: fp,
        title: metadata.common.title ?? fp,
        artist: metadata.common.artist ?? "Unknown Artist",
        album: metadata.common.album ?? "",
        trackNumber: metadata.common.track.no ?? 0,
        path: fp,
        duration: metadata.format.duration ?? 0
    }
}

function parseSongs(path: String): Song[] {
    let list : Song[] = mockSongs
    return list
}

export async function readFiles(){
    if(mainWindow){
        if (filePath !== null){
            const files = parseSongs(filePath);
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