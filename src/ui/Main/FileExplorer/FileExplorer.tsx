import styles from "./FileExplorer.module.css";
import ArtistItem from "./ArtistItem";
import SongItem from "./SongItem";
import { usePlayer } from "../../AudioPlayer/AudioPlayer";
import { useMemo } from "react";
import FolderItem from "./FolderItem";

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

    const folder = useMemo(() => {
        return build(songs, covers);
    }, [songs, covers]);

    console.log(songs);

    return (
        <div className={styles.module}>
            <div className={styles.children}>
                <FolderItem 
                    name={"Songs"}
                    children={[
                        ...folder.artists.map((artist) => (
                            <ArtistItem key={artist.id} artist={artist} />
                        )),

                        ...folder.songs.map((song) => (
                            <SongItem key={song.id} song={song} />
                        ))
                    ]}/>

                <FolderItem name={"Favorites"}
                children={[
                    ...songs.filter((song) => isFavorite(song.id))
                        .map((song) => (
                            <SongItem key={song.id} song={song} />
                        ))
                ]}/>
                <FolderItem name={"Playlists"}/>
            </div>
        </div>
    );
}

export default FileExplorer;
