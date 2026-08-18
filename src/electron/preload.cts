import {ipcRenderer} from 'electron'
import type { Song } from '../shared/types'

const electron = require('electron')

electron.contextBridge.exposeInMainWorld("electron", {
    setFilePath: (path: string) => {
        ipcRenderer.send("list:set-path", path)
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