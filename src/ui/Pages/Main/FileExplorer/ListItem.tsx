import styles from "./ListItem.module.css";
import { useExplorer } from "../ExplorerContext/UseExplorer";
import { useEffect, useRef, useState } from "react";

interface ListItemProps {
    id: string;
    name: string;
    icon?: React.ReactNode | null;
    onSelect?: () => void;
    onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function ListItem({ id, name, icon, onSelect, onContextMenu }: ListItemProps) {
    const {traverse, currentSelectedId} = useExplorer();
    const nameRef = useRef<HTMLSpanElement>(null);
    const nameMeasureRef = useRef<HTMLSpanElement>(null);
    const [isNameScrollable, setIsNameScrollable] = useState(false);

    useEffect(() => {
        const nameElement = nameRef.current;
        if (!nameElement) return;

        const updateScrollable = () => {
            const textWidth = nameMeasureRef.current?.getBoundingClientRect().width ?? 0;
            setIsNameScrollable(textWidth > nameElement.clientWidth + 1);
        };

        const observer = new ResizeObserver(updateScrollable);
        observer.observe(nameElement);
        updateScrollable();

        return () => observer.disconnect();
    }, [name]);

    return (
        <div>
            <div
                className={`${styles.item} ${id === currentSelectedId ? styles.selected : ""}`}
                onClick={() => onSelect?.() ?? traverse(id)}
                onContextMenu={onContextMenu}
            >
                {icon && <div className={styles.icon}>{icon}</div>}
                <span
                    ref={nameRef}
                    className={`${styles.name} ${isNameScrollable ? styles.nameScrollable : ""}`}
                    title={name}
                >
                    <span className={styles.nameTrack}>
                        <span className={styles.nameText}>{name}</span>
                        {isNameScrollable && <span className={styles.nameText} aria-hidden="true">{name}</span>}
                    </span>
                    <span ref={nameMeasureRef} className={styles.nameMeasure} aria-hidden="true">{name}</span>
                </span>
            </div>
        </div>
    );
}

export default ListItem;
