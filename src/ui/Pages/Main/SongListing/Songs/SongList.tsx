import { useExplorer } from '../../ExplorerContext';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function SongList () {
    const {currentSongs, currentSelected} = useExplorer();

    return (
        <div className={styles.module}>
            <div className={styles.name}>{currentSelected ? currentSelected.name : "Nothing selected yet"}</div>
            <div className={styles.songs}>
                {
                    currentSongs.map(song => (
                        <SongItem songListing={song} />
                    ))
                }
            </div>
        </div>
    )
}

export default SongList