import styles from "./MainPanel.module.css";
import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../../../AudioPlayer/useAudioPlayer";
import type { ExplorerChild, ExplorerLeaf } from "../ExplorerContext/ExplorerContext";
import { useExplorer } from "../ExplorerContext/UseExplorer";
import SongContext from "../SongListing/Songs/Item/SongContext";

function artworkFor(child: ExplorerChild): string | null {
    if (child.kind === "leaf") return child.art ?? child.songs[0]?.art ?? null;
    return child.children.find((entry) => entry.kind === "leaf")?.art ?? null;
}

function cardType(child: ExplorerChild): string {
    if (child.kind === "directory") return "Artist";
    if (child.id.startsWith("album:")) return "Album";
    if (child.id.startsWith("playlist:")) return "Playlist";
    return "Collection";
}

function Card({ child, onSelect }: { child: ExplorerChild; onSelect: (child: ExplorerChild) => void }) {
    const art = artworkFor(child);
    const pressedByPointer = useRef(false);

    function activate() {
        onSelect(child);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
        if (event.button !== 0) return;
        pressedByPointer.current = true;
        event.preventDefault();
        activate();
    }

    function handleClick() {
        if (pressedByPointer.current) {
            pressedByPointer.current = false;
            return;
        }

        activate();
    }

    return (
        <button type="button" className={styles.card} onPointerDown={handlePointerDown} onClick={handleClick}>
            <div className={`${styles.cardArt} ${!art ? styles.cardArtEmpty : ""}`}>
                {art && <img src={`music:///song?path=${encodeURIComponent(art)}`} alt="" />}
                {!art && <span>{child.kind === "directory" ? "♪" : "♫"}</span>}
            </div>
            <strong>{child.name}</strong>
            <span>{cardType(child)}</span>
        </button>
    );
}

function PlaylistCard({
    child,
    onSelect,
    onDelete,
}: {
    child: ExplorerChild;
    onSelect: (child: ExplorerChild) => void;
    onDelete: (name: string) => void;
}) {
    const art = artworkFor(child);

    return (
        <div className={styles.playlistCard}>
            <button type="button" className={styles.playlistCardSelect} onClick={() => onSelect(child)}>
                <div className={`${styles.cardArt} ${!art ? styles.cardArtEmpty : ""}`}>
                    {art && <img src={`music:///song?path=${encodeURIComponent(art)}`} alt="" />}
                    {!art && <span>♫</span>}
                </div>
                <strong>{child.name}</strong>
                <span>Playlist</span>
            </button>
            {child.name.toLowerCase() !== "favorites" && (
                <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(child.name)}
                >
                    Delete
                </button>
            )}
        </div>
    );
}

function TrackTable({
    songs,
    canReorder = false,
    onReorder,
    editMode = false,
    onRemove,
    onFavorite,
    isFavorite,
    onContextFavoriteChange,
}: {
    songs: SongListing[];
    canReorder?: boolean;
    onReorder?: (songs: SongListing[]) => boolean;
    editMode?: boolean;
    onRemove?: (songId: string) => void;
    onFavorite: (song: Song, isCurrentlyFavorite: boolean) => void;
    isFavorite: (songId: string) => boolean;
    onContextFavoriteChange: (song: Song, wasFavorite: boolean) => void;
}) {
    const { playSong, currentSong } = usePlayer();
    const { startQueue, panelSelection } = useExplorer();
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);

    function play(listing: SongListing) {
        startQueue(songs, panelSelection?.id);
        void playSong(listing);
    }

    function swapSongs(sourceIndex: number, targetIndex: number) {
        if (!canReorder || sourceIndex === targetIndex) return;

        const reordered = [...songs];
        [reordered[sourceIndex], reordered[targetIndex]] = [
            reordered[targetIndex]!,
            reordered[sourceIndex]!,
        ];
        onReorder?.(reordered);
    }

    return (
        <div className={styles.trackTable}>
            {songs.map((listing, index) => {
                const favorite = isFavorite(listing.song.id);
                return (
                    <div
                        className={`${styles.track} ${currentSong?.song.id === listing.song.id ? styles.trackCurrent : ""} ${draggedIndex === index ? styles.trackDragging : ""}`}
                        key={listing.song.id}
                        onContextMenu={(event) => {
                            event.preventDefault();
                            setContextMenu({ song: listing.song, x: event.clientX, y: event.clientY });
                        }}
                        onDragOver={(event) => {
                            if (canReorder && draggedIndex !== null) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                            }
                        }}
                        onDrop={(event) => {
                            if (!canReorder) return;
                            event.preventDefault();
                            const sourceIndex = Number(event.dataTransfer.getData("text/plain"));
                            if (Number.isInteger(sourceIndex) && sourceIndex >= 0 && sourceIndex < songs.length) {
                                swapSongs(sourceIndex, index);
                            }
                            setDraggedIndex(null);
                        }}
                    >
                        <span className={styles.trackNumber}>{index + 1}</span>
                        {canReorder ? (
                            <button
                                type="button"
                                className={styles.trackDragHandle}
                                draggable
                                aria-label={`Reorder ${listing.song.title}`}
                                title="Drag to move"
                                onDragStart={(event) => {
                                    setDraggedIndex(index);
                                    event.dataTransfer.effectAllowed = "move";
                                    event.dataTransfer.setData("text/plain", String(index));
                                }}
                                onDragEnd={() => setDraggedIndex(null)}
                            >
                                <span />
                                <span />
                                <span />
                            </button>
                        ) : (
                            <span className={styles.trackDragSpacer} />
                        )}
                        <button
                            type="button"
                            className={styles.trackPlay}
                            onClick={() => play(listing)}
                            aria-label={`Play ${listing.song.title}`}
                        >
                            <span className={styles.trackTitle}>
                                <strong>{listing.song.title}</strong>
                                <small>{listing.song.artist ?? "Unknown Artist"}</small>
                            </span>
                            <span className={styles.trackAlbum}>{listing.song.album ?? "Single"}</span>
                            <span className={styles.trackDuration}>{formatDuration(listing.song.duration)}</span>
                        </button>
                        <div className={styles.trackActions}>
                            {editMode && (
                                <button
                                    type="button"
                                    className={styles.trackRemoveButton}
                                    aria-label={`Remove ${listing.song.title} from this list`}
                                    title="Remove from this list"
                                    onClick={() => onRemove?.(listing.song.id)}
                                >
                                    ×
                                </button>
                            )}
                            <button
                                type="button"
                                className={`${styles.trackAction} ${favorite ? styles.trackActionActive : ""}`}
                                aria-label={favorite ? `Remove ${listing.song.title} from Favorites` : `Add ${listing.song.title} to Favorites`}
                                aria-pressed={favorite}
                                title={favorite ? "Remove from Favorites" : "Add to Favorites"}
                                onClick={() => onFavorite(listing.song, favorite)}
                            >
                                {favorite ? "★" : "☆"}
                            </button>
                            <button
                                type="button"
                                className={styles.trackMenuButton}
                                aria-label={`More actions for ${listing.song.title}`}
                                title="More song actions"
                                onClick={(event) => {
                                    const bounds = event.currentTarget.getBoundingClientRect();
                                    setContextMenu({
                                        song: listing.song,
                                        x: bounds.left,
                                        y: bounds.bottom,
                                    });
                                }}
                            >
                                ⋯
                            </button>
                        </div>
                    </div>
                );
            })}
            {contextMenu && (
                <SongContext
                    song={contextMenu.song}
                    X={contextMenu.x}
                    Y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onFavoriteChange={onContextFavoriteChange}
                />
            )}
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) return "--:--";
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];

    for (let index = result.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex]!, result[index]!];
    }

    return result;
}

function PlaylistForm({ addPlaylist }: { addPlaylist: (name: string) => void }) {
    const [playlistName, setPlaylistName] = useState("");

    function createPlaylist() {
        const name = playlistName.trim();
        if (!name) return;
        addPlaylist(name);
        setPlaylistName("");
    }

    return (
        <div className={styles.playlistForm}>
            <input
                type="text"
                value={playlistName}
                placeholder="Playlist name"
                onChange={(event) => setPlaylistName(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") createPlaylist();
                }}
            />
            <button type="button" className={styles.primaryAction} onClick={createPlaylist}>
                Add Playlist
            </button>
        </div>
    );
}

function MainPanel() {
    const {
        currentSelectedId,
        panelSongs,
        showSelectedDetail,
        recentAlbums,
        panelSelection,
        panelChildren,
        panelCanReturn,
        returnToParent,
        openSelection,
        selectLeaf,
        folder,
        traverse,
        startQueue,
        reorderPlaylist,
        removePlaylistSong,
        openTemporaryPlaylist,
        filter,
    } = useExplorer();
    const {
        songs,
        playSong,
        addPlaylist,
        deletePlaylist,
        autoplay,
        toggleAutoplay,
        createLocalPlaylist,
        setQueue,
        isFavorite,
        toggleFavorite,
    } = usePlayer();
    const pressedByPointer = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 });
        setEditMode(false);
    }, [panelSelection?.id, currentSelectedId, showSelectedDetail]);

    const artists = folder.artistsRoot.children;
    const playlists = folder.playlistsRoot.children;
    const canGoBack = panelCanReturn || panelSelection?.id.startsWith("playlist:") === true;

    function goBack() {
        returnToParent();
    }

    function deletePlaylistFromView(name: string) {
        if (window.confirm(`Delete playlist "${name}"?`)) {
            deletePlaylist(name);
        }
    }

    function toggleSongFavorite(song: Song, isCurrentlyFavorite: boolean) {
        toggleFavorite(song.id);
        removeFavoriteFromOpenList(song, isCurrentlyFavorite);
    }

    function removeFavoriteFromOpenList(song: Song, wasFavorite: boolean) {
        if (wasFavorite && panelSelection?.id.toLowerCase() === "playlist:favorites") {
            reorderPlaylist(panelSongs.filter((listing) => listing.song.id !== song.id));
        }
    }

    function playSelection(leaf: ExplorerLeaf, shuffle = false) {
        const baseQueue = selectLeaf(leaf.id);
        const orderedQueue = shuffle ? shuffleArray(baseQueue) : baseQueue;

        const localPlaylistName = "Shuffle";
        if (shuffle) {
            createLocalPlaylist(localPlaylistName, orderedQueue);
            setQueue(orderedQueue, `playlist:${localPlaylistName}`);
            openTemporaryPlaylist(localPlaylistName, orderedQueue);
        } else {
            startQueue(orderedQueue, leaf.id);
        }

        const firstSong = orderedQueue[0];
        if (firstSong) void playSong(firstSong);
    }

    function selectCard(child: ExplorerChild) {
        if (child.kind === "directory") {
            traverse(child.id);
            return;
        }

        openSelection(child.id);
    }

    function handleActionPointerDown(event: React.PointerEvent<HTMLButtonElement>, action: () => void) {
        if (event.button !== 0) return;
        pressedByPointer.current = true;
        event.preventDefault();
        action();
    }

    function handleActionClick(action: () => void) {
        if (pressedByPointer.current) {
            pressedByPointer.current = false;
            return;
        }

        action();
    }

    function HomeView() {
        return (
            <>
                <section className={styles.welcome}>
                    <p className={styles.eyebrow}>Your library</p>
                    <h1>Good evening</h1>
                    <p>Pick up where you left off.</p>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeading}><h2>Recently viewed albums</h2></div>
                    {recentAlbums.length > 0 ? (
                        <div className={styles.cardGrid}>
                            {recentAlbums.map((album) => (
                                <Card key={album.id} child={album} onSelect={selectCard} />
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyState}>Albums you open will appear here.</p>
                    )}
                </section>

                {artists.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeading}>
                            <h2>Artists</h2>
                            <span>{songs.length} songs in your library</span>
                        </div>
                        <div className={styles.cardGrid}>
                            {artists.map((artist) => (
                                <Card key={artist.id} child={artist} onSelect={selectCard} />
                            ))}
                        </div>
                    </section>
                )}

                {playlists.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeading}><h2>Your playlists</h2></div>
                        <div className={styles.cardGrid}>
                            {playlists.slice(0, 8).map((playlist) => (
                                <Card key={playlist.id} child={playlist} onSelect={selectCard} />
                            ))}
                        </div>
                    </section>
                )}
            </>
        );
    }

    function DirectoryView() {
        const isPlaylistRoot = panelSelection?.id === "playlists-root";
        const viewName = panelSelection?.name ?? "Library";

        return (
            <>
                <section className={styles.welcome}>
                    <p className={styles.eyebrow}>Browse</p>
                    <h1>{viewName}</h1>
                    <p>{panelChildren.length} {panelChildren.length === 1 ? "release" : "releases"}</p>
                </section>

                <section className={styles.section}>
                    {isPlaylistRoot && (
                        <PlaylistForm addPlaylist={addPlaylist} />
                    )}
                    <div className={styles.sectionHeading}>
                        <h2>{viewName}</h2>
                    </div>
                    {panelChildren.length > 0 || isPlaylistRoot ? (
                        <div className={styles.cardGrid}>
                            {panelChildren.map((child) => (
                                isPlaylistRoot ? (
                                    <PlaylistCard
                                        key={child.id}
                                        child={child}
                                        onSelect={selectCard}
                                        onDelete={deletePlaylistFromView}
                                    />
                                ) : (
                                    <Card key={child.id} child={child} onSelect={selectCard} />
                                )
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyState}>No albums found for this artist.</p>
                    )}
                </section>
            </>
        );
    }

    const selectedLeafIsInCurrentContext = showSelectedDetail && panelSelection?.kind === "leaf";

    function DetailView() {
        if (panelSelection?.kind !== "leaf") return <HomeView />;
        const art = panelSelection.art ?? panelSelection.songs[0]?.art;
        const isPlaylist = panelSelection.id.startsWith("playlist:");
        const canReorder = isPlaylist && filter.length === 0;

        return (
            <>
                <section className={styles.hero}>
                    <div className={`${styles.heroArt} ${!art ? styles.cardArtEmpty : ""}`}>
                        {art && <img src={`music:///song?path=${encodeURIComponent(art)}`} alt="" />}
                        {!art && <span>{isPlaylist ? "♫" : "♪"}</span>}
                    </div>
                    <div className={styles.heroCopy}>
                        <span>{isPlaylist ? "Playlist" : "Album"}</span>
                        <h1>{panelSelection.name}</h1>
                        <p>{panelSelection.songs[0]?.song.artist ?? "Your library"} · {panelSelection.songs.length} songs</p>
                    </div>
                </section>
                <div className={styles.actions}>
                    <button type="button" className={styles.primaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, () => playSelection(panelSelection))}
                        onClick={() => handleActionClick(() => playSelection(panelSelection))}>Play</button>
                    <button type="button" className={styles.secondaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, () => playSelection(panelSelection, true))}
                        onClick={() => handleActionClick(() => playSelection(panelSelection, true))}>Shuffle</button>
                    <button type="button" 
                        className={autoplay ? styles.primaryAction : styles.secondaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, toggleAutoplay)}
                        onClick={() => handleActionClick(toggleAutoplay)}>Autoplay</button>
                    {isPlaylist && (
                        <button
                            type="button"
                            className={editMode ? styles.primaryAction : styles.secondaryAction}
                            aria-pressed={editMode}
                            onClick={() => setEditMode((editing) => !editing)}
                        >
                            {editMode ? "Done" : "Edit"}
                        </button>
                    )}
                    {isPlaylist && panelSelection.name !== "Favorites" && (
                        <button
                            type="button"
                            className={styles.secondaryAction}
                            onClick={() => deletePlaylistFromView(panelSelection.name)}
                        >
                            Delete Playlist
                        </button>
                    )}
                </div>
                <TrackTable
                    songs={panelSongs}
                    canReorder={canReorder}
                    onReorder={reorderPlaylist}
                    editMode={editMode}
                    onRemove={removePlaylistSong}
                    onFavorite={toggleSongFavorite}
                    isFavorite={isFavorite}
                    onContextFavoriteChange={removeFavoriteFromOpenList}
                />
            </>
        );
    }

    const view = selectedLeafIsInCurrentContext
        ? <DetailView />
        : panelSelection?.kind === "directory"
            ? <DirectoryView />
            : <HomeView />;

    return (
        <div className={styles.main}>
            <div ref={contentRef} className={styles.content}>
                {canGoBack && (
                    <button
                        type="button"
                        className={`${styles.secondaryAction} ${styles.backButton}`}
                        onClick={goBack}
                    >
                        Back
                    </button>
                )}
                {view}
            </div>
        </div>
    );
}

export default MainPanel;
