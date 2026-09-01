import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

interface PlayerContextType {
    songs: Song[];
    covers: AlbumCover[];
    currentSong: Song | null;
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;

    playSong: (song: Song) => Promise<void>;
    pause: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    isFavorite: (key: string) => boolean;
    toggleFavorite: (key: string) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [songs, setSongs] = useState<Song[]>([]);
    const [covers, setCovers] = useState<AlbumCover[]>([]);
    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [playing, setPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setCurrentVolume] = useState(1);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    function updateDirectory(data: { songs: Song[]; covers: AlbumCover[] }) {
        setSongs(data.songs);
        setCovers(data.covers);
    }

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const ended = () => {
            setPlaying(false);
        };

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", ended);
        let subscribe = window.electron.subscribe(updateDirectory);

        const init = async () => {
            updateDirectory(await window.electron.getSongList())
        }

        init()

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", ended);
            subscribe;
        };

    }, []);

    async function playSong(song: Song) {
        const audio = audioRef.current;
        if (!audio) return;

        if (!currentSong || currentSong.id !== song.id) {
            audio.src = `music:///song?path=${encodeURIComponent(song.path)}`;

            setCurrentSong(song);
            setCurrentTime(0);
        }

        await audio.play();
        setPlaying(true);
    }

    function pause() {
        audioRef.current?.pause();
        setPlaying(false);
    }

    function seek(time: number) {
        const audio = audioRef.current;

        if (!audio) return;

        audio.currentTime = time;
    }

    function setVolume(volume: number) {
        const audio = audioRef.current;

        if (!audio) return;

        const newVolume = Math.max(0, Math.min(volume, 1));

        audio.volume = newVolume;

        setCurrentVolume(newVolume);
    }

    function isFavorite(key: string): boolean{
        return favorites.has(key)
    }

    function toggleFavorite(key: string) {
        setFavorites(prev => {
            const next = new Set(prev);

            if(next.has(key)){
                next.delete(key);
            }else{
                next.add(key);
            }

            return next;
        })
    }


    return (
        <PlayerContext.Provider
            value={{
                songs,
                covers,
                currentSong,
                playing,
                currentTime,
                duration,
                volume,
                playSong,
                pause,
                seek,
                setVolume,
                isFavorite,
                toggleFavorite
            }}
        >
            {children}
            <audio ref={audioRef} />
        </PlayerContext.Provider>
    );
}

export function usePlayer(): PlayerContextType {
    const context = useContext(PlayerContext);

    if (!context) {
        throw new Error("AudioPlayer must be used within a provider");
    }

    return context;
}
