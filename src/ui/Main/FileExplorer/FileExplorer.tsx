import type { Song } from "../../../shared/types";
import styles from './FileExplorer.module.css'
import ArtistItem from "./ArtistItem";
import SongItem from "./SongItem";

export interface Folder{
    artists: Artist[];
    songs: Song[];
}

export interface Artist{
    id: string;
    name: string;
    albums: Album[];
    songs: Song[];
}

export interface Album{
    id: string;
    name: string;
    art: string | null;
    songs: Song[];
}

function build(songs: Song[]): Folder{
    const root: Folder = {
        artists: [],
        songs: []
    }

    for(const song of songs){
        if(song.artist === null){
            root.songs.push(song)
            continue
        }

        let artistFolder = root.artists.find(
            folder => folder.name === song.artist
        )

        if(artistFolder === undefined){
            artistFolder = {
                id: `artist:${song.artist}`,
                name: song.artist,
                albums: [],
                songs: []
            }

            root.artists.push(artistFolder)
        }

        if(song.album){
            let albumFolder = artistFolder.albums.find(
                folder => folder.name === song.album
            )

            if(albumFolder === undefined){
                albumFolder = {
                    id: `album:${song.album}`,
                    name: song.album,
                    art: null,
                    songs: []
                }

                artistFolder.albums.push(albumFolder)
            }

            albumFolder.songs.push(song)
        }else{
            artistFolder.songs.push(song)
        }
    }

    return root
}

function FileExplorer({songs}: {songs: Song[]}){
    let folder = build(songs)

    return <div className={styles.module}>
        <div className={styles.children}>
            {folder.artists.map(artist => (
                <ArtistItem key={artist.id} artist={artist}/>
            ))}

            {folder.songs.map(song => (
                <SongItem key={song.id} song={song} />
            ))}
        </div>
    </div>
}

export default FileExplorer