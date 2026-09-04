import { useExplorer } from "../ExplorerContext";
import styles from "./FileExplorer.module.css";
import ListItem from "./ListItem";

function FileExplorer() {
    const {
        setFilter,
        currentViewType,
        setViewType,
        currentParent,
        currentChildren,
        canReturn,
        returnToParent
    } = useExplorer()

    return (
        <div className={styles.module}>
            <div className={styles.control}>
                <button 
                    aria-pressed={currentViewType === "artists"}
                    onClick={() => setViewType("artists")}
                    >Songs</button>
                <button 
                    aria-pressed={currentViewType === "playlists"}
                    onClick={() => setViewType("playlists")}
                    >Playlists</button>
            </div>

            <div className={styles.name}>{currentParent.name}</div>

            <input type="text" className={styles.search}
                placeholder={"search"}
                onChange={(e) => {setFilter(e.target.value.toLowerCase())}}/>

            {canReturn && <button onClick={returnToParent}>
                Back
            </button>
            }

            <div className={styles.children}>
                {
                    currentChildren.map(child => {
                        return (
                            <ListItem
                                key={child.id}
                                id={child.id}
                                name={child.name}
                                icon={child.art != null ? (
                                    <img
                                        src={`music:///song?path=${encodeURIComponent(child.art)}`}
                                        alt=""
                                    />
                                ) : null}
                            />
                        )
                    })
                }
            </div>
        </div>
    );
}

export default FileExplorer;
