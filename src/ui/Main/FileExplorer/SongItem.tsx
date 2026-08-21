import type { Song } from "../../../shared/types"
import styles from './SongItem.module.css'
import { usePlayer } from "../../AudioPlayer/AudioPlayer";

function SongItem({song}: {song: Song}){
    const {playSong} = usePlayer();

    return <div className={styles.item} onClick={() => {playSong(song)}}>
        {song.title}
    </div>
}

export default SongItem