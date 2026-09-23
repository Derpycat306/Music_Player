import { useEffect, useState } from "react";
import { useExplorer } from "../ExplorerContext";
import { usePlayer } from "../../../AudioPlayer/AudioPlayer";
import styles from "./FileExplorer.module.css";
import ListItem from "./ListItem";
import PlaylistContext from "./LeafContext";

function FileExplorer() {
    const { playSong } = usePlayer();
    const {
        setFilter,
        currentViewType,
        setViewType,
        openView,
        currentChildren,
        startQueue,
        traverse,
    } = useExplorer()
    const [isThinView, setIsThinView] = useState(() => window.innerWidth <= 700);
    const [contextMenu, setContextMenu] = useState<{
        id: string;
        name: string;
        X: number;
        Y: number;
        isPlaylist: boolean;
    } | null>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 700px)");
        const updateView = () => setIsThinView(mediaQuery.matches);
        updateView();
        mediaQuery.addEventListener("change", updateView);

        return () => mediaQuery.removeEventListener("change", updateView);
    }, []);

    function selectItem(id: string) {
        const child = currentChildren.find((entry) => entry.id === id);
        const selectedSongs = traverse(id);

        if (isThinView && child?.kind === "leaf" && selectedSongs.length > 0) {
            startQueue(selectedSongs, id);
            void playSong(selectedSongs[0]!);
        }
    }

    return (
        <div className={styles.module}>
            <div className={styles.control}>
                <button 
                    aria-pressed={currentViewType === "artists"}
                    onClick={() => setViewType("artists")}
                    >Artists</button>
                <button 
                    aria-pressed={currentViewType === "albums"}
                    onClick={() => setViewType("albums")}
                    >Albums</button>
                <button 
                    aria-pressed={currentViewType === "playlists"}
                    onClick={() => setViewType("playlists")}
                    >Playlists</button>
            </div>

            <input type="text" className={styles.search}
                placeholder={"search"}
                onChange={(e) => {setFilter(e.target.value.toLowerCase())}}/>

            <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                    {currentViewType[0].toUpperCase() + currentViewType.slice(1)}
                </span>
                <button
                    type="button"
                    className={styles.sectionAction}
                    aria-label={`Show all ${currentViewType}`}
                    onClick={openView}
                >
                    View all
                </button>
            </div>

            <div className={styles.children}>
                {
                    currentChildren.map(child => {
                        return (
                            <ListItem
                                key={child.id}
                                id={child.id}
                                name={child.name}
                                onSelect={() => selectItem(child.id)}
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
