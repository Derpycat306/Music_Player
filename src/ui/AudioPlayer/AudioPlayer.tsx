import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

interface PlayerContextType {
    songs: Song[];
    covers: AlbumCover[];
    currentSong: SongListing | null;
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    autoplay: boolean;
    playlists: Set<Playlist>;

    setQueue: (queue: SongListing[]) => void;
    playSong: (song: SongListing) => Promise<void>;
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
    deletePlaylist: (name: string) => void;
}

const FAVORITES_PLAYLIST_NAME = "Favorites";

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [songs, setSongs] = useState<Song[]>([]);
    const [covers, setCovers] = useState<AlbumCover[]>([]);
    const [currentSong, setCurrentSong] = useState<SongListing | null>(null);
    const [playing, setPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setCurrentVolume] = useState(1);
    const [autoplay, setAutoplay] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [playlists, setPlaylists] = useState<Set<Playlist>>(new Set());
    const playlistsWithFavorites = useMemo(() => {
        const favoritePlaylist: Playlist = {
            name: FAVORITES_PLAYLIST_NAME,
            songs: [...favorites],
        };

        return new Set([favoritePlaylist, ...playlists]);
    }, [favorites, playlists]);

    const volumeRef = useRef(volume);
    const playlistsRef = useRef(playlists);
    const favoritesRef = useRef(favorites);
    const songsRef = useRef(songs);
    const currentSongRef = useRef(currentSong);
    const autoplayRef = useRef(autoplay);
    const queueRef = useRef<SongListing[]>([]);

    function updateDirectory(data: { songs: Song[]; covers: AlbumCover[] }) {
        setSongs(data.songs);
        setCovers(data.covers);
        setCurrentSong(null);
        audioRef.current?.pause();
    }

    useEffect(() => {
        volumeRef.current = volume;
    }, [volume]);

    useEffect(() => {
        playlistsRef.current = playlists;
    }, [playlists]);

    useEffect(() => {
        favoritesRef.current = favorites;
    }, [favorites]);

    useEffect(() => {
        songsRef.current = songs;
    }, [songs]);

    useEffect(() => {
        currentSongRef.current = currentSong;
    }, [currentSong]);

    useEffect(() => {
        autoplayRef.current = autoplay;
    }, [autoplay]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const init = async () => {
            updateDirectory(await window.electron.getSongList())
            const fav: string[] = await window.electron.favorites.get();
            const pls: Playlist[] = await window.electron.playlists.get();
            const settings: Settings | null = await window.electron.settings.get();

            setFavorites(new Set(fav));
            setPlaylists(new Set(pls.filter(
                (playlist) => playlist.name.toLowerCase() !== FAVORITES_PLAYLIST_NAME.toLowerCase(),
            )));
            setVolume(settings.volume)
        }
        init();

        const updateTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const ended = () => {
            setPlaying(false);

            if (!autoplayRef.current) {
                return;
            }

            const song = currentSongRef.current;
            if (!song) {
                return;
            }

            const queue = queueRef.current;
            const currentIndex = queue.findIndex((item) => item.song.id === song.song.id);

            if (currentIndex === -1 || queue.length === 0) {
                return;
            }

            const nextIndex = (currentIndex + 1) % queue.length;
            const nextSong = queue[nextIndex];

            if (!nextSong) {
                return;
            }

            void playSong(nextSong);
        };

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", ended);
        const subscribe = window.electron.subscribe(updateDirectory);
        const saveSubscribe = window.electron.subscribeToSave(async () => {
            window.electron.settings.set({volume: volumeRef.current});
            window.electron.favorites.set([...favoritesRef.current]);
            window.electron.playlists.set([...playlistsRef.current]);
        })


        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", ended);
            subscribe;
            saveSubscribe;
        };

    }, []);

    function setQueue(queue: SongListing[]) {
        queueRef.current = [...queue];
    }

    async function playSong(song: SongListing) {
        const audio = audioRef.current;
        if (!audio) return;

        if (!currentSong || currentSong.song.id !== song.song.id) {
            audio.src = `music:///song?path=${encodeURIComponent(song.song.path)}`;

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

    function play() {
        audioRef.current?.play();
        setPlaying(true);
    }

    function seek(time: number) {
        const audio = audioRef.current;

        if (!audio) return;

        audio.currentTime = time;

        if(!playing){
            play()
        }
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

    function playNext() {
        const song = currentSongRef.current ?? currentSong;
        const queue = queueRef.current;

        if (!song || queue.length === 0) return;

        const currentIndex = queue.findIndex((item) => item.song.id === song.song.id);
        const nextIndex = (currentIndex + 1) % queue.length;
        void playSong(queue[nextIndex]);
    }

    function playPrevious() {
        const song = currentSongRef.current ?? currentSong;
        const queue = queueRef.current;

        if (!song || queue.length === 0) return;

        const currentIndex = queue.findIndex((item) => item.song.id === song.song.id);
        const previousIndex = (currentIndex - 1 + queue.length) % queue.length;
        void playSong(queue[previousIndex]);
    }

    function toggleAutoplay() {
        setAutoplay(!autoplay)
        if(!playing){
            playNext()
        }
    }

    function addPlaylist(name: string, key?: string) {
        const cleanedName = name.trim();
        if (!cleanedName) return;
        if (cleanedName.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) return;

        const normalizedKey = key?.replace(/\\/g, "/").toLowerCase();

        setPlaylists(prev => {
            const next = [...prev];
            const existingIndex = next.findIndex(
                (playlist) => playlist.name.toLowerCase() === cleanedName.toLowerCase(),
            );

            if (existingIndex === -1) {
                return new Set([...next, { name: cleanedName, songs: key ? [key] : [] }]);
            }

            if (!key || !normalizedKey) {
                return new Set(next);
            }

            const existing = next[existingIndex];
            if (!existing) {
                return new Set(next);
            }

            const updatedSongs = existing.songs.some((songId) =>
                songId.replace(/\\/g, "/").toLowerCase() === normalizedKey,
            )
                ? existing.songs
                : [...existing.songs, key];

            const updated = next.map((playlist, index) =>
                index === existingIndex
                    ? { ...playlist, songs: updatedSongs }
                    : playlist,
            );

            return new Set(updated);
        })
    }

    function deletePlaylist(name: string) {
        if (name.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) return;

        setPlaylists((current) => new Set(
            [...current].filter((playlist) => playlist.name.toLowerCase() !== name.toLowerCase()),
        ));
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
                autoplay,
                playlists: playlistsWithFavorites,
                setQueue,
                playSong,
                pause,
                play,
                seek,
                setVolume,
                isFavorite,
                toggleFavorite,
                playNext,
                playPrevious,
                toggleAutoplay,
                addPlaylist,
                deletePlaylist,
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
