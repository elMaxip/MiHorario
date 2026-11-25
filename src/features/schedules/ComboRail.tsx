import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { formatDuration } from "@/domain/time";
import { DAYS, type Schedule } from "@/domain/types";
import type { GenerationRequest } from "@/state/generation";
import { daysLabel, gapLabel } from "./model";
import { useMediaQuery } from "./useMediaQuery";
import styles from "./ComboRail.module.css";

/** Alto (vertical) o ancho (horizontal) de cada elemento, incluido el espacio entre ellos. */
const ITEM_V = 76;
const ITEM_H = 168;
const OVERSCAN = 6;

interface ComboRailProps {
  schedules: readonly Schedule[];
  currentIndex: number;
  request: GenerationRequest;
  range: { start: number; end: number };
  onSelect: (n: number) => void;
  /** Se llegó al final del carril. */
  onReachEnd: () => void;
}

export function ComboRail({ schedules, currentIndex, request, range, onSelect, onReachEnd }: ComboRailProps) {
  const horizontal = useMediaQuery("(max-width: 980px)");
  const size = horizontal ? ITEM_H : ITEM_V;
  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ pos: 0, len: 720 });

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () =>
      setView({
        pos: horizontal ? el.scrollLeft : el.scrollTop,
        len: horizontal ? el.clientWidth : el.clientHeight,
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [horizontal]);

  // Mantiene a la vista el horario actual al navegar con las flechas.
  useEffect(() => {
    const el = scroller.current;
    if (!el || currentIndex < 0) return;
    const a = currentIndex * size;
    const z = a + size;
    const pos = horizontal ? el.scrollLeft : el.scrollTop;
    const len = horizontal ? el.clientWidth : el.clientHeight;
    let next = pos;
    if (a < pos) next = a;
    else if (z > pos + len) next = z - len;
    if (next !== pos) el.scrollTo(horizontal ? { left: next } : { top: next });
  }, [currentIndex, size, horizontal]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const pos = horizontal ? el.scrollLeft : el.scrollTop;
    const len = horizontal ? el.clientWidth : el.clientHeight;
    setView({ pos, len });
    if (pos + len >= schedules.length * size - size) onReachEnd();
  };

  const first = Math.max(0, Math.floor(view.pos / size) - OVERSCAN);
  const last = Math.min(schedules.length, Math.ceil((view.pos + view.len) / size) + OVERSCAN);
  const total = schedules.length * size;

  return (
    <div ref={scroller} className={styles.scroller} onScroll={onScroll}>
      <ul
        className={styles.list}
        style={horizontal ? { width: total, height: "100%" } : { height: total }}
      >
        {schedules.slice(first, last).map((s, k) => {
          const i = first + k;
          return (
            <li
              key={s.n}
              className={styles.item}
              style={horizontal ? { left: i * size, width: size - 4 } : { top: i * size, height: size - 4 }}
            >
              <Combo
                schedule={s}
                index={i}
                on={i === currentIndex}
                request={request}
                range={range}
                onSelect={onSelect}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ComboProps {
  schedule: Schedule;
  index: number;
  on: boolean;
  request: GenerationRequest;
  range: { start: number; end: number };
  onSelect: (n: number) => void;
}

const Combo = memo(function Combo({ schedule, index, on, request, range, onSelect }: ComboProps) {
  const { days, gap } = schedule.stats;
  const span = range.end - range.start;
  const col = 100 / DAYS.length;
  return (
    <button
      type="button"
      className={styles.combo}
      aria-pressed={on}
      aria-label={`Ver horario ${index + 1}, ${daysLabel(days)}, ${gap ? `${formatDuration(gap)} de ventanas` : "sin ventanas"}`}
      onClick={() => onSelect(schedule.n)}
    >
      <span className={styles.mini} aria-hidden="true">
        {schedule.picks.flatMap((p, i) =>
          request.subjects[i].sections[p].blocks.map((b, j) => (
            <i
              key={`${i}-${j}`}
              className={`subject-${request.colors[i] ?? i % 6}`}
              style={
                {
                  left: `${DAYS.indexOf(b.day) * col + 1.5}%`,
                  width: `${col - 3}%`,
                  top: `${((b.start - range.start) / span) * 100}%`,
                  height: `${((b.end - b.start) / span) * 100 - 1}%`,
                } as CSSProperties
              }
            />
          )),
        )}
      </span>
      <span>
        <b className="num">Horario {index + 1}</b>
        <small>{daysLabel(days)}</small>
        <small className="num">{gapLabel(gap)}</small>
      </span>
    </button>
  );
});
