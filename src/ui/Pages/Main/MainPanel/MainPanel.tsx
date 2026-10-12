import styles from "./MainPanel.module.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlayer } from "../../../AudioPlayer/useAudioPlayer";
import type { ExplorerChild, ExplorerLeaf } from "../ExplorerContext/ExplorerContext";
import { useExplorer } from "../ExplorerContext/UseExplorer";
import SongContext from "../SongListing/Songs/Item/SongContext";
import { useVirtualList } from "../useVirtualList";

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

function matchesSongSearch(song: Song, query: string): boolean {
    const filters = query.split("/").map((filter) => filter.trim()).filter(Boolean);
    if (filters.length === 0) return false;

    return filters.every((filter) => {
        const prefix = filter[0];
        const isQualified = [".", "@", "#"].includes(prefix ?? "");
        const text = isQualified ? filter.slice(1).trim() : filter;
        if (!text) return !isQualified;
        const normalizedText = text.toLowerCase();

        if (prefix === ".") return song.title.toLowerCase().includes(normalizedText);
        if (prefix === "@") return song.artist?.toLowerCase().includes(normalizedText) ?? false;
        if (prefix === "#") return song.album?.toLowerCase().includes(normalizedText) ?? false;

        return [song.title, song.artist, song.album]
            .some((value) => value?.toLowerCase().includes(normalizedText));
    });
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
    scrollRef,
}: {
    songs: SongListing[];
    canReorder?: boolean;
    onReorder?: (songs: SongListing[]) => boolean;
    editMode?: boolean;
    onRemove?: (songId: string) => void;
    onFavorite: (song: Song, isCurrentlyFavorite: boolean) => void;
    isFavorite: (songId: string) => boolean;
    onContextFavoriteChange: (song: Song, wasFavorite: boolean) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const { playSong, currentSong } = usePlayer();
    const { startQueue, panelSelection } = useExplorer();
    const [draggedSongId, setDraggedSongId] = useState<string | null>(null);
    const [previewSongs, setPreviewSongs] = useState<SongListing[] | null>(null);
    const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(null);
    const previewSongsRef = useRef<SongListing[] | null>(null);
    const dragStartSongsRef = useRef<SongListing[] | null>(null);
    const previousPositionsRef = useRef<Map<string, number> | null>(null);
    const trackElementsRef = useRef(new Map<string, HTMLDivElement>());
    const trackWindowRef = useRef<HTMLDivElement>(null);
    const visibleSongs = previewSongs ?? songs;
    const rowHeight = 54;
    const visibleRange = useVirtualList(scrollRef, trackWindowRef, visibleSongs.length, rowHeight);

    function play(listing: SongListing) {
        startQueue(songs, panelSelection?.id);
        void playSong(listing);
    }

    useLayoutEffect(() => {
        const previousPositions = previousPositionsRef.current;
        if (!previousPositions) return;

        for (const [songId, element] of trackElementsRef.current) {
            const previousTop = previousPositions.get(songId);
            if (previousTop === undefined) continue;

            const offset = previousTop - element.getBoundingClientRect().top;
            if (offset) {
                element.animate(
                    [{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }],
                    { duration: 180, easing: "ease-out" },
                );
            }
        }

        previousPositionsRef.current = null;
    }, [previewSongs]);

    function previewDrop(targetSongId: string, event: React.DragEvent<HTMLDivElement>) {
        if (!canReorder || !draggedSongId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        const currentSongs = previewSongsRef.current ?? songs;
        const sourceIndex = currentSongs.findIndex(({ song }) => song.id === draggedSongId);
        const targetIndex = currentSongs.findIndex(({ song }) => song.id === targetSongId);
        if (sourceIndex < 0 || targetIndex < 0) return;

        const targetBounds = event.currentTarget.getBoundingClientRect();
        const insertAfterTarget = event.clientY >= targetBounds.top + targetBounds.height / 2;
        let destinationIndex = targetIndex + (insertAfterTarget ? 1 : 0);
        if (sourceIndex < destinationIndex) destinationIndex--;
        destinationIndex = Math.max(0, Math.min(destinationIndex, currentSongs.length - 1));
        if (destinationIndex === sourceIndex) return;

        const reordered = [...currentSongs];
        const [movingSong] = reordered.splice(sourceIndex, 1);
        if (!movingSong) return;
        reordered.splice(destinationIndex, 0, movingSong);

        previousPositionsRef.current = new Map(
            [...trackElementsRef.current].map(([songId, element]) => [
                songId,
                element.getBoundingClientRect().top,
            ]),
        );
        previewSongsRef.current = reordered;
        setPreviewSongs(reordered);
    }

    function finishReorder() {
        const initialSongs = dragStartSongsRef.current;
        const reorderedSongs = previewSongsRef.current;
        if (
            initialSongs &&
            reorderedSongs &&
            initialSongs.some((listing, index) => listing.song.id !== reorderedSongs[index]?.song.id)
        ) {
            onReorder?.(reorderedSongs);
        }

        dragStartSongsRef.current = null;
        previewSongsRef.current = null;
        previousPositionsRef.current = null;
        setDraggedSongId(null);
        setPreviewSongs(null);
    }

    return (
        <div className={styles.trackTable}>
            <div
                className={styles.trackWindow}
                ref={trackWindowRef}
                style={{ height: `${Math.max(0, visibleSongs.length * rowHeight - 2)}px` }}
            >
                {visibleSongs.slice(visibleRange.start, visibleRange.end).map((listing, offset) => {
                    const index = visibleRange.start + offset;
                    const favorite = isFavorite(listing.song.id);
                    return (
                        <div
                            ref={(element) => {
                                if (element) {
                                    trackElementsRef.current.set(listing.song.id, element);
                                } else {
                                    trackElementsRef.current.delete(listing.song.id);
                                }
                            }}
                            className={`${styles.track} ${currentSong?.song.id === listing.song.id ? styles.trackCurrent : ""} ${draggedSongId === listing.song.id ? styles.trackDragging : ""}`}
                            style={{ top: `${index * rowHeight}px` }}
                            key={listing.song.id}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                setContextMenu({ song: listing.song, x: event.clientX, y: event.clientY });
                            }}
                            onDragOver={(event) => previewDrop(listing.song.id, event)}
                            onDrop={(event) => {
                                if (!canReorder) return;
                                event.preventDefault();
                                finishReorder();
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
                                        dragStartSongsRef.current = [...songs];
                                        previewSongsRef.current = [...songs];
                                        setPreviewSongs([...songs]);
                                        setDraggedSongId(listing.song.id);
                                        event.dataTransfer.effectAllowed = "move";
                                        event.dataTransfer.setData("text/plain", listing.song.id);
                                    }}
                                    onDragEnd={() => {
                                        if (dragStartSongsRef.current) finishReorder();
                                    }}
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
            </div>
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
        songDetail,
        largeView,
        returnToParent,
        openSelection,
        selectLeaf,
        folder,
        traverse,
        startQueue,
        reorderPlaylist,
        addSongToPlaylist,
        addSongsToPlaylist,
        removePlaylistSong,
        openTemporaryPlaylist,
        renamePlaylist,
        filter,
    } = useExplorer();
    const {
        songs,
        covers,
        currentSong,
        playSong,
        addPlaylist,
        deletePlaylist,
        autoplay,
        repeat,
        toggleAutoplay,
        toggleRepeat,
        createLocalPlaylist,
        setQueue,
        isFavorite,
        toggleFavorite,
    } = usePlayer();
    const pressedByPointer = useRef(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [editMode, setEditMode] = useState(false);
    const [isAddingSongs, setIsAddingSongs] = useState(false);
    const [songSearch, setSongSearch] = useState("");
    const [isRenamingPlaylist, setIsRenamingPlaylist] = useState(false);
    const [playlistNameDraft, setPlaylistNameDraft] = useState("");
    const [playlistRenameError, setPlaylistRenameError] = useState("");

    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0 });
        setEditMode(false);
        setIsAddingSongs(false);
        setSongSearch("");
        setIsRenamingPlaylist(false);
        setPlaylistRenameError("");
    }, [panelSelection?.id, songDetail?.song.id, currentSelectedId, showSelectedDetail]);

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
        const selectedPlaylistName = panelSelection.name;
        const canReorder = isPlaylist && filter.length === 0;
        const currentPlaylistSongIds = new Set(panelSongs.map(({ song }) => song.id));
        const searchQuery = songSearch.trim().toLowerCase();
        const matchingSongs = searchQuery
            ? songs.filter((song) => matchesSongSearch(song, searchQuery))
            : [];
        const songsToAdd = matchingSongs.filter((song) => !currentPlaylistSongIds.has(song.id));
        function savePlaylistName() {
            const name = playlistNameDraft.trim();
            if (!name) {
                setPlaylistRenameError("Playlist name cannot be empty.");
                return;
            }
            if (!renamePlaylist(selectedPlaylistName, name)) {
                setPlaylistRenameError("A playlist with that name already exists.");
                return;
            }
            setIsRenamingPlaylist(false);
            setPlaylistRenameError("");
        }

        function artworkForSong(song: Song): string | null {
            const artist = song.artist;
            const album = song.album;
            const albumArt = album
                ? covers.find((cover) =>
                    cover.id === `album-art:${encodeURIComponent(artist ?? "")}:${encodeURIComponent(album)}`,
                )
                : undefined;
            const artistArt = artist
                ? covers.find((cover) => cover.id === `artist-art:${encodeURIComponent(artist)}`)
                : undefined;
            const rootArt = covers.find((cover) => cover.id === "root-art");
            return albumArt?.coverPath ?? artistArt?.coverPath ?? rootArt?.coverPath ?? null;
        }

        return (
            <>
                <section className={styles.hero}>
                    <div className={`${styles.heroArt} ${!art ? styles.cardArtEmpty : ""}`}>
                        {art && <img src={`music:///song?path=${encodeURIComponent(art)}`} alt="" />}
                        {!art && <span>{isPlaylist ? "♫" : "♪"}</span>}
                    </div>
                    <div className={styles.heroCopy}>
                        <span>{isPlaylist ? "Playlist" : "Album"}</span>
                        {isPlaylist && panelSelection.name.toLowerCase() !== "favorites" && isRenamingPlaylist ? (
                            <div className={styles.playlistRename}>
                                <input
                                    aria-label="Playlist name"
                                    autoFocus
                                    value={playlistNameDraft}
                                    onChange={(event) => {
                                        setPlaylistNameDraft(event.target.value);
                                        setPlaylistRenameError("");
                                    }}
                                    onBlur={() => {
                                        setIsRenamingPlaylist(false);
                                        setPlaylistRenameError("");
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            savePlaylistName();
                                        } else if (event.key === "Escape") {
                                            setIsRenamingPlaylist(false);
                                            setPlaylistRenameError("");
                                        }
                                    }}
                                />
                                {playlistRenameError && (
                                    <small className={styles.playlistRenameError} role="alert">
                                        {playlistRenameError}
                                    </small>
                                )}
                            </div>
                        ) : (
                            <div className={styles.heroTitle}>
                                <h1>{panelSelection.name}</h1>
                                {isPlaylist && panelSelection.name.toLowerCase() !== "favorites" && (
                                    <button
                                        type="button"
                                        className={styles.renamePlaylistButton}
                                        aria-label={`Rename playlist ${panelSelection.name}`}
                                        title="Rename playlist"
                                        onClick={() => {
                                            setPlaylistNameDraft(panelSelection.name);
                                            setPlaylistRenameError("");
                                            setIsRenamingPlaylist(true);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}
                        <p>{panelSelection.songs[0]?.song.artist ?? "Your library"} · {panelSelection.songs.length} songs</p>
                    </div>
                </section>
                <div className={styles.actions}>
                    {panelSelection.songs.length > 0 && (
                        <>
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
                        </>
                    )}
                    {isPlaylist && panelSelection.songs.length > 0 && (
                        <button
                            type="button"
                            className={editMode ? styles.primaryAction : styles.secondaryAction}
                            aria-pressed={editMode}
                            onClick={() => setEditMode((editing) => !editing)}
                        >
                            {editMode ? "Done" : "Edit"}
                        </button>
                    )}
                    {isPlaylist && (
                        <button
                            type="button"
                            className={isAddingSongs ? styles.primaryAction : styles.secondaryAction}
                            aria-pressed={isAddingSongs}
                            onClick={() => {
                                setIsAddingSongs((adding) => !adding);
                                setSongSearch("");
                            }}
                        >
                            {isAddingSongs ? "Done Adding" : "Add Songs"}
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
                {isPlaylist && isAddingSongs && (
                    <section className={styles.addSongs}>
                        <label className={styles.addSongsSearch}>
                            <span>Search your library by song, artist, or album</span>
                            <input
                                type="search"
                                value={songSearch}
                                placeholder="Text, .song, @artist, #album / more filters"
                                onChange={(event) => setSongSearch(event.target.value)}
                                autoFocus
                            />
                            <small>Use .text for song names, @text for artists, #text for albums; / combines filters.</small>
                        </label>
                        {!searchQuery ? (
                            <p className={styles.emptyState}>Enter a name to find songs to add.</p>
                        ) : matchingSongs.length > 0 ? (
                            <>
                                <div className={styles.addSongsToolbar}>
                                    <span>{songsToAdd.length} songs available to add</span>
                                    <button
                                        type="button"
                                        className={styles.secondaryAction}
                                        disabled={songsToAdd.length === 0}
                                        onClick={() => addSongsToPlaylist(songsToAdd.map((song) => ({
                                            song,
                                            art: artworkForSong(song),
                                        })))}
                                    >
                                        Add All
                                    </button>
                                </div>
                                <div className={styles.addSongsResults}>
                                    {matchingSongs.map((song) => {
                                    const songArt = artworkForSong(song);
                                    const isInPlaylist = currentPlaylistSongIds.has(song.id);
                                    return (
                                        <button
                                            type="button"
                                            className={styles.addSongResult}
                                            key={song.id}
                                            aria-pressed={isInPlaylist}
                                            aria-label={`${isInPlaylist ? "Remove" : "Add"} ${song.title} ${isInPlaylist ? "from" : "to"} ${panelSelection.name}`}
                                            onClick={() => addSongToPlaylist({ song, art: songArt })}
                                        >
                                            <div className={styles.addSongArt}>
                                                {songArt ? (
                                                    <img
                                                        src={`music:///song?path=${encodeURIComponent(songArt)}`}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span aria-hidden="true">♫</span>
                                                )}
                                            </div>
                                            <span className={styles.addSongInfo}>
                                                <strong>{song.title}</strong>
                                                <small>{song.artist ?? "Unknown Artist"} · {song.album ?? "Single"}</small>
                                            </span>
                                            <span className={styles.addSongAction}>
                                                {isInPlaylist ? "Remove" : "Add"}
                                            </span>
                                        </button>
                                    );
                                    })}
                                </div>
                            </>
                        ) : (
                            <p className={styles.emptyState}>No matching songs left to add.</p>
                        )}
                    </section>
                )}
                {isPlaylist && panelSelection.songs.length === 0 && (
                    <div className={styles.emptyPlaylist}>
                        <p>This playlist is waiting for its first encore.</p>
                        <button
                            type="button"
                            className={styles.emptyPlaylistAction}
                            onClick={() => {
                                setIsAddingSongs(true);
                                setSongSearch("");
                            }}
                        >
                            Add songs to get things started
                        </button>
                    </div>
                )}
                <TrackTable
                    songs={panelSongs}
                    canReorder={canReorder}
                    onReorder={reorderPlaylist}
                    editMode={editMode}
                    onRemove={removePlaylistSong}
                    onFavorite={toggleSongFavorite}
                    isFavorite={isFavorite}
                    onContextFavoriteChange={removeFavoriteFromOpenList}
                    scrollRef={contentRef}
                />
            </>
        );
    }

    const view = largeView && currentSong
        ? (
            <section className={styles.songDetail}>
                <div className={`${styles.songDetailArt} ${!currentSong.art ? styles.cardArtEmpty : ""}`}>
                    {currentSong.art
                        ? <img src={`music:///song?path=${encodeURIComponent(currentSong.art)}`} alt="" />
                        : <span aria-hidden="true">♫</span>}
                </div>
                <div className={styles.songDetailCopy}>
                    <p className={styles.eyebrow}>Now Playing</p>
                    <h1>{currentSong.song.title}</h1>
                    <p>{currentSong.song.artist ?? "Unknown Artist"}</p>
                    <p>{currentSong.song.album ?? "Single"}</p>
                    <div className={styles.songDetailActions}>
                        <button
                            type="button"
                            className={styles.primaryAction}
                            onClick={() => void playSong(currentSong)}
                        >
                            Play
                        </button>
                        <button
                            type="button"
                            className={autoplay ? styles.primaryAction : styles.secondaryAction}
                            aria-pressed={autoplay}
                            onClick={toggleAutoplay}
                        >
                            Autoplay
                        </button>
                    </div>
                </div>
            </section>
        )
        : songDetail
        ? (
            <section className={styles.songDetail}>
                <div className={`${styles.songDetailArt} ${!songDetail.art ? styles.cardArtEmpty : ""}`}>
                    {songDetail.art
                        ? <img src={`music:///song?path=${encodeURIComponent(songDetail.art)}`} alt="" />
                        : <span aria-hidden="true">♫</span>}
                </div>
                <div className={styles.songDetailCopy}>
                    <p className={styles.eyebrow}>Song</p>
                    <h1>{songDetail.song.title}</h1>
                    <p>{songDetail.song.artist ?? "Unknown Artist"}</p>
                    <p>{songDetail.song.album ?? "Single"}</p>
                    <div className={styles.songDetailActions}>
                        <button
                            type="button"
                            className={styles.primaryAction}
                            onClick={() => {
                                startQueue([songDetail], `song:${songDetail.song.id}`);
                                void playSong(songDetail);
                            }}
                        >
                            Play
                        </button>
                        <button
                            type="button"
                            className={repeat ? styles.primaryAction : styles.secondaryAction}
                            aria-pressed={repeat}
                            onClick={toggleRepeat}
                        >
                            Repeat
                        </button>
                    </div>
                </div>
            </section>
        )
        : selectedLeafIsInCurrentContext
        ? <DetailView />
        : panelSelection?.kind === "directory"
            ? <DirectoryView />
            : <HomeView />;

    const isEmptyPlaylist = panelSelection?.kind === "leaf" &&
        panelSelection.id.startsWith("playlist:") &&
        panelSelection.songs.length === 0;

    return (
        <div className={styles.main}>
            <div
                ref={contentRef}
                className={`${styles.content} ${songDetail || largeView ? styles.songDetailContent : ""} ${isEmptyPlaylist && !isAddingSongs ? styles.emptyPlaylistContent : ""}`}
            >
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
