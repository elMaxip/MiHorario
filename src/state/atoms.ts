import { atom, type SetStateAction, type WritableAtom } from "jotai";
import type { SectionScope } from "@/domain/fit";
import type { Offering, Subject } from "@/domain/types";
import { clearPrefs, defaultPrefs, loadPrefs, savePrefs, type Prefs } from "./prefs";

/** La oferta leída del Excel. Vive solo en memoria (D2). */
export const offeringAtom = atom<Offering | null>(null);

const prefsBase = atom<Prefs>(loadPrefs());

/** Preferencias del usuario; cada cambio se guarda en localStorage. */
export const prefsAtom = atom(
  (get) => get(prefsBase),
  (get, set, update: SetStateAction<Prefs>) => {
    const next = typeof update === "function" ? update(get(prefsBase)) : update;
    set(prefsBase, next);
    savePrefs(next);
  },
);

/** Borra lo guardado y vuelve a los valores por defecto (manteniendo la carrera si solo hay una). */
export const resetPrefsAtom = atom(null, (get, set) => {
  clearPrefs();
  const offering = get(offeringAtom);
  const d = defaultPrefs();
  set(prefsBase, offering?.carreras.length === 1 ? { ...d, carrera: offering.carreras[0] } : d);
});

function field<K extends keyof Prefs>(key: K): WritableAtom<Prefs[K], [SetStateAction<Prefs[K]>], void> {
  return atom(
    (get) => get(prefsAtom)[key],
    (_get, set, update: SetStateAction<Prefs[K]>) =>
      set(prefsAtom, (p) => ({
        ...p,
        [key]: typeof update === "function" ? (update as (v: Prefs[K]) => Prefs[K])(p[key]) : update,
      })),
  );
}

export const availabilityAtom = field("availability");
export const chosenAtom = field("chosen");
export const carreraAtom = field("carrera");
export const filtersAtom = field("filters");
export const includeOtherCareersAtom = field("includeOtherCareers");
export const sortAtom = field("sort");

/** Alcance de secciones según la carrera (D1). */
export const scopeAtom = atom<SectionScope>((get) => {
  const offering = get(offeringAtom);
  const { carrera, includeOtherCareers } = get(prefsAtom);
  return {
    carrera: offering && offering.carreras.length > 1 ? carrera : null,
    includeOtherCareers,
  };
});

export const subjectMapAtom = atom((get) => {
  const offering = get(offeringAtom);
  return new Map<string, Subject>(offering ? offering.subjects.map((s) => [s.id, s]) : []);
});

/** Asignaturas elegidas que existen en la oferta, en el orden en que se eligieron. */
export const chosenSubjectsAtom = atom((get) => {
  const map = get(subjectMapAtom);
  return get(chosenAtom).flatMap((c) => {
    const s = map.get(c.id);
    return s ? [{ subject: s, color: c.color }] : [];
  });
});
