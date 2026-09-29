import { createContext } from "react";

export interface PlayerContextType {
    songs: Song[];
    covers: AlbumCover[];
    currentSong: SongListing | null;
    currentQueue: SongListing[];
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    autoplay: boolean;
    playlists: Set<Playlist>;

    setQueue: (queue: SongListing[]) => void;
    queueSong: (song: SongListing) => void;
    playSong: (song: SongListing) => void;
    pause: () => void;
    play: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    isFavorite: (key: string) => boolean;
    toggleFavorite: (key: string) => void;
    playNext: () => void;
    playPrevious: () => void;
    toggleAutoplay: () => void;
    addPlaylist: (name: string, key?: string) => void;
    createLocalPlaylist: (name: string, songs: SongListing[]) => void;
    deletePlaylist: (name: string) => void;
}


export const PlayerContext = createContext<PlayerContextType | null>(null);