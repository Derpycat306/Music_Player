import { useExplorer } from '../../ExplorerContext';
import SongItem from './Item/SongItem';
import styles from './SongList.module.css'

function SongList () {
    const {currentSongs, currentSelected, setSelected} = useExplorer();

    return (
        currentSelected && <div className={styles.module}>
            <div className={styles.name}>
                <span>{currentSelected.name}</span>
                <button
                    type="button"
                    className={styles.close}
                    aria-label="Close song list"
                    title="Close song list"
                    onClick={() => setSelected(null)}
                >
                    X
                </button>
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