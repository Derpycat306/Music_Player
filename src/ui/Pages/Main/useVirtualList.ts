import { useLayoutEffect, useState, type RefObject } from "react";

type VirtualRange = {
    start: number;
    end: number;
};

export function useVirtualList<ScrollElement extends HTMLElement, ListElement extends HTMLElement>(
    scrollRef: RefObject<ScrollElement | null>,
    listRef: RefObject<ListElement | null>,
    itemCount: number,
    itemSize: number,
    overscan = 6,
    enabled = true,
): VirtualRange {
    const [range, setRange] = useState<VirtualRange>(() => ({
        start: 0,
        end: Math.min(itemCount, 24),
    }));

    useLayoutEffect(() => {
        if (!enabled) return;

        const scrollElement = scrollRef.current;
        const listElement = listRef.current;
        if (!scrollElement || !listElement) return;

        const updateRange = () => {
            const listTop = listElement.getBoundingClientRect().top -
                scrollElement.getBoundingClientRect().top +
                scrollElement.scrollTop;
            const firstVisible = Math.floor((scrollElement.scrollTop - listTop) / itemSize);
            const visibleCount = Math.ceil(scrollElement.clientHeight / itemSize) + 1;
            const start = Math.max(0, Math.min(itemCount, firstVisible - overscan));
            const nextRange = {
                start,
                end: Math.max(start, Math.min(itemCount, firstVisible + visibleCount + overscan)),
            };

            setRange((current) =>
                current.start === nextRange.start && current.end === nextRange.end
                    ? current
                    : nextRange,
            );
        };

        updateRange();
        scrollElement.addEventListener("scroll", updateRange, { passive: true });
        const resizeObserver = new ResizeObserver(updateRange);
        resizeObserver.observe(scrollElement);
        resizeObserver.observe(listElement);

        return () => {
            scrollElement.removeEventListener("scroll", updateRange);
            resizeObserver.disconnect();
        };
    }, [enabled, itemCount, itemSize, listRef, overscan, scrollRef]);

    return range;
}
