import fs from "fs";
import { app, ipcMain } from "electron";
import path from "path";

const DEFAULT_SETTINGS : Settings = {
    baseFolder: null,
    volume: 100
}

const dataPath = path.join(app.getPath("userData"), "Saved")

fs.mkdir(dataPath, {recursive: true}, (err) => {if(err) throw err})

function formPath(filename: string) : string {
    return path.join(
        dataPath,
        filename
    ) + ".json"
}

class SaveObject<T>{
    private saveData: T;
    private path: string;

    constructor(
        path: string, defaultForm: T
    ){
        this.path = path
        try{
            const data = fs.readFileSync(
                formPath(path),
                "utf-8",
            )
            this.saveData = JSON.parse(data)
        }catch(e){
            this.saveData = defaultForm
            this.save(this.saveData)
        }

        ipcMain.on(`save:${path}-set`, (_, save) => {
            return this.save(save)
        });

        ipcMain.handle(`save:${path}-get`, (_) => {
            return this.load()
        });
    }

    public save(newData: Partial<T>) : boolean {
        if (Array.isArray(newData)) {
            this.saveData = newData as T;
        } else {
            this.saveData = {
                ...this.saveData,
                ...newData
            };
        }

        try{
            fs.writeFileSync(
                formPath(this.path), 
                JSON.stringify(this.saveData, null, 2), 
                "utf-8"
            );
        }catch{
            return false
        }

        return true;
    }

    public load() : T {
        return this.saveData
    }
}

export const savedData = {
    settings: new SaveObject<Settings>("settings", DEFAULT_SETTINGS),
    playlists: new SaveObject<Playlist[]>("playlists", []),
    favorites: new SaveObject<string[]>("favorites", []),
}

const handlers = new Set<() => Promise<void>>(); 

export function saveSubscribe(handler: () => Promise<void>){
    handlers.add(handler);

    return handlers.delete(handler);
}
ipcMain.on("save:new-handler", (_, handler) => saveSubscribe(handler))

export async function saveAll() {
    await Promise.all(
        [...handlers].map(handler => handler())
    )
}