import {useState} from "react";
import { usePlayer } from "../../../../AudioPlayer/AudioPlayer";
import styles from "./SongContext.module.css";

type Props = {
    song: Song;
    X: number;
    Y: number;
};

function SongContext({song, X, Y, }: Props) {
    const { isFavorite, toggleFavorite, addPlaylist } = usePlayer();
    const [context, setContext] = useState<"default" | "playlist">("default");
    const [playlistName, setPlaylistName] = useState("");

    const views = {
        default: (
            <div className={styles.contextMenu}>
                <button onClick={() => toggleFavorite(song.id)}>
                    {isFavorite(song.id) ? "Remove from Favorites" : "Add to Favorites"}
                </button>
                <button onClick={() => setContext("playlist")}>
                    Add to Playlist
                </button>
            </div>
        ),

        playlist: (
            <div className={styles.contextMenu}>
                <button onClick={() => setContext("default")}>
                    Back to Context Menu
                </button>
                <input 
                    type="text" 
                    placeholder="Enter playlist name" 
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                />
                <button onClick={() => {addPlaylist(playlistName, song.id); setContext("default")}}>
                    Add to Playlist
                </button>
            </div>
        ),
    };

    return (
        <div className={styles.contextMenu}
        onClick={(e) => e.stopPropagation()}
        style={{position: "fixed", left: X, top: Y}}>
            {views[context]}
        </div>
    )
}

export default SongContext;