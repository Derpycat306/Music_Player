import {BrowserRouter, Routes, Route} from "react-router-dom"
import MainWindow from './Main/MainWindow.tsx'
import SettingsMenu from "./Settings/SettingsMenu.tsx";
import styles from './App.module.css'

function App() {
    return (
        <BrowserRouter>
            <div className={styles.app}>
                <Routes>
                    <Route path="/" element={<MainWindow />}/>
                    <Route path="/settings" element={<SettingsMenu />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App