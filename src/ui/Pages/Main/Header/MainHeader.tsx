import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHoriz, Settings } from "iconoir-react";
import { usePlayer } from "../../../AudioPlayer/useAudioPlayer";
import ContextMenu from "../../../ContextMenu/ContextMenu";
import { useExplorer } from "../ExplorerContext/UseExplorer";
import styles from "./MainHeader.module.css";

type SearchResult = {
    id: string;
    name: string;
    detail: string;
    art: string | null;
} & (
    | { kind: "Artist" | "Album" | "Playlist"; listing?: never }
    | { kind: "Song"; listing: SongListing }
);

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];

    for (let index = result.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex]!, result[index]!];
    }

    return result;
}

function clampNumber(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(Math.round(value), min), max);
}

function getSongArt(song: Song, covers: AlbumCover[]): string | null {
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

function MainHeader() {
    const { songs, covers, playSong, createLocalPlaylist } = usePlayer();
    const { openTemporaryPlaylist, setViewType, searchFolder, openSearchItem } = useExplorer();
    const [menuOpen, setMenuOpen] = useState(false);
    const [shuffleOpen, setShuffleOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [songCount, setSongCount] = useState(1);
    const [albumCount, setAlbumCount] = useState(1);
    const [shuffleWithinAlbums, setShuffleWithinAlbums] = useState(false);
    const [mode, setMode] = useState<"songs" | "albums">("songs");
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const albumGroups = useMemo(() => {
        const groups = new Map<string, Song[]>();

        for (const song of songs) {
            const albumName = song.album?.trim() || "Singles";
            const group = groups.get(albumName) ?? [];
            group.push(song);
            groups.set(albumName, group);
        }

        return [...groups.entries()].map(([name, albumSongs]) => ({
            name,
            songs: albumSongs,
        }));
    }, [songs]);

    const searchResults = useMemo<SearchResult[]>(() => {
        const query = search.trim().toLowerCase();
        if (!query) return [];

        const results: SearchResult[] = [];
        for (const artist of searchFolder.artistsRoot.children) {
            if (artist.kind === "directory" && artist.name.toLowerCase().includes(query)) {
                results.push({
                    kind: "Artist",
                    id: artist.id,
                    name: artist.name,
                    detail: `${artist.children.length} albums`,
                    art: artist.art ?? null,
                });
            }
        }

        for (const album of searchFolder.albumsRoot.children) {
            if (album.kind !== "leaf") continue;
            const artist = album.songs[0]?.song.artist ?? "";
            if (album.name.toLowerCase().includes(query) || artist.toLowerCase().includes(query)) {
                results.push({
                    kind: "Album",
                    id: album.id,
                    name: album.name,
                    detail: `${artist || "Unknown Artist"} · ${album.songs.length} songs`,
                    art: album.art ?? album.songs[0]?.art ?? null,
                });
            }
        }

        for (const playlist of searchFolder.playlistsRoot.children) {
            if (playlist.kind === "leaf" && playlist.name.toLowerCase().includes(query)) {
                results.push({
                    kind: "Playlist",
                    id: playlist.id,
                    name: playlist.name,
                    detail: `${playlist.songs.length} songs`,
                    art: playlist.art ?? playlist.songs[0]?.art ?? null,
                });
            }
        }

        for (const song of songs) {
            const artist = song.artist ?? "";
            const album = song.album ?? "";
            if (
                song.title.toLowerCase().includes(query) ||
                artist.toLowerCase().includes(query) ||
                album.toLowerCase().includes(query)
            ) {
                const listing = { song, art: getSongArt(song, covers) };
                results.push({
                    kind: "Song",
                    id: song.id,
                    name: song.title,
                    detail: `${artist || "Unknown Artist"} · ${album || "Single"}`,
                    art: listing.art,
                    listing,
                });
            }
        }

        return results.slice(0, 30);
    }, [search, searchFolder, songs, covers]);

    useEffect(() => {
        function closeSearch(event: MouseEvent) {
            if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
        }

        function handleSearchKey(event: KeyboardEvent) {
            if (event.key === "Escape") setSearchOpen(false);
        }

        document.addEventListener("mousedown", closeSearch);
        document.addEventListener("keydown", handleSearchKey);
        return () => {
            document.removeEventListener("mousedown", closeSearch);
            document.removeEventListener("keydown", handleSearchKey);
        };
    }, []);

    function closeMenus() {
        setMenuOpen(false);
        setShuffleOpen(false);
    }

    function selectSearchResult(result: SearchResult) {
        const type = result.kind === "Artist" ? "artists"
            : result.kind === "Album" ? "albums"
                : result.kind === "Playlist" ? "playlists"
                    : "song";
        openSearchItem(type, result.id, result.kind === "Song" ? result.listing : undefined);
        setSearch("");
        setSearchOpen(false);
    }

    function openMenu(event: React.MouseEvent<HTMLButtonElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom + 8 });
        setMenuOpen(true);
        setShuffleOpen(false);
    }

    function setModeCount(nextValue: number) {
        if (mode === "songs") {
            setSongCount(clampNumber(nextValue, 1, songs.length || 1));
            return;
        }

        setAlbumCount(clampNumber(nextValue, 1, albumGroups.length || 1));
    }

    function queueRandomSongs() {
        if (songs.length === 0) {
            closeMenus();
            return;
        }

        const normalizedCount = clampNumber(songCount, 1, songs.length);
        const selectedSongs = shuffleArray(songs).slice(0, normalizedCount);
        const queue = selectedSongs.map((song) => ({ song, art: getSongArt(song, covers) }));

        const playlistName = "Shuffle";
        createLocalPlaylist(playlistName, queue);
        setViewType("playlists");
        openTemporaryPlaylist(playlistName, queue);
        if (queue[0]) void playSong(queue[0]);
        closeMenus();
    }

    function queueRandomAlbums() {
        if (albumGroups.length === 0) {
            closeMenus();
            return;
        }

        const normalizedCount = clampNumber(albumCount, 1, albumGroups.length);
        const selectedAlbums = shuffleArray(albumGroups).slice(0, normalizedCount);
        const queue: SongListing[] = [];

        for (const album of selectedAlbums) {
            const orderedSongs = shuffleWithinAlbums ? shuffleArray(album.songs) : album.songs;
            for (const song of orderedSongs) {
                queue.push({ song, art: getSongArt(song, covers) });
            }
        }

        const playlistName = "Shuffle";
        createLocalPlaylist(playlistName, queue);
        setViewType("playlists");
        openTemporaryPlaylist(playlistName, queue);
        if (queue[0]) void playSong(queue[0]);
        closeMenus();
    }

    return (
        <div className={styles.main}>
            <div className={styles.left}>
                <button type="button" className={styles.optionsButton} onClick={openMenu} aria-label="Open options">
                    <MoreHoriz className={styles.optionsIcon} strokeWidth={2.5} />
                </button>
                {menuOpen && (
                    <ContextMenu x={menuPosition.x} y={menuPosition.y} onClose={closeMenus}>
                        <button type="button" onClick={() => setShuffleOpen((open) => !open)}>
                            Shuffle
                        </button>
                        {shuffleOpen && (
                            <div className={styles.submenu}>
                                <div className={styles.modeToggle}>
                                    <button
                                        type="button"
                                        className={mode === "songs" ? styles.modeActive : ""}
                                        onClick={() => setMode("songs")}
                                    >
                                        Songs
                                    </button>
                                    <button
                                        type="button"
                                        className={mode === "albums" ? styles.modeActive : ""}
                                        onClick={() => setMode("albums")}
                                    >
                                        Albums
                                    </button>
                                </div>

                                {mode === "songs" && (
                                    <div className={styles.controlGroup}>
                                        <label htmlFor="shuffle-song-count">Song count</label>
                                        <div className={styles.countField}>
                                            <input
                                                id="shuffle-song-count"
                                                className={styles.countInput}
                                                type="text"
                                                inputMode="numeric"
                                                value={String(songCount)}
                                                onChange={(event) => {
                                                    const digits = event.target.value.replace(/\D/g, "");
                                                    setModeCount(digits === "" ? 0 : Number(digits));
                                                }}
                                                onWheel={(event) => {
                                                    event.preventDefault();
                                                    setModeCount(songCount + (event.deltaY < 0 ? 1 : -1));
                                                }}
                                            />
                                            <span className={styles.countGhost} aria-hidden="true">
                                                {songCount} <span className={styles.countTotal}> / {songs.length || 1}</span>
                                            </span>
                                            <div className={styles.countArrows}>
                                                <button type="button" onClick={() => setModeCount(songCount + 1)} aria-label="Increase song count">▲</button>
                                                <button type="button" onClick={() => setModeCount(songCount - 1)} aria-label="Decrease song count">▼</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {mode === "albums" && (
                                    <div className={styles.controlGroup}>
                                        <label htmlFor="shuffle-album-count">Album count</label>
                                        <div className={styles.countField}>
                                            <input
                                                id="shuffle-album-count"
                                                className={styles.countInput}
                                                type="text"
                                                inputMode="numeric"
                                                value={String(albumCount)}
                                                onChange={(event) => {
                                                    const digits = event.target.value.replace(/\D/g, "");
                                                    setModeCount(digits === "" ? 0 : Number(digits));
                                                }}
                                                onWheel={(event) => {
                                                    event.preventDefault();
                                                    setModeCount(albumCount + (event.deltaY < 0 ? 1 : -1));
                                                }}
                                            />
                                            <span className={styles.countGhost} aria-hidden="true">
                                                {albumCount} <span className={styles.countTotal}> / {albumGroups.length || 1}</span>
                                            </span>
                                            <div className={styles.countArrows}>
                                                <button type="button" onClick={() => setModeCount(albumCount + 1)} aria-label="Increase album count">▲</button>
                                                <button type="button" onClick={() => setModeCount(albumCount - 1)} aria-label="Decrease album count">▼</button>
                                            </div>
                                        </div>
                                        <label className={styles.toggleRow}>
                                            <input
                                                type="checkbox"
                                                checked={shuffleWithinAlbums}
                                                onChange={(event) => setShuffleWithinAlbums(event.target.checked)}
                                            />
                                            Shuffle within albums
                                        </label>
                                    </div>
                                )}

                                <button type="button" className={styles.submitButton} onClick={mode === "songs" ? queueRandomSongs : queueRandomAlbums}>
                                    Shuffle
                                </button>
                            </div>
                        )}
                    </ContextMenu>
                )}
            </div>
            <div className={styles.center}>
                <div className={styles.search} ref={searchRef}>
                    <input
                        type="search"
                        value={search}
                        placeholder="Search artists, songs, albums, playlists"
                        aria-label="Search artists, songs, albums, and playlists"
                        aria-expanded={searchOpen && search.trim().length > 0}
                        onFocus={() => setSearchOpen(true)}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setSearchOpen(true);
                        }}
                    />
                    {searchOpen && search.trim() && (
                        <div className={styles.searchResults} role="listbox">
                            {searchResults.length > 0 ? searchResults.map((result) => (
                                <button
                                    type="button"
                                    className={styles.searchResult}
                                    key={`${result.kind}:${result.id}`}
                                    onClick={() => selectSearchResult(result)}
                                >
                                    <span className={styles.searchArt}>
                                        {result.art
                                            ? <img src={`music:///song?path=${encodeURIComponent(result.art)}`} alt="" />
                                            : <span aria-hidden="true">♫</span>}
                                    </span>
                                    <span className={styles.searchCopy}>
                                        <strong>{result.name}</strong>
                                        <small>{result.detail}</small>
                                    </span>
                                    <span className={`${styles.searchType} ${styles[`searchType${result.kind}`]}`}>
                                        {result.kind}
                                    </span>
                                </button>
                            )) : (
                                <p className={styles.searchEmpty}>No matching artists, songs, albums, or playlists.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.right}>
                <Link to={"/settings"} className={styles.settingsLink}>
                    <Settings className={styles.settings} />
                </Link>
            </div>
        </div>
    );
}

export default MainHeader;
