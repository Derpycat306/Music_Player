import { usePlayer } from '../../AudioPlayer/AudioPlayer'
import styles from './PlayBar.module.css'

function PlayBar(){
    const {currentSong, playing, currentTime, duration, volume, pause, seek, setVolume, playSong} = usePlayer();

    if(!currentSong)return <div className={styles.main}>
        Nothing Playing Yet
    </div>

    return <div className={styles.main}>
        <div className={styles.info}>
            <div>{currentSong.title}</div>
            <div>{currentSong.artist}</div>
        </div>

        <div className={styles.controls}>
            <button>◀</button>

            <button
                onClick={() =>
                    playing
                        ? pause()
                        : playSong(currentSong)
                }
            >
                {playing ? "⏸" : "▶"}
            </button>

            <button>▶</button>

            <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={e =>
                    seek(Number(e.target.value))
                }
            />
        </div>

        <div className={styles.volume}>
            <input 
                type="range" 
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
            />
        </div>
    </div>
}

export default PlayBar