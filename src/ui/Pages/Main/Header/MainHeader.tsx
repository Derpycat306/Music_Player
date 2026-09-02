import { Link } from "react-router-dom";
import styles from "./MainHeader.module.css";
import { Settings } from "iconoir-react";

function MainHeader() {
    return (
        <div className={styles.main}>
            <div className={styles.left}>Stuff</div>
            <div className={styles.center}>Title</div>
            <div className={styles.right}>
                <Link to={"/settings"} className={styles.settingsLink}>
                    <Settings className={styles.settings} />
                </Link>
            </div>
        </div>
    );
}

export default MainHeader;
