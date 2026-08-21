import {ipcRenderer} from 'electron'
import type { Song } from '../shared/types'

const electron = require('electron')

electron.contextBridge.exposeInMainWorld("electron", {
    setFolder: (path: string) => {
        ipcRenderer.send("list:set-path", path)
    },

    selectFolder: () => {
        ipcRenderer.send("list:select-folder")
    },

    subscribe: (callback: (files: Song[]) => void) => {
        const listener = (
            _event: Electron.IpcRendererEvent,
            files: Song[]
        ) => {
            callback(files)
        }

        ipcRenderer.on("list:update", listener);
        ipcRenderer.send("list:reload")

        return () => {
            ipcRenderer.removeListener("list:update", listener);
        }
    }
})