// Utilidades solo para tests.
import { readFileSync } from "node:fs";
import { parseOffering } from "./parse";
import { DAYS, type Availability, type Offering, type Subject } from "./types";

const cache = new Map<string, Offering>();

export function loadFixture(name: "Horario.xlsx" | "Horario-full.xlsx"): Offering {
  let o = cache.get(name);
  if (!o) {
    const res = parseOffering(new Uint8Array(readFileSync(`public/${name}`)));
    if (!res.ok) throw new Error(`No se pudo leer ${name}: ${res.reason}`);
    o = res.offering;
    cache.set(name, o);
  }
  return o;
}

export function sameEveryDay(start: number, end: number, saturday = true): Availability {
  return Object.fromEntries(
    DAYS.map((d) => [d, { on: d !== "Sa" || saturday, start, end }]),
  ) as Availability;
}

export const INFORMATICA = "INGENIERÍA EN INFORMÁTICA";

/** Las 4 asignaturas diurnas de nivel 3 de Informática. */
export function nivel3Diurno(o: Offering): Subject[] {
  const ids = ["BDY1102|Diurno|presencial", "INU4100|Diurno|presencial", "RQY1102|Diurno|presencial", "DSY1103|Diurno|presencial"];
  return ids.map((id) => {
    const s = o.subjects.find((x) => x.id === id);
    if (!s) throw new Error(`Falta ${id}`);
    return s;
  });
}
