import { formatHM, formatRange } from "@/domain/time";
import { DAY_NAMES, DAYS, type Availability, type Day } from "@/domain/types";
import type { PlacedBlock } from "./model";
import styles from "./WeekGrid.module.css";

interface WeekGridProps {
  byDay: Record<Day, PlacedBlock[]>;
  availability: Availability;
  range: { start: number; end: number };
  highlight: string | null;
  onPick: (subjectId: string) => void;
}

export function WeekGrid({ byDay, availability, range, highlight, onPick }: WeekGridProps) {
  const pxPerHour = range.end - range.start > 480 ? 52 : 76;
  const y = (m: number) => ((m - range.start) / 60) * pxPerHour;
  const height = y(range.end);
  const hours: number[] = [];
  for (let m = range.start; m < range.end; m += 60) hours.push(m);

  return (
    <div className={styles.week}>
      <div className={styles.head} />
      {DAYS.map((d) => (
        <div key={d} className={styles.head}>
          <span className={styles.long}>{DAY_NAMES[d]}</span>
          <span className={styles.short} aria-hidden="true">
            {d}
          </span>
        </div>
      ))}
      <div className={styles.axis} style={{ height }} aria-hidden="true">
        {hours.map((m) => (
          <span key={m} className="num" style={{ top: y(m) }}>
            {formatHM(m)}
          </span>
        ))}
      </div>
      {DAYS.map((d) => {
        const a = availability[d];
        return (
          <div key={d} className={styles.col} style={{ height }}>
            {a.on && (
              <div
                className={styles.ok}
                style={{ top: y(Math.max(a.start, range.start)), height: y(Math.min(a.end, range.end)) - y(Math.max(a.start, range.start)) }}
              />
            )}
            {hours.map((m) => (
              <hr key={m} style={{ top: y(m) }} aria-hidden="true" />
            ))}
            {byDay[d].map((b) => {
              const px = ((b.end - b.start) / 60) * pxPerHour;
              const { subject, section, color, origin } = b.item;
              const dim = highlight !== null && highlight !== subject.id;
              return (
                <button
                  key={`${section.code}-${b.start}`}
                  type="button"
                  className={`${styles.block} subject-${color} ${dim ? styles.dim : ""}`}
                  style={{ top: y(b.start) + 1, height: px - 1 }}
                  aria-pressed={highlight === subject.id}
                  aria-label={`${subject.name}, ${DAY_NAMES[d].toLocaleLowerCase("es")} de ${formatHM(b.start)} a ${formatHM(b.end)}, sección ${section.code}${origin ? `, de ${origin}` : ""}`}
                  onClick={() => onPick(subject.id)}
                >
                  <b>{subject.name}</b>
                  <span className="num">{formatRange(b.start, b.end)}</span>
                  {px > 112 && <span>{section.docente}</span>}
                  {origin && <span className={styles.origin}>{origin}</span>}
                  <span className={styles.sig} translate="no">
                    {subject.sigla.replace(/\d.*$/, "") || subject.sigla}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
