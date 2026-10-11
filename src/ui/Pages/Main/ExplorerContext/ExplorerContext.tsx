import { createContext } from "react";

export type ExplorerView = "artists" | "albums" | "playlists"

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

export type ArtistListing = ExplorerDirectory;
export type AlbumListing = ExplorerLeaf;
export type PlaylistListing = ExplorerLeaf;

export interface ExplorerContextType {
    currentViewType: ExplorerView
    currentSelectedId: string | null
    currentChildren: ExplorerChild[]
    panelSongs: SongListing[]
    showSelectedDetail: boolean
    panelSelection: ExplorerChild | null
    panelChildren: ExplorerChild[]
    panelCanReturn: boolean
    recentAlbums: ExplorerLeaf[]
    folder: Folder
    filter: string

    setViewType: (type: ExplorerView) => void
    openView: () => void
    openSelection: (id: string) => void
    setSelected: (id: string | null) => void
    setFilter: (filter: string) => void
    traverse: (id: string, shuffle?: boolean) => SongListing[]
    selectLeaf: (id: string, shuffle?: boolean) => SongListing[]
    startQueue: (songs: SongListing[], selectedId?: string) => void
    reorderPlaylist: (songs: SongListing[]) => boolean
    removePlaylistSong: (songId: string) => boolean
    openTemporaryPlaylist: (name: string, songs: SongListing[]) => void
    returnToParent: () => void
}

export const ExplorerContext = createContext<ExplorerContextType | null>(null)