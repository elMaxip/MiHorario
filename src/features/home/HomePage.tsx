import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { formatHM, formatRange } from "@/domain/time";
import { DropZone } from "./DropZone";
import { useOfferingLoader } from "./useOfferingLoader";
import styles from "./HomePage.module.css";

const START = 480;
const END = 900;
const pct = (m: number) => `${((m - START) / (END - START)) * 100}%`;
const HOURS = [8, 9, 10, 11, 12, 13, 14].map((h) => h * 60);

/** Horario de ejemplo para jueves, viernes y sábado. Solo decorativo. */
const DEMO: { day: string; blocks: { name: string; start: number; end: number; color: number }[] }[] = [
  {
    day: "Jueves",
    blocks: [
      { name: "Inglés elemental II", start: 481, end: 560, color: 1 },
      { name: "Desarrollo fullstack I", start: 571, end: 650, color: 3 },
      { name: "Ingeniería de software", start: 661, end: 790, color: 2 },
    ],
  },
  {
    day: "Viernes",
    blocks: [
      { name: "Inglés elemental II", start: 481, end: 560, color: 1 },
      { name: "Base de datos aplicada II", start: 661, end: 740, color: 0 },
    ],
  },
  { day: "Sábado", blocks: [] },
];

export function HomePage() {
  const loader = useOfferingLoader();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice === "reupload";
  let order = 0;

  return (
    <main className={styles.home}>
      <div className={styles.days} aria-hidden="true">
        <span />
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className={styles.sheet}>
        <div className={styles.rules} aria-hidden="true">
          {HOURS.map((h) => (
            <i key={h} style={{ top: pct(h) }} />
          ))}
        </div>
        <div className={styles.hours} aria-hidden="true">
          {HOURS.map((h) => (
            <span key={h} className="num" style={{ top: pct(h) }}>
              {formatHM(h)}
            </span>
          ))}
        </div>
        <div className={styles.pitch}>
          <div>
            <h1>Todos tus horarios posibles, sin topes</h1>
            <p className={styles.lead}>
              Sube el Excel con la oferta de asignaturas, elige tus ramos y las horas en que puedes ir. MiHorario
              calcula cada combinación de secciones que calza.
            </p>
          </div>
          <DropZone loader={loader} notice={notice} />
        </div>
        {DEMO.map((col, i) => (
          <div key={col.day} className={styles.col} style={{ gridColumn: 5 + i }} aria-hidden="true">
            {col.blocks.map((b) => (
              <div
                key={b.start}
                className={`${styles.block} subject-${b.color}`}
                style={
                  {
                    top: `calc(${pct(b.start)} + 2px)`,
                    height: `calc(${((b.end - b.start) / (END - START)) * 100}% - 2px)`,
                    "--delay": `${order++ * 0.09}s`,
                  } as CSSProperties
                }
              >
                <b>{b.name}</b>
                <span className="num">{formatRange(b.start, b.end)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
