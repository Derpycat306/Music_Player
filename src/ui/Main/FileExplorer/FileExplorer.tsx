import styles from "./FileExplorer.module.css";
import ArtistItem from "./ArtistItem";
import SongItem from "./SongItem";
import { usePlayer } from "../../AudioPlayer/AudioPlayer";
import { useMemo, useState } from "react";

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
    const { songs, covers, isFavorite} = usePlayer();
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


    const views = {
        songs: <>{
                ...folder.artists.map((artist) => (
                    <ArtistItem key={artist.id} artist={artist} />
                ))
            }
            {
                ...folder.songs.map((song) => (
                    <SongItem key={song.id} song={song} />
                ))
            }</>,

        favorites: <>{
            ...filteredSongs.filter((song) => isFavorite(song.id))
                .map((song) => (
                    <SongItem key={song.id} song={song} />
                ))
            }</>,
        playlists: <></>               
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
