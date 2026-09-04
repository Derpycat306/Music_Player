import styles from "./ListItem.module.css";
import { useExplorer } from "../ExplorerContext";

interface ListItemProps {
    id: string;
    name: string;
    icon?: React.ReactNode | null;
    onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function ListItem({ id, name, icon, onContextMenu }: ListItemProps) {
    const {traverse, currentSelectedId} = useExplorer();

    return (
        <div>
            <div
                className={`${styles.item} ${id === currentSelectedId ? styles.selected : ""}`}
                onClick={() => traverse(id)}
                onContextMenu={onContextMenu}
            >
                {icon && <div className={styles.icon}>{icon}</div>}
                <span className={styles.name}>{name}</span>
            </div>
        </div>
    );
}

export default ListItem;
