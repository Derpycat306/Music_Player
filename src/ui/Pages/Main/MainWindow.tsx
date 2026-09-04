import FileExplorer from "./FileExplorer/FileExplorer";
import styles from "./MainWindow.module.css";
import MainHeader from "./Header/MainHeader";
import { ExplorerProvider } from "./ExplorerContext";
import MainPanel from "./MainPanel/MainPanel";
import SongList from "./SongListing/Songs/SongList";

function MainWindow() {

    return (
        <ExplorerProvider>
            <div className={styles.body}>
                <MainHeader />
                <div className={styles.main}>
                    <FileExplorer />
                    <MainPanel />
                    <SongList />
                </div>
            </div>
        </ExplorerProvider>
    );
}

export default MainWindow;
