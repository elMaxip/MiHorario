import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo, useRef, type PointerEvent } from "react";
import {
  bandGradient,
  GRID_END,
  GRID_START,
  GRID_STEP,
  PRESETS,
  presetActive,
  uniform,
} from "@/domain/availability";
import { sectionFits, sectionsInScope } from "@/domain/fit";
import { formatHM } from "@/domain/time";
import { DAY_NAMES, DAYS, type Day, type DayRange } from "@/domain/types";
import { availabilityAtom, resetPrefsAtom, scopeAtom, subjectMapAtom } from "@/state/atoms";
import { LinkButton } from "@/ui/Button";
import { BareSelect } from "@/ui/Field";
import styles from "./AvailabilityPanel.module.css";

const TONES = ["var(--tone-morning)", "var(--tone-afternoon)", "var(--tone-night)"] as const;
const SPAN = GRID_END - GRID_START;
const pct = (m: number) => `${((m - GRID_START) / SPAN) * 100}%`;
const height = (a: number, z: number) => `${((z - a) / SPAN) * 100}%`;
const AXIS = [8, 10, 12, 14, 16, 18, 20, 22].map((h) => h * 60);
const STEPS: number[] = [];
for (let m = GRID_START; m <= GRID_END; m += GRID_STEP) STEPS.push(m);

interface AvailabilityPanelProps {
  peekId: string | null;
}

export function AvailabilityPanel({ peekId }: AvailabilityPanelProps) {
  const [availability, setAvailability] = useAtom(availabilityAtom);
  const resetPrefs = useSetAtom(resetPrefsAtom);
  const scope = useAtomValue(scopeAtom);
  const peek = useAtomValue(subjectMapAtom).get(peekId ?? "") ?? null;
  const drag = useRef<{ day: Day; edge: "start" | "end" } | null>(null);

  const setDay = (day: Day, patch: Partial<DayRange>) =>
    setAvailability((a) => ({ ...a, [day]: { ...a[day], ...patch } }));

  // Bloques de la asignatura bajo el cursor, por día.
  const ghosts = useMemo(() => {
    const out: Record<Day, { start: number; end: number; fits: boolean }[]> = {
      Lu: [], Ma: [], Mi: [], Ju: [], Vi: [], Sa: [],
    };
    if (!peek) return out;
    for (const i of sectionsInScope(peek, scope)) {
      const sec = peek.sections[i];
      const fits = sectionFits(sec, availability);
      for (const b of sec.blocks) out[b.day].push({ start: b.start, end: b.end, fits });
    }
    return out;
  }, [peek, scope, availability]);

  const minuteAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const raw = GRID_START + ((e.clientY - r.top) / r.height) * SPAN;
    return Math.max(GRID_START, Math.min(GRID_END, Math.round(raw / GRID_STEP) * GRID_STEP));
  };

  const apply = (day: Day, edge: "start" | "end", m: number) =>
    setAvailability((a) => {
      const c = a[day];
      const next = edge === "start" ? { start: Math.min(m, c.end - GRID_STEP) } : { end: Math.max(m, c.start + GRID_STEP) };
      if ((next.start ?? c.start) === c.start && (next.end ?? c.end) === c.end) return a;
      return { ...a, [day]: { ...c, ...next } };
    });

  const onDown = (day: Day) => (e: PointerEvent<HTMLDivElement>) => {
    const h = availability[day];
    if (!h.on || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const m = minuteAt(e);
    const edge = Math.abs(m - h.start) <= Math.abs(m - h.end) ? "start" : "end";
    drag.current = { day, edge };
    apply(day, edge, m);
  };
  const onMove = (day: Day) => (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.day === day) apply(day, drag.current.edge, minuteAt(e));
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <section aria-labelledby="h-disp">
      <h2 id="h-disp">Disponibilidad</h2>
      <div className={styles.presets} role="group" aria-label="Rangos rápidos">
        {PRESETS.map((p) => {
          const on = presetActive(availability, p);
          return (
            <button
              key={p.label}
              type="button"
              className={styles.preset}
              aria-pressed={on}
              onClick={() => setAvailability(uniform(p.start, p.end))}
            >
              <i style={{ background: bandGradient(p.start, p.end, TONES) }} aria-hidden="true" />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className={styles.grid}>
        <div className={styles.head} />
        {DAYS.map((d) => (
          <div key={d} className={styles.head}>
            <label>
              <input
                type="checkbox"
                checked={availability[d].on}
                onChange={() => setDay(d, { on: !availability[d].on })}
                aria-label={`Puedo asistir el ${DAY_NAMES[d].toLocaleLowerCase("es")}`}
              />
              <span className={styles.long} aria-hidden="true">
                {DAY_NAMES[d]}
              </span>
              <span className={styles.short} aria-hidden="true">
                {d}
              </span>
            </label>
          </div>
        ))}

        <div className={styles.axis} aria-hidden="true">
          {AXIS.map((m) => (
            <span key={m} className="num" style={{ top: pct(m) }}>
              {formatHM(m)}
            </span>
          ))}
        </div>
        {DAYS.map((d) => {
          const h = availability[d];
          const a = Math.max(h.start, GRID_START);
          const z = Math.min(h.end, GRID_END);
          return (
            <div
              key={d}
              className={styles.track}
              aria-hidden="true"
              onPointerDown={onDown(d)}
              onPointerMove={onMove(d)}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {h.on && (
                <div
                  className={styles.bar}
                  style={{ top: pct(a), height: height(a, z), background: bandGradient(a, z, TONES) }}
                >
                  <div>
                    <i />
                    <span className="num">{formatHM(h.start)}</span>
                  </div>
                  <div>
                    <span className="num">{formatHM(h.end)}</span>
                    <i />
                  </div>
                </div>
              )}
              {ghosts[d].map((g, i) => (
                <div
                  key={i}
                  className={`${styles.ghost} ${g.fits ? "" : styles.ghostOut}`}
                  style={{ top: pct(g.start), height: height(g.start, g.end) }}
                />
              ))}
            </div>
          );
        })}

        <div className={styles.inputLabels} aria-hidden="true">
          <span>Desde</span>
          <span>Hasta</span>
        </div>
        <div className={styles.inputs}>
          {DAYS.map((d) => {
            const h = availability[d];
            const name = DAY_NAMES[d];
            return (
              <div key={d} className={styles.input}>
                <span className={styles.inputDay} aria-hidden="true">
                  {name}
                </span>
                <BareSelect
                  className={`${styles.select} num`}
                  aria-label={`${name}, desde`}
                  value={h.start}
                  disabled={!h.on}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setDay(d, { start: m, end: Math.max(h.end, m + GRID_STEP) });
                  }}
                >
                  {withValue(STEPS.slice(0, -1), h.start).map((m) => (
                    <option key={m} value={m}>
                      {formatHM(m)}
                    </option>
                  ))}
                </BareSelect>
                <BareSelect
                  className={`${styles.select} num`}
                  aria-label={`${name}, hasta`}
                  value={h.end}
                  disabled={!h.on}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setDay(d, { end: m, start: Math.min(h.start, m - GRID_STEP) });
                  }}
                >
                  {withValue(STEPS.slice(1), h.end).map((m) => (
                    <option key={m} value={m}>
                      {formatHM(m)}
                    </option>
                  ))}
                </BareSelect>
              </div>
            );
          })}
        </div>
      </div>

      <p className={styles.hint}>
        <span aria-live="polite">
          {peek
            ? `${peek.name}: línea continua si la sección cabe, punteada si no.`
            : "Las franjas son las horas en que puedes ir. Su tono se intensifica de la mañana a la noche."}
        </span>
        {!peek && <span className={styles.desktopOnly}> Arrastra sus bordes para cambiarlas.</span>}
      </p>
      <LinkButton className={styles.reset} onClick={resetPrefs}>
        Restablecer preferencias
      </LinkButton>
    </section>
  );
}

/** Asegura que el valor actual esté entre las opciones (p. ej. tras «Ampliar horas»). */
function withValue(options: number[], value: number): number[] {
  return options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
}
