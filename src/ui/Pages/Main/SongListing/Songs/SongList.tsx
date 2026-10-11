import { usePlayer } from '../../../../AudioPlayer/useAudioPlayer';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function SongList () {
    const {currentQueue, currentSong} = usePlayer();

    return (
        currentSong && currentQueue.length > 0 && <div className={styles.module}>
            <div className={styles.name}>
                <div className={styles.currentArt}>
                    {currentSong.art && (
                        <img
                            src={`music:///song?path=${encodeURIComponent(currentSong.art)}`}
                            alt=""
                        />
                    )}
                </div>
                <div className={styles.currentInfo}>
                    <span className={styles.nowPlayingLabel}>Now Playing</span>
                    <strong className={styles.currentTitle} title={currentSong.song.title}>
                        {currentSong.song.title}
                    </strong>
                    <span className={styles.currentArtist} title={currentSong.song.artist ?? "Unknown Artist"}>
                        {currentSong.song.artist ?? "Unknown Artist"}
                    </span>
                </div>
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