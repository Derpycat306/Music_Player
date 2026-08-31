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
            set: (save: Settings) => void;
            get: () => Settings;
        };

        favorites: {
            set: (save: string[]) => void;
            get: () => string[];
        };

        playlists: {
            set: (save: Playlist[]) => void;
            get: () => Playlist[];
        };
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