import fs from "fs";
import { app, ipcMain } from "electron";
import path from "path";

const DEFAULT_SETTINGS : Settings = {
    baseFolder: null,
    volume: 100
}

const dataPath = path.join(app.getPath("userData"), "Saved")

await fs.mkdir(dataPath, {recursive: true}, (err) => {if(err) throw err})

function formPath(filename: string) : string {
    return path.join(
        dataPath,
        filename
    ) + ".json"
}

class SaveObject<T>{
    private data: T;
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
            this.data = JSON.parse(data)
        }catch(e){
            this.data = defaultForm
            this.save(this.data)
        }

        ipcMain.on(`save:${path}-set`, (_, save) => {
            return this.save(save)
        });

        ipcMain.on(`save:${path}-set`, (_) => {
            return this.load()
        });
    }

    public save(newData: Partial<T>) : boolean {
        this.data = {...this.data, ...newData}

        try{
            fs.writeFileSync(
                formPath(this.path), 
                JSON.stringify(this.data, null, 2), 
                "utf-8"
            );
        }catch{
            return false
        }

        return true;
    }

    public load() : T {
        return this.data
    }
}

export const savedData = {
    settings: new SaveObject<Settings>("settings", DEFAULT_SETTINGS),
    playlists: new SaveObject<Playlist[]>("playlists", []),
    favorites: new SaveObject<string[]>("favorites", []),
}