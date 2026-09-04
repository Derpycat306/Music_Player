import FileExplorer from "./FileExplorer/FileExplorer";
import styles from "./MainWindow.module.css";
import MainHeader from "./Header/MainHeader";
import MainPanel from "./MainPanel/MainPanel";
import SongList from "./SongListing/Songs/SongList";

function MainWindow() {

    return (
        <div className={styles.body}>
            <MainHeader />
            <div className={styles.main}>
                <FileExplorer />
                <MainPanel />
                <SongList />
            </div>
        </div>
    );
}

export default MainWindow;
