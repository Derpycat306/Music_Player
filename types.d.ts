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

type AlbumCover = {
    id: string;
    title: string;
    coverPath: string;
};

interface Window {
    electron: {
        setFolder: (string) => void;
        selectFolder: () => void;
        subscribe: (
            callback: (data: { songs: Song[]; covers: AlbumCover[] }) => void,
        ) => void;
        getSongList: () => Promise<{songs: Song[], covers: AlbumCover[]}>;

        settings: {
            set: (save: Partial<Settings>) => void;
            get: () => Promise<Settings>;
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