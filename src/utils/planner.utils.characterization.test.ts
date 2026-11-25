// Tests de caracterización del código original (antes del rediseño).
// Fijan las cifras de referencia de docs/rediseno/PROMPT.md, sección 1.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { getData, processFileAndGenerateSchedules } from "./planner.utils";
import type { Day } from "../types/planner.types";

vi.stubGlobal("alert", () => {});
vi.spyOn(console, "log").mockImplementation(() => {});

const load = (name: string) =>
  getData(new Uint8Array(readFileSync(`public/${name}`)) as Uint8Array<ArrayBuffer>);

const DAYS: Day[] = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const same = (a: string, z: string) =>
  Object.fromEntries(DAYS.map((d) => [d, [a, z]])) as Record<Day, [string, string]>;

const NIVEL3 = [
  "BASE DE DATOS APLICADA II/3/Diurno/undefined",
  "INGLÉS ELEMENTAL II/3/Diurno/undefined",
  "INGENIERÍA DE SOFTWARE/3/Diurno/undefined",
  "DESARROLLO FULLSTACK I/3/Diurno/undefined",
];

describe("código original", () => {
  it("Horario.xlsx, 08:00–14:00: 10 horarios", () => {
    expect(processFileAndGenerateSchedules(load("Horario.xlsx"), same("08:00:00", "14:00:00"), new Set(NIVEL3))).toHaveLength(10);
  });
  it("Horario.xlsx, 08:00–19:00: 721 horarios", () => {
    expect(processFileAndGenerateSchedules(load("Horario.xlsx"), same("08:00:00", "19:00:00"), new Set(NIVEL3))).toHaveLength(721);
  });
  it("Horario.xlsx, disponibilidad por defecto del diseño: 29 horarios", () => {
    const hours = same("08:00:00", "14:00:00");
    hours.Ma = ["08:00:00", "17:00:00"];
    hours.Ju = ["08:00:00", "17:00:00"];
    hours.Sa = ["00:00:00", "00:00:00"];
    expect(processFileAndGenerateSchedules(load("Horario.xlsx"), hours, new Set(NIVEL3))).toHaveLength(29);
  });
  it("Horario-full.xlsx, 08:00–14:00: 12 horarios (mezcla carreras y siglas)", () => {
    expect(processFileAndGenerateSchedules(load("Horario-full.xlsx"), same("08:00:00", "14:00:00"), new Set(NIVEL3))).toHaveLength(12);
  });
  it("Horario-full.xlsx, 08:00–19:00: 2.437 horarios", () => {
    expect(processFileAndGenerateSchedules(load("Horario-full.xlsx"), same("08:00:00", "19:00:00"), new Set(NIVEL3))).toHaveLength(2437);
  }, 60000);
});
