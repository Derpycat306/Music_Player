import { HashRouter, Routes, Route } from "react-router-dom";
import MainWindow from "./Main/MainWindow.tsx";
import SettingsMenu from "./Settings/SettingsMenu.tsx";
import styles from "./App.module.css";
import PlayBar from "./Main/PlayBar/PlayBar.tsx";

function App() {
    return (
        <HashRouter>
            <div className={styles.app}>
                <div className={styles.content}>
                    <Routes>
                        <Route path="/" element={<MainWindow />} />
                        <Route path="/settings" element={<SettingsMenu />} />
                    </Routes>
                </div>
                <PlayBar />
            </div>
        </HashRouter>
    );
}

export default App;
