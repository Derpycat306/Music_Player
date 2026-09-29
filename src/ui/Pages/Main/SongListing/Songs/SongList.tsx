import { usePlayer } from '../../../../AudioPlayer/useAudioPlayer';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function SongList () {
    const {currentQueue, currentSong} = usePlayer();

    return (
        currentSong && <div className={styles.module}>
            <div className={styles.name}>
                <span>{currentSong.song.title}</span>
            </div>
            <div className={styles.songs}>
                {
                    currentQueue.map(songListing => (
                        <SongItem key={songListing.song.id} songListing={songListing} />
                    ))
                }
            </div>
        </div>
    )
}

export default SongList