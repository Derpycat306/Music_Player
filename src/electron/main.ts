import {app, BrowserWindow, ipcRenderer} from "electron";
import path from 'path';
import {isDev} from './utils.js'
import {getPreloadPath} from './pathResolve.js'
import {initFileReader} from './filereader.js'

app.on("ready", ()=>{
    console.log(getPreloadPath())

    const mainWindow = new BrowserWindow({
        webPreferences: {
            preload: getPreloadPath()
        },
    });

    initFileReader(mainWindow, null);

    if(isDev()){
        mainWindow.loadURL('http://localhost:5123')
    }else{
        mainWindow.loadFile(path.join(app.getAppPath(),'/dist-react/index.html'))
    }
})