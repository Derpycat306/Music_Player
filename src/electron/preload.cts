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
        ipcRenderer.send("list:reload");

        return () => {
            ipcRenderer.removeListener("list:update", listener);
        };
    },
});
