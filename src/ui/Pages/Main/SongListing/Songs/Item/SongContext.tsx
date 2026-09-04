import {useState} from "react";
import { usePlayer } from "../../../../../AudioPlayer/AudioPlayer";
import styles from "./SongContext.module.css";

type Props = {
    song: Song;
    X: number;
    Y: number;
};

function SongContext({song, X, Y, }: Props) {
    const { isFavorite, toggleFavorite, addPlaylist, playlists } = usePlayer();
    const [context, setContext] = useState<"default" | "playlist">("default");
    const availablePlaylists = [...playlists].filter(
        (playlist) => playlist.name.toLowerCase() !== "favorites",
    );

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
                <div className={styles.playlistList}>
                    {availablePlaylists.length > 0 ? availablePlaylists.map((playlist) => (
                        <button
                            key={playlist.name}
                            onClick={() => {
                                addPlaylist(playlist.name, song.id);
                                setContext("default");
                            }}
                        >
                            {playlist.name}
                        </button>
                    )) : (
                        <span className={styles.emptyMessage}>No playlists yet</span>
                    )}
                </div>
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