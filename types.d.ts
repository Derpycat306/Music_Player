type Song = {
    id: string;
    title: string;
    artist: string | null;
    album: string | null;
    trackNumber: number;
    duration: number;
    path: string;
    coverPath?: string;
};

type SongListing = {
    song: Song;
    queue: Song[];
    art: string | null;
}

type AlbumCover = {
    id: string;
    title: string;
    coverPath: string;
};

interface Window {
    electron: {
        setFolder: (string) => void;
        selectFolder: () => Promise<string | null>;
        subscribe: (
            callback: (data: { songs: Song[]; covers: AlbumCover[] }) => void,
        ) => void;
        getSongList: () => Promise<{songs: Song[], covers: AlbumCover[]}>;

        settings: {
            set: (save: Partial<Settings>) => void;
            get: () => Promise<Settings>;
        };

        updates: {
            check: () => Promise<{ available: boolean; version?: string }>;
            install: () => Promise<void>;
        };

        favorites: {
            set: (save: Partial<string[]>) => void;
            get: () => Promise<string[]>;
        };

        playlists: {
            set: (save: Partial<Playlist[]>) => void;
            get: () => Promise<Playlist[]>;
        };

        subscribeToSave: (callback: () => Promise<void>) => void;

        exportSongs: (songs: Song[]) => Promise<boolean>;
    };
};

type Playlist = {
    name: string;
    songs: string[];
};

type Settings = {
    baseFolder: string | null;
    volume: number;
};