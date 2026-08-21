import { useEffect, useRef, useState } from 'react'
import styles from './FolderItem.module.css'

interface FolderItemProps{
    name: string;
    children?: React.ReactNode[]
    icon?: React.ReactNode | null
}

function FolderItem({name, children, icon}: FolderItemProps){
    const [expand, setExpand] = useState<boolean>(false);

    return(
        <div>
            <div
                className={styles.item}
                onClick={() => setExpand(prev => !prev)}
            >
                <div className={styles.icon}>{icon ? icon : ""}</div>
                <span className={styles.name}>{name}</span>
                <span className={`${styles.arrow} ${expand ? styles.open : ""}`}>{"▶"}</span>
            </div>

            <div className={`${styles.children} ${expand ? styles.open : ""}`}>
                {expand && <div className={styles.innerChildren}>{children}</div>}
            </div>
        </div>
    )
}

export default FolderItem