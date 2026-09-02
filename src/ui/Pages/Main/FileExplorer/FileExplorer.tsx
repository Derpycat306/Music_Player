import styles from "./FileExplorer.module.css";
import ArtistItem from "./Items/ArtistItem";
import SongItem from "./Items/Songs/SongItem";
import { usePlayer } from "../../../AudioPlayer/AudioPlayer";
import { useMemo, useState } from "react";
import PlaylistItem from "./Items/PlaylistItem";

export interface Folder {
    artists: ArtistListing[];
    songs: Song[];
}

export interface ArtistListing {
    id: string;
    name: string;
    albums: AlbumListing[];
    songs: Song[];
}

export interface AlbumListing {
    id: string;
    name: string;
    art: string | null;
    songs: Song[];
}

function build(songs: Song[], covers: AlbumCover[]): Folder {
    const root: Folder = {
        artists: [],
        songs: [],
    };

    for (const song of songs) {
        if (song.artist === null) {
            root.songs.push(song);
            continue;
        }

        let artistFolder = root.artists.find(
            (folder) => folder.name === song.artist,
        );

        if (artistFolder === undefined) {
            artistFolder = {
                id: `artist:${song.artist}`,
                name: song.artist,
                albums: [],
                songs: [],
            };

            root.artists.push(artistFolder);
        }

        if (song.album) {
            let albumFolder = artistFolder.albums.find(
                (folder) => folder.name === song.album,
            );

            if (albumFolder === undefined) {
                albumFolder = {
                    id: `album:${song.album}`,
                    name: song.album,
                    art: null,
                    songs: [],
                };

                if(covers.find((cover) => cover.title === song.album)){
                    albumFolder.art = covers.find((cover) => cover.title === song.album)?.coverPath || null;
                }

                artistFolder.albums.push(albumFolder);
            }

            albumFolder.songs.push(song);
        } else {
            artistFolder.songs.push(song);
        }
    }

    return root;
}

function FileExplorer() {
    const { songs, covers, isFavorite, playlists } = usePlayer();
    type View = "songs" | "favorites" | "playlists";
    const [view, setView] = useState<View>("songs");
    const [filter, setFilter] = useState<string | null>(null);

    const filteredSongs: Song[] = useMemo(() => {
        return !filter ? songs : 
        songs.filter(song => {
            return song.title.toLowerCase().includes(filter) ||
            song.artist?.toLowerCase().includes(filter) ||
            song.album?.toLowerCase().includes(filter);
        })
    }, [songs, filter])

    const folder = useMemo(() => {
        return build(
            filteredSongs, 
            covers);
    }, [songs, covers, filter]);

    const favoriteSongs = useMemo(
        () => filteredSongs.filter((song) => isFavorite(song.id)),
        [filteredSongs, isFavorite],
    );

    const views = {
        songs: <>{
                ...folder.artists.map((artist) => (
                    <ArtistItem key={artist.id} artist={artist} />
                ))
            }
            {
                ...folder.songs.map((song) => (
                    <SongItem key={song.id} song={song} queue={filteredSongs} />
                ))
            }</>,

        favorites: <>{
            ...favoriteSongs.map((song) => (
                    <SongItem key={song.id} song={song} queue={favoriteSongs} />
                ))
            }</>,

        playlists: <>{
            ...[...playlists].map((playlist) => (
                <PlaylistItem key={playlist.name} playlist={playlist} />
            ))
        }</>               
    }

    return (
        <div className={styles.module}>
            <input type="text" className={styles.search}
                placeholder={"search"}
                onChange={(e) => {setFilter(e.target.value.toLowerCase())}}/>

            <div className={styles.control}>
                <button 
                    aria-pressed={view === "songs"}
                    onClick={() => setView("songs")}
                    >Songs</button>
                <button 
                    aria-pressed={view === "favorites"}
                    onClick={() => setView("favorites")}
                    >Favorites</button>
                <button 
                    aria-pressed={view === "playlists"}
                    onClick={() => setView("playlists")}
                    >Playlists</button>
            </div>

            <div className={styles.children}>
                {views[view]}
            </div>
        </div>
    );
}

export default FileExplorer;
