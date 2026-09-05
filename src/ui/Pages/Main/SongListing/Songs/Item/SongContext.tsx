import {useState} from "react";
import { usePlayer } from "../../../../../AudioPlayer/AudioPlayer";
import ContextMenu from "../../../../../ContextMenu/ContextMenu";
import menuStyles from "../../../../../ContextMenu/ContextMenu.module.css";

type Props = {
    song: Song;
    X: number;
    Y: number;
    onClose: () => void;
};

function SongContext({song, X, Y, onClose}: Props) {
    const { isFavorite, toggleFavorite, addPlaylist, playlists } = usePlayer();
    const [context, setContext] = useState<"default" | "playlist">("default");
    const availablePlaylists = [...playlists].filter(
        (playlist) => playlist.name.toLowerCase() !== "favorites",
    );

    return (
        <ContextMenu x={X} y={Y} onClose={onClose}>
            {context === "default" ? (
            <>
                <button onClick={() => toggleFavorite(song.id)}>
                    {isFavorite(song.id) ? "Remove from Favorites" : "Add to Favorites"}
                </button>
                <button onClick={() => setContext("playlist")}>
                    Add to Playlist
                </button>
            </>
            ) : (
            <>
                <button onClick={() => setContext("default")}>
                    Back to Context Menu
                </button>
                <div className={menuStyles.playlistList}>
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
                        <span className={menuStyles.emptyMessage}>No playlists yet</span>
                    )}
                </div>
            </>
            )}
        </ContextMenu>
    );
}

export default SongContext;