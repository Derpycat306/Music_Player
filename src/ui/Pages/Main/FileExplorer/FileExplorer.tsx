import { useEffect, useState } from "react";
import { useExplorer } from "../ExplorerContext";
import { usePlayer } from "../../../AudioPlayer/AudioPlayer";
import styles from "./FileExplorer.module.css";
import ListItem from "./ListItem";
import PlaylistContext from "./LeafContext";

function FileExplorer() {
    const { addPlaylist } = usePlayer();
    const {
        setFilter,
        currentViewType,
        setViewType,
        currentParent,
        currentChildren,
        canReturn,
        returnToParent,
    } = useExplorer()
    const [playlistName, setPlaylistName] = useState("");
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        id: string;
        name: string;
        X: number;
        Y: number;
        isPlaylist: boolean;
    } | null>(null);

    useEffect(() => {
        const closeContext = () => setContextMenu(null);
        window.addEventListener("click", closeContext);
        return () => window.removeEventListener("click", closeContext);
    }, []);

    function createPlaylist() {
        const name = playlistName.trim();
        if (!name) return;
        addPlaylist(name);
        setPlaylistName("");
        setIsCreatingPlaylist(false);
    }

    return (
        <div className={styles.module}>
            <div className={styles.control}>
                <button 
                    aria-pressed={currentViewType === "artists"}
                    onClick={() => setViewType("artists")}
                    >Songs</button>
                <button 
                    aria-pressed={currentViewType === "playlists"}
                    onClick={() => setViewType("playlists")}
                    >Playlists</button>
            </div>

            <div className={styles.name}>{currentParent.name}</div>

            <input type="text" className={styles.search}
                placeholder={"search"}
                onChange={(e) => {setFilter(e.target.value.toLowerCase())}}/>

            {canReturn && <button onClick={returnToParent}>
                Back
            </button>
            }

            <div className={styles.children}>
                {
                    currentChildren.map(child => {
                        return (
                            <ListItem
                                key={child.id}
                                id={child.id}
                                name={child.name}
                                icon={child.art != null ? (
                                    <img
                                        src={`music:///song?path=${encodeURIComponent(child.art)}`}
                                        alt=""
                                    />
                                ) : null}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setContextMenu({
                                        id: child.id,
                                        name: child.name,
                                        X: event.clientX,
                                        Y: event.clientY,
                                        isPlaylist: currentViewType === "playlists" && child.kind === "leaf",
                                    });
                                }}
                            />
                        )
                    })
                }
            </div>

            {currentViewType === "playlists" && (
                <div className={styles.playlistActions}>
                    {isCreatingPlaylist ? (
                        <>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist name"
                                value={playlistName}
                                onChange={(event) => setPlaylistName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") createPlaylist();
                                    if (event.key === "Escape") setIsCreatingPlaylist(false);
                                }}
                            />
                            <button onClick={createPlaylist}>Create Playlist</button>
                        </>
                    ) : (
                        <button onClick={() => setIsCreatingPlaylist(true)}>New Playlist</button>
                    )}
                </div>
            )}

            {contextMenu && (
                <PlaylistContext
                    id={contextMenu.id}
                    name={contextMenu.name}
                    X={contextMenu.X}
                    Y={contextMenu.Y}
                    isPlaylist={contextMenu.isPlaylist}
                    onClose={() => {
                        setContextMenu(null)
                    }}
                />
            )}
        </div>
    );
}

export default FileExplorer;
