import { describe, expect, it } from "vitest";
import { countFitting, sectionFits, sectionsInScope } from "./fit";
import { generateAll, prepareSearch, ScheduleSearch } from "./generate";
import { mergeBlocks } from "./merge";
import { applyNeed, nearestSection } from "./nearest";
import { parseHorario, parseOffering } from "./parse";
import { buildProblem } from "./problem";
import { defaultAvailability } from "./availability";
import { computeStats } from "./stats";
import { INFORMATICA, loadFixture, nivel3Diurno, sameEveryDay } from "./testing";
import { formatDuration, formatHM, toMinutes } from "./time";
import { joinList, plain, toSentenceCase } from "./text";
import type { Availability, Block } from "./types";
import { utils, write } from "xlsx";

const ONLY_INFO = { carrera: INFORMATICA, includeOtherCareers: false };
const ALL = { carrera: null, includeOtherCareers: false };

describe("time", () => {
  it("convierte y formatea", () => {
    expect(toMinutes("9:31:00")).toBe(571);
    expect(toMinutes("09:31")).toBe(571);
    expect(toMinutes("x")).toBeNaN();
    expect(formatHM(571)).toBe("09:31");
    expect(formatDuration(152)).toBe("2 h 32 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("text", () => {
  it("minúscula de oración con romanos intactos", () => {
    expect(toSentenceCase("BASE DE DATOS APLICADA II")).toBe("Base de datos aplicada II");
    expect(toSentenceCase("DESARROLLO FULLSTACK I")).toBe("Desarrollo fullstack I");
    expect(toSentenceCase("DIAGRAMACIÓN Y DISEÑO PROCESOS I (UML)")).toBe("Diagramación y diseño procesos I (UML)");
    expect(toSentenceCase("¿ES POSIBLE CREER HOY?")).toBe("¿Es posible creer hoy?");
    expect(toSentenceCase("VÍA EXPRESA")).toBe("Vía expresa");
  });
  it("busca sin tildes", () => {
    expect(plain("Inglés ELEMENTAL")).toBe("ingles elemental");
  });
  it("une listas", () => {
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b"])).toBe("a y b");
    expect(joinList(["a", "b", "c"])).toBe("a, b y c");
  });
});

describe("parse", () => {
  it("lee el horario de una fila", () => {
    expect(parseHorario("Vi 8:01:00 - 9:20:00")).toEqual({ day: "Vi", start: 481, end: 560 });
    expect(parseHorario("0:00:00 - 0:00:00")).toBeNull();
  });

  it("Horario.xlsx: una carrera, 4 asignaturas diurnas", () => {
    const o = loadFixture("Horario.xlsx");
    expect(o.carreras).toEqual([INFORMATICA]);
    const subjects = nivel3Diurno(o);
    expect(subjects.map((s) => s.name)).toEqual([
      "Base de datos aplicada II",
      "Inglés elemental II",
      "Ingeniería de software",
      "Desarrollo fullstack I",
    ]);
    expect(subjects[0].niveles[INFORMATICA]).toBe("3");
    for (const s of subjects) for (const sec of s.sections) expect(sec.blocks.length).toBeGreaterThan(0);
    const bdy = subjects[0].sections.find((s) => s.code === "BDY1102-008D")!;
    // Ju 9:31–10:50 y 11:01–11:40 se fusionan (11 min de separación).
    expect(bdy.blocks).toEqual([
      { day: "Ju", start: 571, end: 700 },
      { day: "Vi", start: 571, end: 650 },
    ]);
  });

  it("Horario-full.xlsx: varias carreras, siglas separadas, secciones compartidas una vez", () => {
    const o = loadFixture("Horario-full.xlsx");
    expect(o.carreras.length).toBeGreaterThan(30);
    const ids = new Set(o.subjects.map((s) => s.id));
    expect(ids.has("INU4100|Diurno|presencial")).toBe(true);
    expect(ids.has("INU4101|Diurno|presencial")).toBe(true);
    expect(ids.has("INU4100|Vespertino|online")).toBe(true);
    const gmp = o.subjects.find((s) => s.sigla === "GMP0101" && s.jornada === "Diurno")!;
    const codes = gmp.sections.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    const shared = gmp.sections.find((s) => s.code === "GMP0101-003D")!;
    expect(shared.carreras).toContain(INFORMATICA);
    expect(shared.carreras.length).toBeGreaterThan(5);
    // Las filas duplicadas no duplican bloques.
    expect(shared.blocks).toEqual([
      { day: "Ma", start: 521, end: 610 },
      { day: "Ju", start: 791, end: 880 },
    ]);
  });

  it("devuelve errores tipados", () => {
    const sheet = utils.aoa_to_sheet([["Carrera", "Nombre Asignatura"], ["X", "Y"]]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, sheet, "Hoja1");
    const buf = write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const res = parseOffering(buf);
    expect(res).toMatchObject({ ok: false, reason: "missing-columns" });
    if (!res.ok && res.reason === "missing-columns") {
      expect(res.missing).toContain("Sigla Asignatura");
      expect(res.missing).not.toContain("Carrera");
    }

    const empty = utils.aoa_to_sheet([
      ["Carrera", "Jornada", "Sigla Asignatura", "Nombre Asignatura", "Nivel", "Sección", "Horario", "Docente"],
      ["X", "Diurno", "AAA1", "A", 1, "AAA1-001D", "0:00:00 - 0:00:00", "D"],
    ]);
    const wb2 = utils.book_new();
    utils.book_append_sheet(wb2, empty, "Hoja1");
    expect(parseOffering(write(wb2, { type: "array", bookType: "xlsx" }) as ArrayBuffer)).toEqual({
      ok: false,
      reason: "no-subjects",
    });
    expect(parseOffering(new Uint8Array([1, 2, 3]))).toMatchObject({ ok: false });
  });
});

describe("merge", () => {
  it("fusiona bloques a menos de 15 min y solapados, por día", () => {
    const b = (day: Block["day"], start: number, end: number): Block => ({ day, start, end });
    expect(
      mergeBlocks([b("Ju", 661, 700), b("Lu", 600, 650), b("Ju", 571, 650), b("Ju", 571, 650), b("Ju", 716, 750)]),
    ).toEqual([b("Lu", 600, 650), b("Ju", 571, 700), b("Ju", 716, 750)]);
  });
});

describe("fit", () => {
  it("cuenta las secciones que caben", () => {
    const [bdy] = nivel3Diurno(loadFixture("Horario.xlsx"));
    expect(countFitting(bdy, ALL, sameEveryDay(480, 1350))).toEqual({ fit: 8, total: 8 });
    expect(countFitting(bdy, ALL, sameEveryDay(480, 840)).fit).toBeLessThan(8);
    const off = sameEveryDay(480, 1350);
    off.Lu = { ...off.Lu, on: false };
    expect(sectionFits({ blocks: [{ day: "Lu", start: 500, end: 560 }] }, off)).toBe(false);
  });

  it("filtra por carrera y suma otras con la casilla (D1)", () => {
    const o = loadFixture("Horario-full.xlsx");
    const inu = o.subjects.find((s) => s.id === "INU4100|Diurno|presencial")!;
    const own = sectionsInScope(inu, ONLY_INFO);
    const all = sectionsInScope(inu, { carrera: INFORMATICA, includeOtherCareers: true });
    expect(own.length).toBeLessThan(all.length);
    expect(all.length).toBe(inu.sections.length);
  });
});

describe("stats", () => {
  it("días, ventanas de 15 min o más y salida", () => {
    expect(
      computeStats([
        { day: "Lu", start: 480, end: 560 },
        { day: "Lu", start: 570, end: 600 }, // 10 min: no es ventana
        { day: "Lu", start: 700, end: 760 }, // 100 min
        { day: "Mi", start: 600, end: 900 },
      ]),
    ).toEqual({ days: 2, gap: 100, end: 900 });
    expect(computeStats([])).toEqual({ days: 0, gap: 0, end: 0 });
  });
});

describe("nearest", () => {
  it("sugiere la sección que pide ampliar menos y al aplicarla cabe", () => {
    const [bdy] = nivel3Diurno(loadFixture("Horario.xlsx"));
    const avail = sameEveryDay(480, 600);
    const all = bdy.sections.map((_, i) => i);
    expect(countFitting(bdy, ALL, avail).fit).toBe(0);
    const near = nearestSection(bdy, all, avail)!;
    expect(near).not.toBeNull();
    for (const r of Object.values(near.need)) {
      expect(r!.start % 30).toBe(0);
      expect(r!.end % 30).toBe(0);
    }
    expect(sectionFits(bdy.sections[near.sectionIndex], applyNeed(avail, near))).toBe(true);
  });

  it("prefiere ampliar un día activo antes que activar uno apagado", () => {
    const avail: Availability = sameEveryDay(480, 600);
    avail.Ju = { on: false, start: 480, end: 600 };
    const subject = {
      id: "x", sigla: "X", name: "X", jornada: "Diurno", modalidad: "presencial" as const, niveles: {},
      sections: [
        { code: "A", docente: "", carreras: [], blocks: [{ day: "Ju" as const, start: 481, end: 560 }] },
        { code: "B", docente: "", carreras: [], blocks: [{ day: "Lu" as const, start: 481, end: 640 }] },
      ],
    };
    expect(nearestSection(subject, [0, 1], avail)!.code).toBe("B");
  });
});

const count = (file: "Horario.xlsx" | "Horario-full.xlsx", avail: Availability, scope = ONLY_INFO) => {
  const res = generateAll(buildProblem(nivel3Diurno(loadFixture(file)), scope, avail));
  if (!res.ok) throw new Error(res.reason);
  return res.schedules.length;
};

describe("generate: cifras de referencia", () => {
  it("Horario.xlsx 08:00–14:00 → 10", () => expect(count("Horario.xlsx", sameEveryDay(480, 840))).toBe(10));
  it("Horario.xlsx 08:00–19:00 → 721", () => expect(count("Horario.xlsx", sameEveryDay(480, 1140))).toBe(721));
  it("Horario.xlsx, disponibilidad por defecto → 29", () =>
    expect(count("Horario.xlsx", defaultAvailability())).toBe(29));
  it("Horario-full.xlsx 08:00–14:00, solo Informática (D1) → 10", () =>
    expect(count("Horario-full.xlsx", sameEveryDay(480, 840))).toBe(10));
  it("Horario-full.xlsx con otras carreras da más combinaciones", () =>
    expect(
      count("Horario-full.xlsx", sameEveryDay(480, 840), { carrera: INFORMATICA, includeOtherCareers: true }),
    ).toBeGreaterThan(10));

  it("los horarios no tienen topes y respetan la disponibilidad", () => {
    const subjects = nivel3Diurno(loadFixture("Horario.xlsx"));
    const avail = defaultAvailability();
    const res = generateAll(buildProblem(subjects, ALL, avail));
    if (!res.ok) throw new Error();
    for (const s of res.schedules) {
      const blocks = s.picks.flatMap((p, i) => subjects[i].sections[p].blocks);
      expect(sectionFits({ blocks }, avail)).toBe(true);
      for (let i = 0; i < blocks.length; i++)
        for (let j = i + 1; j < blocks.length; j++) {
          const a = blocks[i], b = blocks[j];
          expect(a.day === b.day && a.start < b.end && a.end > b.start).toBe(false);
        }
    }
    expect(new Set(res.schedules.map((s) => s.picks.join())).size).toBe(res.schedules.length);
  });
});

describe("generate: errores como datos", () => {
  it("sin asignaturas", () => {
    expect(prepareSearch({ subjects: [], availability: sameEveryDay(480, 840) })).toEqual({
      ok: false,
      reason: "no-subjects",
    });
  });

  it("una asignatura sin secciones válidas devuelve cuál es (bug de foundSet)", () => {
    // Sección con una fila que cabe y otra que no: no debe contar como encontrada.
    const subjects = nivel3Diurno(loadFixture("Horario.xlsx"));
    const avail = sameEveryDay(480, 1350);
    avail.Ju = { ...avail.Ju, end: 600 };
    avail.Vi = { ...avail.Vi, on: false };
    avail.Mi = { ...avail.Mi, on: false };
    avail.Ma = { ...avail.Ma, on: false };
    avail.Lu = { ...avail.Lu, on: false };
    const res = prepareSearch(buildProblem(subjects, ALL, avail));
    expect(res.ok).toBe(false);
    if (!res.ok && res.reason === "subject-does-not-fit") {
      expect(res.subjectIds).toContain("BDY1102|Diurno|presencial");
      expect(res.nearest[0]).not.toBeNull();
    }
  });

  it("todo cabe pero choca: cero horarios, agotado", () => {
    const res = generateAll({
      availability: sameEveryDay(480, 1350),
      subjects: ["A", "B"].map((id) => ({
        subjectId: id,
        sections: [{ index: 0, code: id, blocks: [{ day: "Lu" as const, start: 500, end: 600 }] }],
      })),
    });
    expect(res).toEqual({ ok: true, schedules: [] });
  });
});

describe("generate: por tandas", () => {
  const prep = () => {
    const res = prepareSearch(buildProblem(nivel3Diurno(loadFixture("Horario.xlsx")), ALL, sameEveryDay(480, 1140)));
    if (!res.ok) throw new Error();
    return res.search;
  };
  const key = (s: { picks: number[] }) => s.picks.join(",");

  it("concatenar tandas de 100 = generar todo, en el mismo orden (721: 8 tandas, la última de 21)", () => {
    const all = prep().run(Infinity).schedules.map(key);
    const search = prep();
    const sizes: number[] = [];
    const got: string[] = [];
    let exhausted = false;
    while (!exhausted) {
      const r = search.run(100);
      sizes.push(r.schedules.length);
      got.push(...r.schedules.map(key));
      exhausted = r.exhausted;
    }
    expect(all).toHaveLength(721);
    expect(got).toEqual(all);
    expect(sizes).toEqual([100, 100, 100, 100, 100, 100, 100, 21]);
  });

  it("cortar por pasos (cancel) y seguir no pierde ni repite horarios", () => {
    const all = prep().run(Infinity).schedules.map(key);
    const search = prep();
    const got: string[] = [];
    while (!search.exhausted) {
      // tandas de 100 interrumpidas cada 7 pasos, como un `cancel` seguido de `next`
      got.push(...search.run(100, 7).schedules.map(key));
    }
    expect(got).toEqual(all);
    expect(search.foundCount).toBe(721);
  });

  it("el progreso es monótono y termina en 1", () => {
    const search = prep();
    let last = 0;
    expect(search.progress).toBe(0);
    while (!search.exhausted) {
      search.run(Infinity, 3);
      const p = search.progress;
      expect(p).toBeGreaterThanOrEqual(last - 1e-12);
      expect(p).toBeLessThanOrEqual(1);
      last = p;
    }
    expect(search.progress).toBe(1);
  });

  it("numera los horarios en orden de generación y calcula stats", () => {
    const s = prep().run(3).schedules;
    expect(s.map((x) => x.n)).toEqual([0, 1, 2]);
    expect(s[0].stats.days).toBeGreaterThan(0);
  });

  it("ordena las asignaturas de menos a más secciones (ScheduleSearch acepta niveles vacíos)", () => {
    const search = new ScheduleSearch([[{ index: 0, code: "A", blocks: [] }], []]);
    expect(search.run(10)).toEqual({ schedules: [], exhausted: true });
  });
});
