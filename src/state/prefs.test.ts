import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAvailability } from "@/domain/availability";
import { defaultPrefs, loadPrefs, nextColor, parsePrefs, PREFS_KEY, reconcilePrefs, savePrefs } from "./prefs";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
    removeItem: (k: string) => void delete data[k],
    data,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("prefs", () => {
  it("sin localStorage usa los valores por defecto", () => {
    expect(loadPrefs()).toEqual(defaultPrefs());
  });

  it("si localStorage lanza un error, se ignora", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("lleno");
      },
    });
    expect(loadPrefs()).toEqual(defaultPrefs());
    expect(() => savePrefs(defaultPrefs())).not.toThrow();
  });

  it("guarda y lee con clave versionada", () => {
    const s = fakeStorage();
    vi.stubGlobal("localStorage", s);
    const p = { ...defaultPrefs(), chosen: [{ id: "A|Diurno|presencial", color: 2 }], sort: "gap" as const };
    savePrefs(p);
    expect(Object.keys(s.data)).toEqual([PREFS_KEY]);
    expect(loadPrefs()).toEqual(p);
  });

  it("datos inválidos vuelven al valor por defecto campo por campo", () => {
    vi.stubGlobal("localStorage", fakeStorage({ [PREFS_KEY]: "{no es json" }));
    expect(loadPrefs()).toEqual(defaultPrefs());
    const p = parsePrefs({
      availability: { Lu: { on: true, start: 900, end: 800 } },
      chosen: [{ id: 3 }, { id: "x", color: 7 }, { id: "x", color: 1 }],
      carrera: 5,
      filters: { q: "base", modalidad: "otra" },
      includeOtherCareers: "sí",
      sort: "nada",
    });
    expect(p.availability).toEqual(defaultAvailability());
    expect(p.chosen).toEqual([{ id: "x", color: 1 }]);
    expect(p.carrera).toBeNull();
    expect(p.filters).toEqual({ q: "base", nivel: "", jornada: "", modalidad: "" });
    expect(p.includeOtherCareers).toBe(false);
    expect(p.sort).toBe("orig");
  });

  it("al cargar otra oferta ignora ids que no existen", () => {
    const offering = { carreras: ["A", "B"], subjects: [{ id: "keep" }] } as never;
    const p = reconcilePrefs(
      { ...defaultPrefs(), carrera: "Z", chosen: [{ id: "keep", color: 0 }, { id: "gone", color: 1 }] },
      offering,
    );
    expect(p.chosen).toEqual([{ id: "keep", color: 0 }]);
    expect(p.carrera).toBeNull();
  });

  it("asigna el primer color libre", () => {
    expect(nextColor([])).toBe(0);
    expect(nextColor([{ id: "a", color: 0 }, { id: "b", color: 2 }])).toBe(1);
  });
});
