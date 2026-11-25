import { DAY_NAMES, type Day, type DayRange, type Subject } from "@/domain/types";
import { formatHM } from "@/domain/time";
import { joinList } from "@/domain/text";
import type { NearestFit } from "@/domain/nearest";

export function nivelOf(subject: Subject, carrera: string | null): string {
  if (carrera && subject.niveles[carrera]) return subject.niveles[carrera];
  return Object.values(subject.niveles)[0] ?? "";
}

/** «diurna», «vespertina online»: para «Ya elegiste la versión …». */
export function versionLabel(s: Subject): string {
  const j = s.jornada
    .toLocaleLowerCase("es")
    .replace(/diurno/g, "diurna")
    .replace(/vespertino/g, "vespertina");
  return s.modalidad === "online" ? `${j} online` : j;
}

const modalidadSuffix = (s: Subject) => (s.modalidad === "online" ? ", online sincrónica" : "");

/** «Nivel 3, diurno» o «Vespertino. Ya elegiste la versión diurna». */
export function subjectMeta(s: Subject, carrera: string | null, mate: Subject | null): string {
  if (mate) return `${s.jornada}${modalidadSuffix(s)}. Ya elegiste la versión ${versionLabel(mate)}`;
  const nivel = nivelOf(s, carrera);
  const head = /^\d+$/.test(nivel) ? `Nivel ${nivel}` : nivel || "Sin nivel";
  return `${head}, ${s.jornada.toLocaleLowerCase("es")}${modalidadSuffix(s)}`;
}

/** «Ninguna sección cabe. La más cercana, X, pide jueves de 08:00 a 15:30 y viernes de …». */
export function nearestTip(fit: NearestFit): string {
  const days = (Object.entries(fit.need) as [Day, DayRange][]).map(
    ([d, r]) => `${DAY_NAMES[d].toLocaleLowerCase("es")} de ${formatHM(r.start)} a ${formatHM(r.end)}`,
  );
  return `Ninguna sección cabe. La más cercana, ${fit.code}, pide ${joinList(days)}.`;
}

/** Orden natural de niveles: 1, 2, …, 10 y luego texto (Optativo). */
export function compareNivel(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  const ia = Number.isFinite(na) && a !== "";
  const ib = Number.isFinite(nb) && b !== "";
  if (ia && ib) return na - nb;
  if (ia) return -1;
  if (ib) return 1;
  return a.localeCompare(b, "es");
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
