import { useState, useEffect } from "react"
import type { Song } from "../../shared/types";
import FileExplorer from "./FileExplorer/FileExplorer";
import styles from './MainWindow.module.css'
import MainPanel from "./MainPanel/MainPanel";
import MainHeader from "./Header/MainHeader";
import PlayBar from "./PlayBar/PlayBar";

function MainWindow() {
     useEffect(() => {
         //@ts-ignore
         return window.electron.subscribe(data => setSongs(data));
    }, []);

    const [songs, setSongs] = useState<Song[]>([])


    return(
        <div className={styles.body}>

            <MainHeader />

            <div className={styles.main}>
                <FileExplorer songs={songs}/>
                <MainPanel />
            </div>

            <PlayBar />
        
        </div>
    )
}

export default MainWindow