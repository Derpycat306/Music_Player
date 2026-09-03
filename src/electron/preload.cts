const ipcRenderer = require("electron").ipcRenderer;
const electron = require("electron");
const saveSubscribers = new Set<() => void | Promise<void>>()

ipcRenderer.on("window-close", async () => {
    await Promise.all(
        [...saveSubscribers].map((callback) => {
            callback();
        })
    )
    ipcRenderer.send("save-complete")
})

electron.contextBridge.exposeInMainWorld("electron", {
    setFolder: (path: string) => {
        ipcRenderer.send("list:set-path", path);
    },

    selectFolder: () => ipcRenderer.invoke("list:select-folder"),

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

    updates: {
        check: () => ipcRenderer.invoke("update:check"),
        install: () => ipcRenderer.invoke("update:install"),
    },

    favorites: {
        set: (save: string[]) => ipcRenderer.send("save:favorites-set", save),
        get: () => ipcRenderer.invoke("save:favorites-get")
    },

    playlists: {
        set: (save: Playlist[]) => ipcRenderer.send("save:playlists-set", save),
        get: () => ipcRenderer.invoke("save:playlists-get")
    },

    subscribeToSave: (callback: () => void | Promise<void>) => {
        saveSubscribers.add(callback)

        return () => {
            saveSubscribers.delete(callback);
        }
    },

    exportSongs: (songs: Song[]) => ipcRenderer.invoke("export-songs", songs)
});