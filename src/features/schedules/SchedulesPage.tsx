import { useAtom, useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { formatRange } from "@/domain/time";
import { DAY_NAMES, DAYS } from "@/domain/types";
import { sortAtom } from "@/state/atoms";
import { cancelBatch, generationAtom, nextBatch, type GenerationState } from "@/state/generation";
import type { SortKey } from "@/state/prefs";
import { BATCH_SIZE } from "@/workers/protocol";
import { Button, IconButton } from "@/ui/Button";
import { SelectField } from "@/ui/Field";
import { ChevronLeft, ChevronRight, DownloadIcon } from "@/ui/icons";
import { Progress } from "@/ui/Progress";
import { ComboRail } from "./ComboRail";
import { downloadSchedule } from "./exportPng";
import { blocksByDay, placeSchedule, sortSchedules, summary, weekRange } from "./model";
import { WeekGrid } from "./WeekGrid";
import styles from "./SchedulesPage.module.css";

export function SchedulesPage() {
  const gen = useAtomValue(generationAtom);
  if (!gen.request || gen.schedules.length === 0) return <Navigate to="/planificador" replace />;
  return <Schedules gen={gen} />;
}

function Schedules({ gen }: { gen: GenerationState }) {
  const request = gen.request!;
  const [sort, setSort] = useAtom(sortAtom);
  const sorted = useMemo(() => sortSchedules(gen.schedules, sort), [gen.schedules, sort]);
  const range = useMemo(() => weekRange(request.availability), [request.availability]);

  // El índice sigue al horario (por su número), no a la posición.
  const [selectedN, setSelectedN] = useState<number | null>(null);
  // Al pedir «siguiente» en el último, se avanza al primer horario nuevo cuando llegue.
  const [advanceFrom, setAdvanceFrom] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const pendingTarget =
    advanceFrom !== null && gen.schedules.length > advanceFrom ? gen.schedules[advanceFrom].n : null;
  const currentN = pendingTarget ?? selectedN ?? sorted[0].n;
  const found = sorted.findIndex((s) => s.n === currentN);
  const index = found < 0 ? 0 : found;
  const current = sorted[index];
  const waitingNext = advanceFrom !== null && pendingTarget === null && !gen.exhausted;

  const select = (n: number) => {
    setSelectedN(n);
    setAdvanceFrom(null);
    setHighlight(null);
  };

  const goPrev = () => index > 0 && select(sorted[index - 1].n);
  const goNext = () => {
    if (index < sorted.length - 1) select(sorted[index + 1].n);
    else if (!gen.exhausted) {
      setSelectedN(current.n);
      setAdvanceFrom(gen.schedules.length);
      setHighlight(null);
      nextBatch();
    }
  };

  const items = useMemo(() => placeSchedule(request, current), [request, current]);
  const byDay = useMemo(() => blocksByDay(items), [items]);
  const total = gen.schedules.length;
  const title = `Horario ${index + 1} de ${total}${gen.exhausted ? "" : "+"}`;
  const sub = summary(current);

  const pick = (id: string) => setHighlight((h) => (h === id ? null : id));

  return (
    <main className={styles.wrap}>
      <div className={styles.cal}>
        <aside className={styles.rail} aria-label="Combinaciones">
          <SelectField
            label="Ordenar por"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setSelectedN(null);
              setAdvanceFrom(null);
            }}
          >
            <option value="orig">Orden de la planilla</option>
            <option value="gap">Menos ventanas</option>
            <option value="days">Menos días</option>
            <option value="end">Salida más temprana</option>
          </SelectField>
          <p className={`${styles.railNote} num`}>
            {gen.exhausted
              ? `${total} ${total === 1 ? "horario" : "horarios"} en total`
              : sort !== "orig"
                ? `Ordenado entre los ${total} horarios generados`
                : `${total} horarios generados`}
          </p>
          <ComboRail
            schedules={sorted}
            currentIndex={index}
            request={request}
            range={range}
            onSelect={select}
            onReachEnd={nextBatch}
          />
          <BatchControls gen={gen} className={styles.railBatch} />
        </aside>

        <div className={styles.main}>
          <div className={styles.head}>
            <div>
              <h1 className="num" aria-live="polite">
                {title}
              </h1>
              <p>{sub}</p>
            </div>
            <div className={styles.nav}>
              <IconButton label="Horario anterior" onClick={goPrev} disabled={index === 0}>
                <ChevronLeft />
              </IconButton>
              <IconButton
                label={waitingNext ? "Generando más horarios" : "Horario siguiente"}
                onClick={goNext}
                disabled={index >= sorted.length - 1 && gen.exhausted}
                aria-busy={waitingNext}
              >
                <ChevronRight />
              </IconButton>
            </div>
            <DownloadButton
              n={index + 1}
              input={{ items, availability: request.availability, range, summary: sub }}
            />
            <CopyButton codes={items.map((i) => i.section.code)} />
            <BatchControls gen={gen} className={styles.headBatch} />
          </div>

          <WeekGrid
            byDay={byDay}
            availability={request.availability}
            range={range}
            highlight={highlight}
            onPick={pick}
          />

          <section className={styles.secs} aria-labelledby="h-sec">
            <h2 id="h-sec">Secciones para inscribir</h2>
            <ul>
              {items.map((it) => (
                <li key={it.subject.id}>
                  <button
                    type="button"
                    className={styles.sec}
                    aria-pressed={highlight === it.subject.id}
                    onClick={() => pick(it.subject.id)}
                  >
                    <i className={`subject-${it.color}`} aria-hidden="true" />
                    <span>
                      <b>{it.subject.name}</b>
                      <small>
                        {it.section.docente}
                        {it.origin && <> · Sección de {it.origin}</>}
                      </small>
                    </span>
                    <code translate="no">{it.section.code}</code>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.agenda} aria-labelledby="h-agenda">
            <h2 id="h-agenda">Día por día</h2>
            {DAYS.filter((d) => byDay[d].length).map((d) => (
              <div key={d}>
                <h3>{DAY_NAMES[d]}</h3>
                <ul>
                  {byDay[d].map((b) => (
                    <li key={`${b.item.section.code}-${b.start}`}>
                      <span className="num">{formatRange(b.start, b.end)}</span>
                      <span>
                        <b>{b.item.subject.name}</b>
                        <small>
                          {b.item.section.docente}
                          {b.item.origin && <> · {b.item.origin}</>}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

/** «Generar 100 más», la barra de la tanda en curso y «Detener», o el final. */
function BatchControls({ gen, className }: { gen: GenerationState; className?: string }) {
  const pct = Math.floor(gen.fraction * 100);
  const announce = useBatchAnnouncement(gen);
  return (
    <div className={`${styles.batch} ${className ?? ""}`}>
      {gen.exhausted ? (
        <p className={styles.batchEnd}>No hay más combinaciones</p>
      ) : gen.running ? (
        <>
          <Progress value={gen.batchFound / BATCH_SIZE} label="Horarios de esta tanda" />
          <div className={styles.batchRow}>
            <span className="num">
              Generando… {gen.batchFound} de {BATCH_SIZE}
            </span>
            <Button size="small" onClick={cancelBatch}>
              Detener
            </Button>
          </div>
        </>
      ) : (
        <Button size="small" onClick={nextBatch}>
          Generar {BATCH_SIZE} más
        </Button>
      )}
      {!gen.exhausted && <small className="num">Recorrido el {pct} % de las combinaciones</small>}
      <span className="visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

/** Anuncia solo el inicio y el fin de cada tanda, no cada tick. */
function useBatchAnnouncement(gen: GenerationState): string {
  const [text, setText] = useState("");
  const prev = useRef({ running: gen.running, total: gen.schedules.length });
  useEffect(() => {
    const p = prev.current;
    if (p.running === gen.running) return;
    const msg = gen.running
      ? "Generando más horarios."
      : gen.exhausted
        ? `Búsqueda terminada: ${gen.schedules.length} horarios en total.`
        : `Listo: ${gen.schedules.length - p.total} horarios nuevos.`;
    prev.current = { running: gen.running, total: gen.schedules.length };
    const t = setTimeout(() => setText(msg), 0);
    return () => clearTimeout(t);
  }, [gen.running, gen.exhausted, gen.schedules.length]);
  return text;
}

function CopyButton({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: no se cambia el texto.
    }
  };
  return (
    <Button variant="primary" className={styles.copy} onClick={() => void copy()}>
      <span aria-live="polite">{copied ? "Secciones copiadas" : "Copiar secciones"}</span>
    </Button>
  );
}

function DownloadButton({ n, input }: { n: number; input: Parameters<typeof downloadSchedule>[0] }) {
  const [state, setState] = useState<"" | "busy" | "err">("");
  const download = async () => {
    setState("busy");
    try {
      await downloadSchedule(input, n);
      setState("");
    } catch {
      setState("err");
    }
  };
  return (
    <Button className={styles.download} onClick={() => void download()} disabled={state === "busy"}>
      <DownloadIcon />
      <span aria-live="polite">
        {state === "busy" ? "Preparando imagen…" : state === "err" ? "Reintentar descarga" : "Descargar horario"}
      </span>
    </Button>
  );
}
