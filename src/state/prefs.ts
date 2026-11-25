import { defaultAvailability, isAvailability } from "@/domain/availability";
import type { Availability, Offering } from "@/domain/types";

export const PREFS_KEY = "mihorario:prefs:v1";

export type SortKey = "orig" | "gap" | "days" | "end";
export const SORT_KEYS: readonly SortKey[] = ["orig", "gap", "days", "end"];

export interface Filters {
  q: string;
  nivel: string;
  jornada: string;
  /** "" = todas, "online" = online sincrónica. */
  modalidad: "" | "online";
}

export interface ChosenSubject {
  id: string;
  /** Índice de color, fijo desde que se elige (0 a 5). */
  color: number;
}

/** Lo que se guarda entre visitas. Nunca el archivo ni sus datos (D2). */
export interface Prefs {
  availability: Availability;
  chosen: ChosenSubject[];
  carrera: string | null;
  filters: Filters;
  includeOtherCareers: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = { q: "", nivel: "", jornada: "", modalidad: "" };

export function defaultPrefs(): Prefs {
  return {
    availability: defaultAvailability(),
    chosen: [],
    carrera: null,
    filters: EMPTY_FILTERS,
    includeOtherCareers: false,
    sort: "orig",
  };
}

const isString = (v: unknown): v is string => typeof v === "string";

/** Valida campo por campo: lo inválido vuelve a su valor por defecto. */
export function parsePrefs(raw: unknown): Prefs {
  const d = defaultPrefs();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;

  const chosen: ChosenSubject[] = [];
  if (Array.isArray(r.chosen)) {
    for (const c of r.chosen) {
      if (
        c &&
        typeof c === "object" &&
        isString((c as ChosenSubject).id) &&
        Number.isInteger((c as ChosenSubject).color) &&
        !chosen.some((x) => x.id === (c as ChosenSubject).id)
      ) {
        chosen.push({ id: (c as ChosenSubject).id, color: Math.abs((c as ChosenSubject).color) % 6 });
      }
    }
  }

  const f = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  const filters: Filters = {
    q: isString(f.q) ? f.q : "",
    nivel: isString(f.nivel) ? f.nivel : "",
    jornada: isString(f.jornada) ? f.jornada : "",
    modalidad: f.modalidad === "online" ? "online" : "",
  };

  return {
    availability: isAvailability(r.availability) ? r.availability : d.availability,
    chosen,
    carrera: isString(r.carrera) ? r.carrera : null,
    filters,
    includeOtherCareers: r.includeOtherCareers === true,
    sort: SORT_KEYS.includes(r.sort as SortKey) ? (r.sort as SortKey) : "orig",
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPrefs(): Prefs {
  try {
    const raw = storage()?.getItem(PREFS_KEY);
    return raw ? parsePrefs(JSON.parse(raw)) : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

export function hasSavedPrefs(): boolean {
  try {
    return !!storage()?.getItem(PREFS_KEY);
  } catch {
    return false;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    storage()?.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // Sin almacenamiento disponible: la sesión simplemente no se guarda.
  }
}

export function clearPrefs(): void {
  try {
    storage()?.removeItem(PREFS_KEY);
  } catch {
    // Ignorado a propósito.
  }
}

/**
 * Ajusta las preferencias a una oferta recién cargada: descarta ids que ya
 * no existen y la carrera si no está. Con una sola carrera, la fija.
 */
export function reconcilePrefs(p: Prefs, offering: Offering): Prefs {
  const ids = new Set(offering.subjects.map((s) => s.id));
  const carrera =
    offering.carreras.length === 1
      ? offering.carreras[0]
      : p.carrera && offering.carreras.includes(p.carrera)
        ? p.carrera
        : null;
  return { ...p, carrera, chosen: p.chosen.filter((c) => ids.has(c.id)) };
}

/** Primer color libre, para que no se reciclen colores en uso. */
export function nextColor(chosen: readonly ChosenSubject[]): number {
  const used = new Set(chosen.map((c) => c.color));
  for (let i = 0; i < 6; i++) if (!used.has(i)) return i;
  return chosen.length % 6;
}
