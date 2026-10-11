import { useState } from "react";
import { usePlayer } from "../../../../../AudioPlayer/useAudioPlayer";
import ContextMenu from "../../../../../ContextMenu/ContextMenu";
import menuStyles from "../../../../../ContextMenu/ContextMenu.module.css";

type Props = {
    song: Song;
    X: number;
    Y: number;
    onClose: () => void;
    onFavoriteChange?: (song: Song, wasFavorite: boolean) => void;
};

function SongContext({ song, X, Y, onClose, onFavoriteChange }: Props) {
    const { isFavorite, toggleFavorite, addPlaylist, playlists } = usePlayer();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [playlistName, setPlaylistName] = useState("");
    const [createError, setCreateError] = useState("");
    const availablePlaylists = [...playlists].filter(
        (playlist) => playlist.name.toLowerCase() !== "favorites",
    );

    function toggleSongFavorite() {
        const wasFavorite = isFavorite(song.id);
        toggleFavorite(song.id);
        onFavoriteChange?.(song, wasFavorite);
        onClose();
    }

    function createPlaylist() {
        const name = playlistName.trim();
        if (!name) return;
        if (name.toLowerCase() === "favorites") {
            setCreateError("Favorites is a reserved name.");
            return;
        }
        if (availablePlaylists.some((playlist) => playlist.name.toLowerCase() === name.toLowerCase())) {
            setCreateError("A playlist with this name already exists.");
            return;
        }
        addPlaylist(name, song.id);
        onClose();
    }

    return (
        <ContextMenu x={X} y={Y} onClose={onClose}>
            <button type="button" role="menuitem" onClick={toggleSongFavorite}>
                {isFavorite(song.id) ? "Remove from Favorites" : "Add to Favorites"}
            </button>
            <div className={menuStyles.playlistSection}>
                {showCreateForm ? (
                    <form
                        className={menuStyles.createPlaylist}
                        onSubmit={(event) => {
                            event.preventDefault();
                            createPlaylist();
                        }}
                    >
                        <input
                            id="new-song-playlist"
                            aria-label="Playlist name"
                            autoFocus
                            value={playlistName}
                            onChange={(event) => {
                                setPlaylistName(event.target.value);
                                setCreateError("");
                            }}
                            placeholder="Playlist name"
                        />
                        {createError && <span className={menuStyles.createError}>{createError}</span>}
                        <button type="submit" disabled={!playlistName.trim()}>
                            Create Playlist
                        </button>
                        <button type="button" onClick={() => setShowCreateForm(false)}>
                            Cancel
                        </button>
                    </form>
                ) : (
                    <button
                        type="button"
                        className={menuStyles.createPlaylistOption}
                        role="menuitem"
                        onClick={() => setShowCreateForm(true)}
                    >
                        + Create New Playlist
                    </button>
                )}
                <div className={menuStyles.playlistList}>
                    {availablePlaylists.length > 0 ? availablePlaylists.map((playlist) => (
                        <button
                            type="button"
                            role="menuitem"
                            key={playlist.name}
                            onClick={() => {
                                addPlaylist(playlist.name, song.id);
                                onClose();
                            }}
                        >
                            {playlist.name}
                        </button>
                    )) : (
                        <span className={menuStyles.emptyMessage}>No playlists yet</span>
                    )}
                </div>
            </div>
        </ContextMenu>
    );
}

export default SongContext;