import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react"
import { usePlayer } from "../../AudioPlayer/AudioPlayer";

export type ExplorerView = "artists" | "albums" | "playlists"
export type ExplorerLeafType = "none" | "album" | "playlist" | "other"

export interface ExplorerNode {
    id: string;
    name: string;
    kind: string;
    art?: string | null;
}

export interface ExplorerDirectory extends ExplorerNode{
    kind: "directory";
    children: ExplorerChild[];
}

export interface ExplorerLeaf extends ExplorerNode {
    kind: "leaf";
    songs: SongListing[];
}

export type ExplorerChild = ExplorerDirectory | ExplorerLeaf;

export interface Folder {
    artistsRoot: ExplorerDirectory;
    albumsRoot: ExplorerDirectory;
    playlistsRoot: ExplorerDirectory;
}

export interface ArtistListing extends ExplorerDirectory {}

export interface AlbumListing extends ExplorerLeaf {}

export interface PlaylistListing extends ExplorerLeaf {}

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


interface ExplorerContextType {
    currentViewType: ExplorerView
    currentSelectedId: string | null
    currentSelectedType: ExplorerLeafType
    currentChildren: ExplorerChild[]
    currentSelected: ExplorerLeaf | null
    currentSongs: SongListing[]
    panelSongs: SongListing[]
    showSelectedDetail: boolean
    panelSelection: ExplorerChild | null
    panelChildren: ExplorerChild[]
    panelCanReturn: boolean
    recentAlbums: ExplorerLeaf[]
    canReturn: boolean
    folder: Folder
    filter: string

    setViewType: (type: ExplorerView) => void
    openView: () => void
    openSelection: (id: string) => SongListing[]
    setSelected: (id: string | null) => void
    setFilter: (filter: string) => void
    traverse: (id: string, shuffle?: boolean) => SongListing[]
    selectLeaf: (id: string, shuffle?: boolean) => SongListing[]
    startQueue: (songs: SongListing[], selectedId?: string) => void
    openTemporaryPlaylist: (name: string, songs: SongListing[]) => void
    returnToParent: () => void
}

export function build(songs: Song[], covers: AlbumCover[], playlists: Playlist[], filter: string): Folder {
    const getAlbumArt = (song: Song) =>
        song.album ? covers.find((cover) => cover.title === song.album)?.coverPath || null : null;
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
                name: "Singles",
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

        return { id: `artist:${artistName}`, name: artistName, kind: "directory", children };
    });

    if (rootSongs.length > 0) {
        artists.push({
            id: "artist:various-artists",
            name: "Various Artists",
            kind: "directory",
            children: [{
                id: "album:various-artists:singles",
                name: "Singles",
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
        const playlistSongs = songs.filter((song) => playlist.songs.some((savedSong) => {
            const normalize = (value: string) => value.replace(/\\/g, "/").toLowerCase();
            const saved = normalize(savedSong);
            return saved === normalize(song.id) || saved === normalize(song.path);
        }));

        return {
            id: `playlist:${playlist.name}`,
            name: playlist.name,
            songs: playlistSongs.map((song) => ({ song, art: getAlbumArt(song) })),
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

const ExplorerContext = createContext<ExplorerContextType | null>(null)

export function ExplorerProvider({ children }: PropsWithChildren) {
    const { songs, covers, playlists, setQueue } = usePlayer();
    const [currentViewType, setCurrentViewType] = useState<ExplorerView>("artists")
    const [currentSelectedId, setSelected] = useState<string | null>(null)
    const [currentSongs, setCurrentSongs] = useState<SongListing[]>([])
    const [panelSongs, setPanelSongs] = useState<SongListing[]>([])
    const [recentAlbumIds, setRecentAlbumIds] = useState<string[]>([])
    const [showSelectedDetail, setShowSelectedDetail] = useState(false)
    const [panelSelectionId, setPanelSelectionId] = useState<string | null>(null)
    const [panelParentId, setPanelParentId] = useState<string | null>(null)
    const [panelHistory, setPanelHistory] = useState<Array<{
        selectionId: string | null;
        parentId: string | null;
        showDetail: boolean;
        songs: SongListing[];
    }>>([])
    const [filter, setFilter] = useState("");

    useEffect(() => {
        void window.electron.settings.get().then((settings) => {
            setRecentAlbumIds(settings.recentAlbums ?? []);
        });
    }, []);

    const folder = useMemo(() => {
        return build(
            songs,
            covers,
            [...playlists],
            filter,
        );
    }, [songs, covers, playlists, filter])

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
            const root = id === folder.artistsRoot.id
                ? folder.artistsRoot
                : id === folder.albumsRoot.id
                    ? folder.albumsRoot
                    : id === folder.playlistsRoot.id
                        ? folder.playlistsRoot
                        : null;
            return root ? { node: root, parent: null } :
                find(folder.artistsRoot, id) ?? find(folder.albumsRoot, id) ?? find(folder.playlistsRoot, id);
        };
    }, [folder]);

    const panelSelection = panelSelectionId ? findNode(panelSelectionId)?.node ?? null : null;
    const panelChildren = panelSelection?.kind === "directory" ? panelSelection.children : [];

    const currentSelected = useMemo(() => {
        if (!currentSelectedId) return null;

        const findLeaf = (directory: ExplorerDirectory): ExplorerLeaf | null => {
            for (const child of directory.children) {
                if (child.id === currentSelectedId && child.kind === "leaf") {
                    return child;
                }

                if (child.kind === "directory") {
                    const selected = findLeaf(child);
                    if (selected) return selected;
                }
            }

            return null;
        };

        return findLeaf(folder.artistsRoot) ?? findLeaf(folder.playlistsRoot);
    }, [currentSelectedId, folder.artistsRoot, folder.playlistsRoot]);

    const currentSelectedType = useMemo<ExplorerLeafType>(() => {
        if (!currentSelected) return "none";
        if (currentSelected.id.startsWith("album:")) return "album";
        if (currentSelected.id.startsWith("playlist:")) return "playlist";
        return "other";
    }, [currentSelected]);

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

    function pushPanelHistory() {
        setPanelHistory((history) => [...history, {
            selectionId: panelSelectionId,
            parentId: panelParentId,
            showDetail: showSelectedDetail,
            songs: panelSongs,
        }]);
    }

    function traverse(id: string, shuffle = false): SongListing[] {
        const target = findNode(id)?.node;
        if (!target) return [];

        if (target.kind === "directory") {
            pushPanelHistory();
            setShowSelectedDetail(false);
            setPanelSelectionId(target.id);
            setPanelParentId(null);
            return [];
        }

        pushPanelHistory();
        return selectLeaf(target.id, shuffle);
    }

    function selectLeaf(id: string, _shuffle = false): SongListing[] {
        const findLeaf = (
            directory: ExplorerDirectory,
            parentPath: string[] = [],
        ): { leaf: ExplorerLeaf; path: string[] } | null => {
            for (const child of directory.children) {
                if (child.id === id && child.kind === "leaf") {
                    return { leaf: child, path: parentPath };
                }

                if (child.kind === "directory") {
                    const result = findLeaf(child, [...parentPath, child.id]);
                    if (result) return result;
                }
            }

            return null;
        };

        const rootType = id.startsWith("playlist:") ? "playlists" : "artists";
        const root = rootType === "artists" ? folder.artistsRoot : folder.playlistsRoot;
        const result = findLeaf(root);
        if (!result) return [];

        setPanelSelectionId(result.leaf.id);
        setPanelParentId(result.path.at(-1) ?? null);
        setShowSelectedDetail(true);
        if (result.leaf.id.startsWith("album:")) {
            setRecentAlbumIds((ids) => {
                const nextIds = [result.leaf.id, ...ids.filter((albumId) => albumId !== result.leaf.id)].slice(0, 8);
                window.electron.settings.set({ recentAlbums: nextIds });
                return nextIds;
            });
        }
        const songsForView = [...result.leaf.songs];
        const orderedSongs = _shuffle ? shuffleArray(songsForView) : songsForView;
        setPanelSongs(orderedSongs);
        return orderedSongs;
    }

    function startQueue(songsForQueue: SongListing[], selectedId?: string) {
        setQueue(songsForQueue);
        setCurrentSongs(songsForQueue);
        if (selectedId) setSelected(selectedId);
    }

    function resetToRoot(root: ExplorerDirectory) {
        setPanelHistory([{ selectionId: null, parentId: null, showDetail: false, songs: [] }]);
        setPanelSelectionId(root.id);
        setPanelParentId(null);
        setShowSelectedDetail(false);
        setPanelSongs([]);
    }

    function openTemporaryPlaylist(name: string, songsForQueue: SongListing[]) {
        const localPlaylistId = `playlist:${name}`;
        setQueue(songsForQueue);
        setCurrentSongs(songsForQueue);
        setSelected(localPlaylistId);
        setPanelSelectionId(localPlaylistId);
        setPanelParentId(null);
        setShowSelectedDetail(true);
        setPanelSongs(songsForQueue);
    }

    function returnToParent() {
        const previous = panelHistory.at(-1);
        if (previous) {
            setPanelHistory((history) => history.slice(0, -1));

            if (previous.selectionId === null) {
                setPanelSelectionId(null);
                setPanelParentId(null);
                setShowSelectedDetail(false);
                setPanelSongs([]);
                return;
            }

            setPanelSelectionId(previous.selectionId);
            setPanelParentId(previous.parentId);
            setShowSelectedDetail(previous.showDetail);
            setPanelSongs(previous.songs);
            return;
        }

        if (panelParentId !== null) {
            setShowSelectedDetail(false);
            setPanelSelectionId(panelParentId);
            setPanelParentId(null);
            return;
        }

        setShowSelectedDetail(false);
        setPanelSelectionId(null);
        setPanelParentId(null);
        setPanelSongs([]);
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

    function openSelection(id: string) {
        pushPanelHistory();
        return selectLeaf(id);
    }

    return (
        <ExplorerContext.Provider
            value={
                {
                    currentViewType,
                    currentSelectedId,
                    currentSelectedType,
                    currentChildren,
                    currentSelected,
                    currentSongs,
                    panelSongs,
                    showSelectedDetail,
                    panelSelection,
                    panelChildren,
                    panelCanReturn: panelHistory.length > 0 || panelParentId !== null,
                    recentAlbums,
                    canReturn: false,
                    folder,
                    filter,
                    setViewType,
                    openView,
                    openSelection,
                    setSelected,
                    setFilter,
                    traverse,
                    selectLeaf,
                    startQueue,
                    openTemporaryPlaylist,
                    returnToParent,
                }
            }>
            {children}
        </ExplorerContext.Provider>
    )
}

export function useExplorer() {
    const context = useContext(ExplorerContext)

    if (!context) {
        throw new Error("ExplorerContext must be used within a provider");
    }

    return context;
}