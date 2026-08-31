import { ipcRenderer } from "electron";

const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
    setFolder: (path: string) => {
        ipcRenderer.send("list:set-path", path);
    },

    selectFolder: () => {
        ipcRenderer.send("list:select-folder");
    },

    subscribe: (
        callback: (data: { songs: Song[]; albums: AlbumCover[] }) => void,
    ) => {
        const listener = (
            _event: Electron.IpcRendererEvent,
            files: { songs: Song[]; albums: AlbumCover[] },
        ) => {
            callback(files);
        };

        ipcRenderer.on("list:update", listener);

        return () => {
            ipcRenderer.removeListener("list:update", listener);
        };
    },

    getSongList: () => ipcRenderer.invoke("list:get"),

    settings: {
        set: (save: Settings) => ipcRenderer.send("save:settings-set", save),
        get: () => ipcRenderer.invoke("save:settings-get")
    },

    favorites: {
        set: (save: string[]) => ipcRenderer.send("save:favorites-set", save),
        get: () => ipcRenderer.invoke("save:favorites-get")
    },

    playlists: {
        set: (save: Playlist[]) => ipcRenderer.send("save:playlists-set", save),
        get: () => ipcRenderer.invoke("save:playlists-get")
    },
});
