import styles from "./MainPanel.module.css";
import { useEffect, useRef, useState } from "react";
import { useExplorer, type ExplorerChild, type ExplorerLeaf } from "../ExplorerContext";
import { usePlayer } from "../../../AudioPlayer/AudioPlayer";

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

function TrackTable({ songs }: { songs: SongListing[] }) {
    const { playSong, currentSong } = usePlayer();
    const { startQueue, panelSelection } = useExplorer();
    const pressedByPointer = useRef(false);

    function play(listing: SongListing) {
        startQueue(songs, panelSelection?.id);
        void playSong(listing);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, listing: SongListing) {
        if (event.button !== 0) return;
        pressedByPointer.current = true;
        event.preventDefault();
        play(listing);
    }

    function handleClick(listing: SongListing) {
        if (pressedByPointer.current) {
            pressedByPointer.current = false;
            return;
        }

        play(listing);
    }

    return (
        <div className={styles.trackTable}>
            {songs.map((listing, index) => (
                <button
                    type="button"
                    className={`${styles.track} ${currentSong?.song.id === listing.song.id ? styles.trackCurrent : ""}`}
                    key={listing.song.id}
                    onPointerDown={(event) => handlePointerDown(event, listing)}
                    onClick={() => handleClick(listing)}
                >
                    <span className={styles.trackNumber}>{index + 1}</span>
                    <span className={styles.trackTitle}>
                        <strong>{listing.song.title}</strong>
                        <small>{listing.song.artist ?? "Unknown Artist"}</small>
                    </span>
                    <span className={styles.trackAlbum}>{listing.song.album ?? "Single"}</span>
                    <span className={styles.trackDuration}>{formatDuration(listing.song.duration)}</span>
                </button>
            ))}
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
        openTemporaryPlaylist,
    } = useExplorer();
    const { songs, playSong, addPlaylist, deletePlaylist, autoplay, toggleAutoplay, createLocalPlaylist, setQueue } = usePlayer();
    const pressedByPointer = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 });
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

    function playSelection(leaf: ExplorerLeaf, shuffle = false) {
        const baseQueue = selectLeaf(leaf.id);
        const orderedQueue = shuffle ? shuffleArray(baseQueue) : baseQueue;

        const localPlaylistName = "Shuffle";
        if (shuffle) {
            createLocalPlaylist(localPlaylistName, orderedQueue);
            setQueue(orderedQueue);
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
                <TrackTable songs={panelSongs} />
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
