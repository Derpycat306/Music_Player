import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react"
import { usePlayer } from "../../../AudioPlayer/useAudioPlayer";
import { ExplorerContext, type AlbumListing, type ArtistListing, type ExplorerChild, type ExplorerDirectory, type ExplorerLeaf, type ExplorerView, type Folder, type PlaylistListing } from "./ExplorerContext";

/** Type and interface definitions */

function songMatchesFilter(song: Song, filter: string) {
    return song.title.toLowerCase().includes(filter) ||
        song.artist?.toLowerCase().includes(filter) ||
        song.album?.toLowerCase().includes(filter);
}

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array]; // don't modify the original

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}
function filterDirectory(directory: ExplorerDirectory, filter: string): ExplorerDirectory {
    return {
        ...directory,
        children: directory.children
            .map((child) => child.kind === "directory"
                ? filterDirectory(child, filter)
                : child)
            .filter((child) => child.kind === "directory"
                ? child.children.length > 0
                : child.songs.some(({ song }) => songMatchesFilter(song, filter))),
    };
}

function build (songs: Song[], covers: AlbumCover[], playlists: Playlist[], filter: string): Folder {
    const getAlbumArt = (song: Song) => {
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
    };
    const getArtistArt = (artist: string) =>
        covers.find((cover) => cover.id === `artist-art:${encodeURIComponent(artist)}`)?.coverPath ??
        covers.find((cover) => cover.id === "root-art")?.coverPath ??
        null;
    const normalizeSongKey = (key: string) => key.replace(/\\/g, "/").toLowerCase();
    const rootSongs: Song[] = [];
    const artistSongs = new Map<string, Song[]>();
    const artistAlbums = new Map<string, Map<string, Song[]>>();

    for (const song of songs) {
        if (song.artist === null) {
            rootSongs.push(song);
            continue;
        }

        if (!song.album) {
            const songsForArtist = artistSongs.get(song.artist) ?? [];
            songsForArtist.push(song);
            artistSongs.set(song.artist, songsForArtist);
            continue;
        }

        const albumsForArtist = artistAlbums.get(song.artist) ?? new Map<string, Song[]>();
        const songsForAlbum = albumsForArtist.get(song.album) ?? [];
        songsForAlbum.push(song);
        albumsForArtist.set(song.album, songsForAlbum);
        artistAlbums.set(song.artist, albumsForArtist);
    }

    const artistNames = new Set([...artistSongs.keys(), ...artistAlbums.keys()]);
    const artists: ArtistListing[] = [...artistNames].map((artistName) => {
        const children: AlbumListing[] = [];
        const albumsForArtist = artistAlbums.get(artistName) ?? new Map<string, Song[]>();

        for (const [albumName, albumSongs] of albumsForArtist) {
            const art = getAlbumArt(albumSongs[0]!);
            children.push({
                id: `album:${artistName}:${albumName}`,
                name: albumName,
                kind: "leaf",
                art,
                songs: albumSongs.map((song) => ({ song, art })),
            });
        }

        const singles = artistSongs.get(artistName);
        if (singles) {
            children.push({
                id: `album:${artistName}:singles`,
                name: `Singles - ${artistName}`,
                kind: "leaf",
                art: null,
                songs: singles.map((song) => ({ song, art: getAlbumArt(song) })),
            });
        }

        children.sort((left, right) => {
            const leftIsSingles = left.id.endsWith(":singles");
            const rightIsSingles = right.id.endsWith(":singles");
            return Number(leftIsSingles) - Number(rightIsSingles);
        });

        return {
            id: `artist:${artistName}`,
            name: artistName,
            kind: "directory",
            art: getArtistArt(artistName),
            children,
        };
    });

    if (rootSongs.length > 0) {
        artists.push({
            id: "artist:various-artists",
            name: "Various Artists",
            kind: "directory",
            art: covers.find((cover) => cover.id === "root-art")?.coverPath ?? null,
            children: [{
                id: "album:various-artists:singles",
                name: "Common",
                kind: "leaf",
                art: null,
                songs: rootSongs.map((song) => ({ song, art: getAlbumArt(song) })),
            }],
        });
    }

    artists.sort((left, right) => {
        const leftIsVarious = left.id === "artist:various-artists";
        const rightIsVarious = right.id === "artist:various-artists";
        return Number(leftIsVarious) - Number(rightIsVarious);
    });

    const playlistListings: PlaylistListing[] = playlists.map((playlist) => {
        const playlistSongs = playlist.songs.flatMap((savedSong) => {
            const saved = normalizeSongKey(savedSong);
            const song = songs.find((entry) =>
                saved === normalizeSongKey(entry.id) || saved === normalizeSongKey(entry.path),
            );
            return song ? [{ song, art: getAlbumArt(song) }] : [];
        });

        return {
            id: `playlist:${playlist.name}`,
            name: playlist.name,
            songs: playlistSongs,
            kind: "leaf",
        };
    });

    const albums = artists.flatMap((artist) => artist.children);

    const artistsRoot: ExplorerDirectory = {
        id: "artists-root",
        name: "Artists",
        kind: "directory",
        children: artists,
    };

    const albumsRoot: ExplorerDirectory = {
        id: "albums-root",
        name: "Albums",
        kind: "directory",
        children: albums,
    };

    const playlistsRoot: ExplorerDirectory = {
        id: "playlists-root",
        name: "Playlists",
        kind: "directory",
        children: playlistListings,
    };

    if (!filter) return { artistsRoot, albumsRoot, playlistsRoot };

    return {
        artistsRoot: filterDirectory(artistsRoot, filter),
        albumsRoot: filterDirectory(albumsRoot, filter),
        playlistsRoot: filterDirectory(playlistsRoot, filter),
    };
}

type PlaybackPage = NonNullable<Settings["lastPlaybackPage"]>;

export function ExplorerProvider({ children }: PropsWithChildren) {
    const {
        songs,
        covers,
        playlists,
        setQueue,
        isFavorite,
        addPlaylist: addSavedPlaylistSong,
        renamePlaylist: renameSavedPlaylist,
        toggleFavorite,
        reorderPlaylist: savePlaylistOrder,
        removePlaylistSong: removeSavedPlaylistSong,
    } = usePlayer();
    const [currentViewType, setCurrentViewType] = useState<ExplorerView>("artists")
    const [currentSelectedId, setSelected] = useState<string | null>(null)
    const [panelSongs, setPanelSongs] = useState<SongListing[]>([])
    const [recentAlbumIds, setRecentAlbumIds] = useState<string[]>([])
    const [showSelectedDetail, setShowSelectedDetail] = useState(false)
    const [panelSelectionId, setPanelSelectionId] = useState<string | null>(null)
    const [panelPath, setPanelPath] = useState<string[]>([])
    const [songDetail, setSongDetail] = useState<SongListing | null>(null)
    const [largeView, setLargeViewState] = useState(false)
    const [playbackPage, setPlaybackPage] = useState<PlaybackPage | null>(null)
    const [playbackSettingsLoaded, setPlaybackSettingsLoaded] = useState(false)
    const playbackPageTouched = useRef(false)
    const [filter, setFilter] = useState("");

    useEffect(() => {
        let active = true;
        void window.electron.settings.get().then((settings) => {
            if (!active) return;
            setRecentAlbumIds(settings.recentAlbums ?? []);
            if (!playbackPageTouched.current && settings.lastPlaybackPage) {
                setPlaybackPage(settings.lastPlaybackPage);
            }
            setPlaybackSettingsLoaded(true);
        });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!playbackSettingsLoaded || !playbackPage) return;
        void window.electron.settings.set({ lastPlaybackPage: playbackPage });
    }, [playbackPage, playbackSettingsLoaded]);

    function updatePlaybackPage(page: PlaybackPage | null) {
        playbackPageTouched.current = true;
        setPlaybackPage(page);
    }

    const searchFolder = useMemo(
        () => build(songs, covers, [...playlists], ""),
        [songs, covers, playlists],
    );
    const folder = useMemo(
        () => filter ? build(songs, covers, [...playlists], filter) : searchFolder,
        [songs, covers, playlists, filter, searchFolder],
    );

    const currentRoot = currentViewType === "artists"
        ? folder.artistsRoot
        : currentViewType === "albums"
            ? folder.albumsRoot
            : folder.playlistsRoot;

    const currentChildren = currentRoot.children;

    const findNode = useMemo(() => {
        const find = (
            directory: ExplorerDirectory,
            id: string,
            parent: ExplorerDirectory | null = null,
        ): { node: ExplorerChild; parent: ExplorerDirectory | null } | null => {
            for (const child of directory.children) {
                if (child.id === id) return { node: child, parent };
                if (child.kind === "directory") {
                    const result = find(child, id, child);
                    if (result) return result;
                }
            }
            return null;
        };

        return (id: string) => {
            const root = id === searchFolder.artistsRoot.id
                ? searchFolder.artistsRoot
                : id === searchFolder.albumsRoot.id
                    ? searchFolder.albumsRoot
                    : id === searchFolder.playlistsRoot.id
                        ? searchFolder.playlistsRoot
                        : null;
            return root ? { node: root, parent: null } :
                find(searchFolder.artistsRoot, id) ?? find(searchFolder.albumsRoot, id) ?? find(searchFolder.playlistsRoot, id);
        };
    }, [searchFolder]);

    const panelSelection = panelSelectionId ? findNode(panelSelectionId)?.node ?? null : null;
    const panelChildren = panelSelection?.kind === "directory" ? panelSelection.children : [];
    const isPlaybackContext = playbackPage !== null &&
        playbackPage.selectionId === panelSelectionId &&
        playbackPage.showDetail === showSelectedDetail &&
        playbackPage.songDetail?.song.id === songDetail?.song.id &&
        playbackPage.path.length === panelPath.length &&
        playbackPage.path.every((id, index) => id === panelPath[index]);

    function setLargeView(enabled: boolean) {
        setLargeViewState(enabled);
        if (isPlaybackContext) {
            updatePlaybackPage(playbackPage ? { ...playbackPage, largeView: enabled } : null);
        }
    }

    function rememberPlaybackPage(path: string[], selectionId: string | null, detail: SongListing | null) {
        updatePlaybackPage({
            path,
            selectionId,
            showDetail: detail !== null || showSelectedDetail,
            songDetail: detail,
            largeView,
        });
    }


    const recentAlbums = useMemo(() => {
        const albums = new Map<string, ExplorerLeaf>();
        const collectAlbums = (directory: ExplorerDirectory) => {
            for (const child of directory.children) {
                if (child.kind === "leaf" && child.id.startsWith("album:")) {
                    albums.set(child.id, child);
                } else if (child.kind === "directory") {
                    collectAlbums(child);
                }
            }
        };

        collectAlbums(folder.artistsRoot);
        return recentAlbumIds
            .map((id) => albums.get(id))
            .filter((album): album is ExplorerLeaf => album !== undefined);
    }, [folder.artistsRoot, recentAlbumIds]);

    function traverse(id: string, shuffle = false): SongListing[] {
        const target = findNode(id)?.node;
        if (!target) return [];
        setSelected(target.id);

        const nextPath = panelSelection?.kind === "directory" &&
            panelPath.at(-1) === panelSelection.id
            ? [...panelPath, target.id]
            : [target.id];
        setPanelPath(nextPath);
        setSongDetail(null);
        setLargeView(false);

        if (target.kind === "directory") {
            setShowSelectedDetail(false);
            setPanelSelectionId(target.id);
            setPanelSongs([]);
            return [];
        }

        return selectLeaf(target.id, shuffle);
    }

    function openExplorerItem(id: string, shuffle = false): SongListing[] {
        const target = findNode(id)?.node;
        if (!target) return [];

        setSelected(target.id);
        setPanelPath([target.id]);
        setSongDetail(null);
        setLargeView(false);
        if (target.kind === "directory") {
            setPanelSelectionId(target.id);
            setShowSelectedDetail(false);
            setPanelSongs([]);
            return [];
        }

        return selectLeaf(target.id, shuffle);
    }

    function selectLeaf(id: string, _shuffle = false): SongListing[] {
        const findLeaf = (directory: ExplorerDirectory): ExplorerLeaf | null => {
            for (const child of directory.children) {
                if (child.id === id && child.kind === "leaf") {
                    return child;
                }

                if (child.kind === "directory") {
                    const result = findLeaf(child);
                    if (result) return result;
                }
            }

            return null;
        };

        const rootType = id.startsWith("playlist:") ? "playlists" : "artists";
        const root = rootType === "artists" ? searchFolder.artistsRoot : searchFolder.playlistsRoot;
        const leaf = findLeaf(root);
        if (!leaf) return [];

        setSongDetail(null);
        setPanelSelectionId(leaf.id);
        setShowSelectedDetail(true);
        if (leaf.id.startsWith("album:")) {
            setRecentAlbumIds((ids) => {
                const nextIds = [leaf.id, ...ids.filter((albumId) => albumId !== leaf.id)].slice(0, 8);
                window.electron.settings.set({ recentAlbums: nextIds });
                return nextIds;
            });
        }
        const songsForView = [...leaf.songs];
        const orderedSongs = _shuffle ? shuffleArray(songsForView) : songsForView;
        setPanelSongs(orderedSongs);
        return orderedSongs;
    }

    function startQueue(songsForQueue: SongListing[], selectedId?: string) {
        setQueue(songsForQueue, selectedId ?? null);
        const path = selectedId && panelPath.at(-1) !== selectedId ? [selectedId] : panelPath;
        rememberPlaybackPage(path, panelSelectionId, songDetail);
    }

    function reorderPlaylist(songsInOrder: SongListing[]) {
        if (!panelSelectionId?.startsWith("playlist:")) return false;

        const name = panelSelectionId.slice("playlist:".length);
        if (!savePlaylistOrder(name, songsInOrder.map(({ song }) => song.id))) return false;

        setPanelSongs(songsInOrder);
        setQueue(songsInOrder, panelSelectionId);
        return true;
    }

    function addSongsToPlaylist(listings: SongListing[]) {
        if (!panelSelectionId?.startsWith("playlist:")) return false;

        const name = panelSelectionId.slice("playlist:".length);
        const existingIds = new Set(panelSongs.map(({ song }) => song.id));
        const additions: SongListing[] = [];

        if (name.toLowerCase() === "favorites") {
            for (const listing of listings) {
                if (existingIds.has(listing.song.id) || isFavorite(listing.song.id)) continue;
                additions.push(listing);
                toggleFavorite(listing.song.id);
            }
        } else {
            const playlist = [...playlists].find(
                (entry) => entry.name.toLowerCase() === name.toLowerCase(),
            );
            const normalizeSongKey = (key: string) => key.replace(/\\/g, "/").toLowerCase();
            const existingKeys = new Set(playlist?.songs.map(normalizeSongKey) ?? []);
            for (const listing of listings) {
                const normalizedId = normalizeSongKey(listing.song.id);
                const normalizedPath = normalizeSongKey(listing.song.path);
                if (
                    existingIds.has(listing.song.id) ||
                    existingKeys.has(normalizedId) ||
                    existingKeys.has(normalizedPath)
                ) continue;
                additions.push(listing);
                addSavedPlaylistSong(name, listing.song.id);
                existingKeys.add(normalizedId);
                existingKeys.add(normalizedPath);
            }
        }

        if (additions.length === 0) return false;
        const nextSongs = [...panelSongs, ...additions];
        setPanelSongs(nextSongs);
        setQueue(nextSongs, panelSelectionId);
        return true;
    }

    function addSongToPlaylist(listing: SongListing) {
        if (panelSongs.some(({ song }) => song.id === listing.song.id)) {
            return removePlaylistSong(listing.song.id);
        }
        return addSongsToPlaylist([listing]);
    }

    function removePlaylistSong(songId: string) {
        if (!panelSelectionId?.startsWith("playlist:")) return false;

        const name = panelSelectionId.slice("playlist:".length);
        if (!removeSavedPlaylistSong(name, songId)) return false;

        const nextSongs = panelSongs.filter((listing) => listing.song.id !== songId);
        setPanelSongs(nextSongs);
        setQueue(nextSongs, panelSelectionId);
        return true;
    }

    function renamePlaylist(name: string, newName: string): boolean {
        if (!renameSavedPlaylist(name, newName)) return false;

        const oldId = `playlist:${name}`;
        const newId = `playlist:${newName.trim()}`;
        setPanelSelectionId((id) => id === oldId ? newId : id);
        setPanelPath((path) => path.map((id) => id === oldId ? newId : id));
        setSelected((id) => id === oldId ? newId : id);
        updatePlaybackPage(playbackPage ? {
            ...playbackPage,
            selectionId: playbackPage.selectionId === oldId ? newId : playbackPage.selectionId,
            path: playbackPage.path.map((id) => id === oldId ? newId : id),
        } : null);
        return true;
    }

    function resetToRoot(root: ExplorerDirectory) {
        setPanelPath([root.id]);
        setSongDetail(null);
        setLargeView(false);
        setPanelSelectionId(root.id);
        setShowSelectedDetail(false);
        setPanelSongs([]);
    }

    function openTemporaryPlaylist(name: string, songsForQueue: SongListing[]) {
        const localPlaylistId = `playlist:${name}`;
        setQueue(songsForQueue, localPlaylistId);
        setPanelPath([localPlaylistId]);
        setSongDetail(null);
        setLargeViewState(false);
        setPanelSelectionId(localPlaylistId);
        setShowSelectedDetail(true);
        setPanelSongs(songsForQueue);
        updatePlaybackPage({
            path: [localPlaylistId],
            selectionId: localPlaylistId,
            showDetail: true,
            songDetail: null,
            largeView: false,
        });
    }

    function returnToParent() {
        const nextPath = panelPath.slice(0, -1);
        setPanelPath(nextPath);
        setLargeViewState(false);
        const parent = nextPath.at(-1) ? findNode(nextPath.at(-1)!)?.node : null;

        if (!parent) {
            setSongDetail(null);
            setSelected(null);
            setPanelSelectionId(null);
            setShowSelectedDetail(false);
            setPanelSongs([]);
        } else if (parent.kind === "directory") {
            setSongDetail(null);
            setSelected(parent.id);
            setPanelSelectionId(parent.id);
            setShowSelectedDetail(false);
            setPanelSongs([]);
        } else {
            selectLeaf(parent.id);
        }
    }

    function setViewType(view: ExplorerView) {
        if (view === currentViewType) return;
        setCurrentViewType(view);
    }

    function openView() {
        const root = currentViewType === "artists"
            ? folder.artistsRoot
            : currentViewType === "albums"
                ? folder.albumsRoot
                : folder.playlistsRoot;

        resetToRoot(root);
    }

    function openSelection(id: string): void {
        const nextPath = panelSelection?.kind === "directory" &&
            panelPath.at(-1) === panelSelection.id
            ? [...panelPath, id]
            : [id];
        setPanelPath(nextPath);
        setLargeViewState(false);
        selectLeaf(id);
    }

    function openSearchItem(type: ExplorerView | "song", id: string, listing?: SongListing) {
        setFilter("");
        setSelected(id);
        setLargeViewState(false);

        if (type === "song") {
            if (!listing) return;
            setPanelPath([`song:${listing.song.id}`]);
            setSongDetail(listing);
            setPanelSelectionId(null);
            setShowSelectedDetail(true);
            setPanelSongs([listing]);
            setQueue([listing], `song:${listing.song.id}`);
            updatePlaybackPage({
                path: [`song:${listing.song.id}`],
                selectionId: null,
                showDetail: true,
                songDetail: listing,
                largeView: false,
            });
            return;
        }

        setCurrentViewType(type);
        openExplorerItem(id);
    }

    function returnToPlaybackContext() {
        if (!playbackPage) return;

        setPanelPath(playbackPage.path);
        setLargeViewState(playbackPage.largeView);

        if (playbackPage.songDetail) {
            setSongDetail(playbackPage.songDetail);
            setPanelSelectionId(null);
            setShowSelectedDetail(true);
            setPanelSongs([playbackPage.songDetail]);
            return;
        }

        setSongDetail(null);
        if (!playbackPage.selectionId) {
            setPanelSelectionId(null);
            setShowSelectedDetail(false);
            setPanelSongs([]);
            return;
        }

        const target = findNode(playbackPage.selectionId)?.node;
        if (target?.kind === "directory") {
            setPanelSelectionId(target.id);
            setShowSelectedDetail(false);
            setPanelSongs([]);
            return;
        }

        if (target?.kind === "leaf") {
            selectLeaf(target.id);
            setPanelPath(playbackPage.path);
            setLargeViewState(playbackPage.largeView);
            return;
        }

        setPanelSelectionId(null);
        setShowSelectedDetail(false);
        setPanelSongs([]);
        setPanelPath([]);
    }

    return (
        <ExplorerContext.Provider
            value={
                {
                    currentViewType,
                    currentSelectedId,
                    currentChildren,
                    panelSongs,
                    showSelectedDetail,
                    panelSelection,
                    panelChildren,
                    searchFolder,
                    songDetail,
                    largeView,
                    isPlaybackContext,
                    panelCanReturn: panelPath.length > 0,
                    recentAlbums,
                    folder,
                    filter,
                    setViewType,
                    openView,
                    openSelection,
                    setSelected,
                    setFilter,
                    traverse,
                    openExplorerItem,
                    openSearchItem,
                    setLargeView,
                    returnToPlaybackContext,
                    renamePlaylist,
                    selectLeaf,
                    startQueue,
                    reorderPlaylist,
                    addSongToPlaylist,
                    addSongsToPlaylist,
                    removePlaylistSong,
                    openTemporaryPlaylist,
                    returnToParent,
                }
            }>
            {children}
        </ExplorerContext.Provider>
    )
}