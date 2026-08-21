import styles from './MainHeader.module.css'
import { Settings } from 'iconoir-react'

function MainHeader(){
    return <div className={styles.main}>
        <div className={styles.left}>Stuff</div>
        <div className={styles.center}>Title</div>
        <div className={styles.right}>
            <Settings className={styles.settings} onClick={() => {
                //some settings stuff
            }}/>
        </div>
    </div>
}

export default MainHeader