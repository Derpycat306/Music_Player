import type { Album } from "./FileExplorer";
import FolderItem from "./FolderItem";
import SongItem from "./SongItem";

function AlbumItem({album}: {album: Album}){
    return(
        <FolderItem key={album.name} name={album.name} children={[
            ...album.songs.map(song => (
                <SongItem key={song.id} song={song}/>
            ))
        ]}/>
    )
}

export default AlbumItem