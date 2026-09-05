import styles from "./MainPanel.module.css";
import { useRef } from "react";
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

function TrackTable({ songs }: { songs: SongListing[] }) {
    const { playSong, currentSong, } = usePlayer();
    const pressedByPointer = useRef(false);

    function play(listing: SongListing) {
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

function MainPanel() {
    const {
        currentSelectedType,
        currentSelected,
        currentSongs,
        currentParent,
        currentChildren,
        canReturn,
        folder,
        traverse,
        selectLeaf,
    } = useExplorer();
    const { songs, playSong, autoplay, toggleAutoplay } = usePlayer();
    const pressedByPointer = useRef(false);

    const artists = folder.artistsRoot.children;
    const playlists = folder.playlistsRoot.children;
    const albums = artists
        .flatMap((artist) => artist.kind === "directory" ? artist.children : [])
        .slice(0, 8);

    function playSelection(leaf: ExplorerLeaf, shuffle = false) {
        const queue = selectLeaf(leaf.id, shuffle);
        const firstSong = queue[0];
        if (firstSong) void playSong(firstSong);
    }

    function selectCard(child: ExplorerChild) {
        if (child.kind === "directory") {
            traverse(child.id);
            return;
        }

        selectLeaf(child.id);
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
                    <div className={styles.sectionHeading}>
                        <h2>Quick picks</h2>
                        <span>{songs.length} songs in your library</span>
                    </div>
                    <div className={styles.cardGrid}>
                        {artists.slice(0, 6).map((artist) => (
                            <Card key={artist.id} child={artist} onSelect={selectCard} />
                        ))}
                    </div>
                </section>

                {albums.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeading}><h2>Albums</h2></div>
                        <div className={styles.cardGrid}>
                            {albums.map((album) => (
                                <Card key={album.id} child={album} onSelect={selectCard} />
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
        return (
            <>
                <section className={styles.welcome}>
                    <p className={styles.eyebrow}>Artist</p>
                    <h1>{currentParent.name}</h1>
                    <p>{currentChildren.length} {currentChildren.length === 1 ? "release" : "releases"}</p>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeading}>
                        <h2>Albums</h2>
                    </div>
                    {currentChildren.length > 0 ? (
                        <div className={styles.cardGrid}>
                            {currentChildren.map((child) => (
                                <Card key={child.id} child={child} onSelect={selectCard} />
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyState}>No albums found for this artist.</p>
                    )}
                </section>
            </>
        );
    }

    function DetailView() {
        if (!currentSelected) return <HomeView />;
        const art = currentSelected.art ?? currentSelected.songs[0]?.art;
        const isPlaylist = currentSelectedType === "playlist";

        return (
            <>
                <section className={styles.hero}>
                    <div className={`${styles.heroArt} ${!art ? styles.cardArtEmpty : ""}`}>
                        {art && <img src={`music:///song?path=${encodeURIComponent(art)}`} alt="" />}
                        {!art && <span>{isPlaylist ? "♫" : "♪"}</span>}
                    </div>
                    <div className={styles.heroCopy}>
                        <span>{isPlaylist ? "Playlist" : "Album"}</span>
                        <h1>{currentSelected.name}</h1>
                        <p>{currentSelected.songs[0]?.song.artist ?? "Your library"} · {currentSelected.songs.length} songs</p>
                    </div>
                </section>
                <div className={styles.actions}>
                    <button type="button" className={styles.primaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, () => playSelection(currentSelected))}
                        onClick={() => handleActionClick(() => playSelection(currentSelected))}>Play</button>
                    <button type="button" className={styles.secondaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, () => playSelection(currentSelected, true))}
                        onClick={() => handleActionClick(() => playSelection(currentSelected, true))}>Shuffle</button>
                    <button type="button" 
                        className={autoplay ? styles.primaryAction : styles.secondaryAction}
                        onPointerDown={(event) => handleActionPointerDown(event, toggleAutoplay)}
                        onClick={() => handleActionClick(toggleAutoplay)}>Autoplay</button>
                </div>
                <TrackTable songs={currentSongs} />
            </>
        );
    }

    const view = currentSelectedType !== "none"
        ? <DetailView />
        : canReturn
            ? <DirectoryView />
            : <HomeView />;

    return (
        <div className={styles.main}>
            <div className={styles.content}>{view}</div>
        </div>
    );
}

export default MainPanel;
