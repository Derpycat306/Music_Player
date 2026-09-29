import { useContext } from "react";
import { PlayerContext, type PlayerContextType } from "./AudioPlayerContext";

export function usePlayer(): PlayerContextType {
    const context = useContext(PlayerContext);

    if (!context) {
        throw new Error("AudioPlayer must be used within a provider");
    }

    return context;
}
