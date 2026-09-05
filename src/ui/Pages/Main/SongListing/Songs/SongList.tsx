import { useExplorer } from '../../ExplorerContext';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function SongList () {
    const {currentSongs, currentSelected} = useExplorer();

    return (
        currentSelected && <div className={styles.module}>
            <div className={styles.name}>
                <span>{currentSelected.name}</span>
            </div>
            <div className={styles.songs}>
                {
                    currentSongs.map(songListing => (
                        <SongItem key={songListing.song.id} songListing={songListing} />
                    ))
                }
            </div>
        </div>
    )
}

export default SongList