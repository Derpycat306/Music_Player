import styles from './MainHeader.module.css'
import { Settings } from 'iconoir-react'

function MainHeader(){
    return <div className={styles.main}>
        <Settings className={styles.settings}/>
    </div>
}

export default MainHeader