import FileExplorer from "./FileExplorer/FileExplorer";
import styles from "./MainWindow.module.css";
import MainPanel from "./MainPanel/MainPanel";
import MainHeader from "./Header/MainHeader";

function MainWindow() {
    return (
        <div className={styles.body}>
            <MainHeader />
            <div className={styles.main}>
                <FileExplorer />
                <MainPanel />
            </div>
        </div>
    );
}

export default MainWindow;
