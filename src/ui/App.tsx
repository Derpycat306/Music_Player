import {BrowserRouter, Routes, Route} from "react-router-dom"
import MainWindow from './MainWindow.tsx'
import SettingsMenu from "./SettingsMenu.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<MainWindow />}/>
                <Route path="/settings" element={<SettingsMenu />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App