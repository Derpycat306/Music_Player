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
    };
}
