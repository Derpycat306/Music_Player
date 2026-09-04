import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react"
import { usePlayer } from "../../AudioPlayer/AudioPlayer";

export type ExplorerView = "artists" | "playlists"
type ExplorerDepth = "top" | "artist" | "album" | "playlist"

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
    currentDepth: ExplorerDepth
    currentSelectedId: string | null
    currentParent: ExplorerDirectory
    currentChildren: ExplorerChild[]
    currentSelected: ExplorerLeaf | null
    currentSongs: SongListing[]
    canReturn: boolean
    folder: Folder
    filter: string

    setViewType: (type: ExplorerView) => void
    setDepth: (depth: ExplorerDepth) => void
    setSelected: (id: string | null) => void
    setFilter: (filter: string) => void
    traverse: (id: string) => void
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
                songs: albumSongs.map((song) => ({ song, queue: albumSongs, art })),
            });
        }

        const singles = artistSongs.get(artistName);
        if (singles) {
            children.push({
                id: `album:${artistName}:singles`,
                name: "Singles",
                kind: "leaf",
                art: null,
                songs: singles.map((song) => ({ song, queue: singles, art: getAlbumArt(song) })),
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
                songs: rootSongs.map((song) => ({ song, queue: rootSongs, art: getAlbumArt(song) })),
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
            songs: playlistSongs.map((song) => ({ song, queue: playlistSongs, art: getAlbumArt(song) })),
            kind: "leaf",
        };
    });

    const artistsRoot: ExplorerDirectory = {
        id: "artists-root",
        name: "Artists",
        kind: "directory",
        children: artists,
    };

    const playlistsRoot: ExplorerDirectory = {
        id: "playlists-root",
        name: "Playlists",
        kind: "directory",
        children: playlistListings,
    };

    if (!filter) return { artistsRoot, playlistsRoot };

    return {
        artistsRoot: filterDirectory(artistsRoot, filter),
        playlistsRoot: filterDirectory(playlistsRoot, filter),
    };
}

const ExplorerContext = createContext<ExplorerContextType | null>(null)

export function ExplorerProvider({ children }: PropsWithChildren) {
    const { songs, covers, playlists } = usePlayer();
    const [currentViewType, setCurrentViewType] = useState<ExplorerView>("artists")
    const [currentDepth, setDepth] = useState<ExplorerDepth>("top")
    const [parentIds, setParentIds] = useState<string[]>([])
    const [currentSelectedId, setSelected] = useState<string | null>(null)
    const [filter, setFilter] = useState("");

    const folder = useMemo(() => {
        return build(
            songs,
            covers,
            [...playlists],
            filter,
        );
    }, [songs, covers, playlists, filter])

    const currentRoot = currentViewType === "artists" ? folder.artistsRoot : folder.playlistsRoot;

    const currentParent = useMemo(() => {
        let parent = currentRoot;
        for (const id of parentIds) {
            const child = parent.children.find((listing) => listing.id === id);
            if (!child || child.kind !== "directory") break;
            parent = child;
        }
        return parent;
    }, [currentRoot, parentIds])

    const currentChildren = currentParent.children;

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

    function traverse(id: string) {
        const target = currentChildren.find((child) => child.id === id);
        if (!target) return;

        if (target.kind === "directory") {
            setParentIds((ids) => [...ids, target.id]);
            setDepth("artist");
        } else {
            setSelected(target.id);
            setDepth(target.id.startsWith("playlist:") ? "playlist" : "album");
        }
    }

    function returnToParent() {
        setParentIds((ids) => ids.slice(0, -1));
        setDepth(parentIds.length <= 1 ? "top" : "artist");
    }

    function setViewType(view: ExplorerView) {
        setCurrentViewType(view);
        setParentIds([]);
        setDepth("top");
    }

    return (
        <ExplorerContext.Provider
            value={
                {
                    currentViewType,
                    currentDepth,
                    currentSelectedId,
                    currentParent,
                    currentChildren,
                    currentSelected,
                    currentSongs: currentSelected ? currentSelected.songs : [],
                    canReturn: parentIds.length > 0,
                    folder,
                    filter,
                    setViewType,
                    setDepth,
                    setSelected,
                    setFilter,
                    traverse,
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