import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { PlayerContext } from "./AudioPlayerContext";

const FAVORITES_PLAYLIST_NAME = "Favorites";

function normalizeSongKey(key: string) {
    return key.replace(/\\/g, "/").toLowerCase();
}

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
    const [localPlaylists, setLocalPlaylists] = useState<Playlist[]>([]);
    const playlistsWithFavorites = useMemo(() => {
        const favoritePlaylist: Playlist = {
            name: FAVORITES_PLAYLIST_NAME,
            songs: [...favorites],
        };

        return new Set([favoritePlaylist, ...playlists, ...localPlaylists]);
    }, [favorites, playlists, localPlaylists]);

    const volumeRef = useRef(volume);
    const playlistsRef = useRef(playlists);
    const favoritesRef = useRef(favorites);
    const currentSongRef = useRef(currentSong);
    const autoplayRef = useRef(autoplay);
    const queueRef = useRef<SongListing[]>([]);
    const queueSourceIdRef = useRef<string | null>(null);

    function updateDirectory(data: { songs: Song[]; covers: AlbumCover[] }) {
        const previousSong = currentSongRef.current;
        const songStillExists = previousSong
            ? data.songs.some((song) => song.id === previousSong.song.id)
            : true;

        setSongs(data.songs);
        setCovers(data.covers);

        if (!songStillExists && previousSong) {
            audioRef.current?.pause();
            setPlaying(false);
            setCurrentSong(null);
            setCurrentTime(0);
        }
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
        currentSongRef.current = currentSong;
    }, [currentSong]);
    
    useEffect(() => {
        autoplayRef.current = autoplay;
    }, [autoplay]);
    
    const play = useCallback(() => {
        audioRef.current?.play();
        setPlaying(true);
    }, []);

    const setSongRef = useCallback((song: SongListing) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (currentSongRef.current?.song.id !== song.song.id) {
            audio.src = `music:///song?path=${encodeURIComponent(song.song.path)}`;
            currentSongRef.current = song;
            setCurrentSong(song);
            setCurrentTime(0);
        }
    }, []);

    const playSong = useCallback((song: SongListing) => {
        setSongRef(song);
        play();
    }, [play, setSongRef]);
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        let disposed = false;
        
        const init = async () => {
            const directory = await window.electron.getSongList();
            if (disposed) return;
            updateDirectory(directory)
            const fav: string[] = await window.electron.favorites.get();
            const pls: Playlist[] = await window.electron.playlists.get();
            const settings: Settings | null = await window.electron.settings.get();
            if (disposed) return;
            
            setFavorites(new Set(fav));
            setPlaylists(new Set(pls.filter(
                (playlist) => playlist.name.toLowerCase() !== FAVORITES_PLAYLIST_NAME.toLowerCase(),
            )));
            setVolume(settings.volume)
            setAutoplay(settings.autoplay ?? false);
            if(settings.lastQueue.length > 0){
                setQueue(settings.lastQueue)
                setSongRef(settings.lastSong??settings.lastQueue.at(0)!)
            }
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

        const onError = () => {
            console.error("Audio playback error", {
                src: audio.src,
                currentTime: audio.currentTime,
                duration: audio.duration,
                networkState: audio.networkState,
                readyState: audio.readyState,
                error: audio.error,
            });
            setPlaying(false);
        };

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", ended);
        audio.addEventListener("error", onError);
        const subscribe = window.electron.subscribe(updateDirectory);
        const saveSubscribe = window.electron.subscribeToSave(async () => {
            window.electron.settings.set({
                volume: volumeRef.current,
                autoplay: autoplayRef.current,
                lastQueue: queueRef.current,
                lastSong: currentSongRef.current
            });
            window.electron.favorites.set([...favoritesRef.current]);
            window.electron.playlists.set([...playlistsRef.current]);
        })


        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", ended);
            audio.removeEventListener("error", onError);
            disposed = true;
            subscribe();
            saveSubscribe();
        };

    }, [playSong, setSongRef]);

    function setQueue(queue: SongListing[], sourceId?: string | null) {
        queueRef.current = [...queue];
        if (sourceId !== undefined) {
            queueSourceIdRef.current = sourceId;
        }
    }

    function queueSong(song: SongListing) {
        if (queueRef.current.some((queued) => queued.song.id === song.song.id)) return;
        queueRef.current = [...queueRef.current, song];
    }

    function pause() {
        audioRef.current?.pause();
        setPlaying(false);
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

    function isFavorite(key: string): boolean {
        const normalizedKey = normalizeSongKey(key);
        const targetSong = songs.find((song) =>
            normalizedKey === normalizeSongKey(song.id) ||
            normalizedKey === normalizeSongKey(song.path),
        );
        return [...favorites].some((favorite) => {
            const normalizedFavorite = normalizeSongKey(favorite);
            if (normalizedFavorite === normalizedKey) return true;
            if (!targetSong) return false;

            const favoriteSong = songs.find((song) =>
                normalizedFavorite === normalizeSongKey(song.id) ||
                normalizedFavorite === normalizeSongKey(song.path),
            );
            return favoriteSong?.id === targetSong.id;
        });
    }

    function toggleFavorite(key: string) {
        setFavorites(prev => {
            const next = new Set(prev);
            const normalizedKey = normalizeSongKey(key);
            const targetSong = songs.find((song) =>
                normalizedKey === normalizeSongKey(song.id) ||
                normalizedKey === normalizeSongKey(song.path),
            );
            const existingKey = [...next].find((favorite) => {
                const normalizedFavorite = normalizeSongKey(favorite);
                if (normalizedFavorite === normalizedKey) return true;
                if (!targetSong) return false;

                const favoriteSong = songs.find((song) =>
                    normalizedFavorite === normalizeSongKey(song.id) ||
                    normalizedFavorite === normalizeSongKey(song.path),
                );
                return favoriteSong?.id === targetSong.id;
            });

            if (existingKey !== undefined) {
                next.delete(existingKey);
            }else{
                next.add(targetSong?.id ?? key);
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
        setAutoplay((enabled) => !enabled)
        if(!playing){
            playNext()
        }
    }

    function createLocalPlaylist(name: string, songs: SongListing[]) {
        const cleanedName = name.trim();
        if (!cleanedName) return;

        const normalizedSongs = songs.map((entry) => entry.song.id);

        setLocalPlaylists((current) => {
            const next = current.filter((playlist) => playlist.name.toLowerCase() !== cleanedName.toLowerCase());
            return [...next, { name: cleanedName, songs: normalizedSongs }];
        });
    }

    function addPlaylist(name: string, key?: string) {
        const cleanedName = name.trim();
        if (!cleanedName) return;
        if (cleanedName.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) return;

        const normalizedKey = key ? normalizeSongKey(key) : undefined;

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

            const targetSong = songs.find((song) =>
                normalizedKey === normalizeSongKey(song.id) ||
                normalizedKey === normalizeSongKey(song.path),
            );
            const updatedSongs = existing.songs.some((songId) => {
                if (normalizeSongKey(songId) === normalizedKey) return true;
                if (!targetSong) return false;

                const savedSong = songs.find((song) =>
                    normalizeSongKey(songId) === normalizeSongKey(song.id) ||
                    normalizeSongKey(songId) === normalizeSongKey(song.path),
                );
                return savedSong?.id === targetSong.id;
            })
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

    function reorderPlaylist(name: string, songIds: string[]) {
        if (name.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) {
            setFavorites((current) => {
                const orderedIds = new Set(songIds);
                const keysBySongId = new Map<string, string>();
                for (const key of current) {
                    const song = songs.find((entry) =>
                        normalizeSongKey(key) === normalizeSongKey(entry.id) ||
                        normalizeSongKey(key) === normalizeSongKey(entry.path),
                    );
                    if (song && !keysBySongId.has(song.id)) {
                        keysBySongId.set(song.id, key);
                    }
                }
                const orderedFavorites = songIds.map((id) => keysBySongId.get(id) ?? id);
                const remainingFavorites = [...current].filter((key) => {
                    const song = songs.find((entry) =>
                        normalizeSongKey(key) === normalizeSongKey(entry.id) ||
                        normalizeSongKey(key) === normalizeSongKey(entry.path),
                    );
                    return !song || !orderedIds.has(song.id);
                });
                return new Set([...orderedFavorites, ...remainingFavorites]);
            });
            return true;
        }

        const playlist = [...playlists].find(
            (entry) => entry.name.toLowerCase() === name.toLowerCase(),
        );

        if (playlist) {
            const keysBySongId = new Map<string, string>();
            for (const key of playlist.songs) {
                const song = songs.find((entry) =>
                    normalizeSongKey(key) === normalizeSongKey(entry.id) ||
                    normalizeSongKey(key) === normalizeSongKey(entry.path),
                );
                if (song && !keysBySongId.has(song.id)) {
                    keysBySongId.set(song.id, key);
                }
            }

            const orderedIds = new Set(songIds);
            const orderedKeys = songIds.map((id) => keysBySongId.get(id) ?? id);
            const remainingKeys = playlist.songs.filter((key) => {
                const song = songs.find((entry) =>
                    normalizeSongKey(key) === normalizeSongKey(entry.id) ||
                    normalizeSongKey(key) === normalizeSongKey(entry.path),
                );
                return !song || !orderedIds.has(song.id);
            });

            setPlaylists((current) => new Set(
                [...current].map((entry) => entry.name.toLowerCase() === name.toLowerCase()
                    ? { ...entry, songs: [...orderedKeys, ...remainingKeys] }
                    : entry),
            ));
            return true;
        }

        if (!localPlaylists.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
            return false;
        }

        setLocalPlaylists((current) => current.map((entry) =>
            entry.name.toLowerCase() === name.toLowerCase()
                ? { ...entry, songs: songIds }
                : entry,
        ));
        return true;
    }

    function removePlaylistSong(name: string, songId: string) {
        if (name.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) {
            const targetSong = songs.find((song) => song.id === songId);
            setFavorites((current) => new Set(
                [...current].filter((key) => {
                    if (key === songId) return false;
                    if (!targetSong) return true;
                    const savedSong = songs.find((song) =>
                        normalizeSongKey(key) === normalizeSongKey(song.id) ||
                        normalizeSongKey(key) === normalizeSongKey(song.path),
                    );
                    return savedSong?.id !== targetSong.id;
                }),
            ));
            return true;
        }

        const playlist = [...playlists].find(
            (entry) => entry.name.toLowerCase() === name.toLowerCase(),
        );
        if (playlist) {
            const targetSong = songs.find((song) => song.id === songId);
            setPlaylists((current) => new Set(
                [...current].map((entry) => entry.name.toLowerCase() !== name.toLowerCase()
                    ? entry
                    : {
                        ...entry,
                        songs: entry.songs.filter((key) => {
                            if (key === songId) return false;
                            if (!targetSong) return true;
                            const savedSong = songs.find((song) =>
                                normalizeSongKey(key) === normalizeSongKey(song.id) ||
                                normalizeSongKey(key) === normalizeSongKey(song.path),
                            );
                            return savedSong?.id !== targetSong.id;
                        }),
                    }),
            ));
            return true;
        }

        if (!localPlaylists.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
            return false;
        }

        setLocalPlaylists((current) => current.map((entry) =>
            entry.name.toLowerCase() !== name.toLowerCase()
                ? entry
                : { ...entry, songs: entry.songs.filter((id) => id !== songId) },
        ));
        return true;
    }

    function deletePlaylist(name: string) {
        if (name.toLowerCase() === FAVORITES_PLAYLIST_NAME.toLowerCase()) return;

        if (queueSourceIdRef.current?.toLowerCase() === `playlist:${name}`.toLowerCase()) {
            queueRef.current = [];
            queueSourceIdRef.current = null;
            audioRef.current?.pause();
            setPlaying(false);
            setCurrentSong(null);
            setCurrentTime(0);
        }

        setPlaylists((current) => new Set(
            [...current].filter((playlist) => playlist.name.toLowerCase() !== name.toLowerCase()),
        ));
        setLocalPlaylists((current) => current.filter(
            (playlist) => playlist.name.toLowerCase() !== name.toLowerCase(),
        ));
    }

    return (
        <PlayerContext.Provider
            value={{
                songs,
                covers,
                currentQueue: queueRef.current,
                currentSong,
                playing,
                currentTime,
                duration,
                volume,
                autoplay,
                playlists: playlistsWithFavorites,
                setQueue,
                queueSong,
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
                reorderPlaylist,
                removePlaylistSong,
                createLocalPlaylist,
                deletePlaylist,
            }}
        >
            {children}
            <audio ref={audioRef} />
        </PlayerContext.Provider>
    );
}