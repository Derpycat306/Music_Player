import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./main.css";
import { PlayerProvider } from "../AudioPlayer/AudioPlayerProvider.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <PlayerProvider>
            <App />
        </PlayerProvider>
    </StrictMode>,
);
