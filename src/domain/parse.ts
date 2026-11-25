import { read, utils } from "xlsx";
import { mergeBlocks } from "./merge";
import { toSentenceCase } from "./text";
import { toMinutes } from "./time";
import { type Block, type Day, type Modalidad, type Offering, type Subject } from "./types";

export const REQUIRED_COLUMNS = [
  "Carrera",
  "Jornada",
  "Sigla Asignatura",
  "Nombre Asignatura",
  "Nivel",
  "Sección",
  "Horario",
  "Docente",
] as const;

export const MODALITY_COLUMN = "ASIGNATURA VIRTUAL SINCRONICA";

export type ParseError =
  | { ok: false; reason: "unreadable" }
  | { ok: false; reason: "missing-columns"; missing: string[] }
  | { ok: false; reason: "no-subjects" };

export type ParseResult = { ok: true; offering: Offering } | ParseError;

const HORARIO = /^\s*(Lu|Ma|Mi|Ju|Vi|Sa)\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/;

/** «Vi 8:01:00 - 9:20:00» → bloque. `null` si no tiene horario («0:00:00 - 0:00:00»). */
export function parseHorario(text: string): Block | null {
  const m = HORARIO.exec(text);
  if (!m) return null;
  const start = toMinutes(m[2]);
  const end = toMinutes(m[3]);
  if (!(end > start)) return null;
  return { day: m[1] as Day, start, end };
}

const cell = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

interface SectionDraft {
  code: string;
  docente: string;
  carreras: string[];
  blocks: Block[];
}

interface SubjectDraft {
  id: string;
  sigla: string;
  rawName: string;
  jornada: string;
  modalidad: Modalidad;
  niveles: Record<string, string>;
  sections: Map<string, SectionDraft>;
}

/**
 * Lee la primera hoja del Excel y la convierte en una oferta.
 * Una asignatura se identifica por sigla + jornada + modalidad (decisión D1);
 * las secciones compartidas entre carreras aparecen una vez, con todas sus carreras.
 */
export function parseOffering(data: ArrayBuffer | Uint8Array): ParseResult {
  let rows: unknown[][];
  try {
    const wb = read(data, { type: "array", dense: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, reason: "unreadable" };
    rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false });
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const header = (rows[0] ?? []).map(cell);
  const col = (name: string) => header.indexOf(name);
  const missing = REQUIRED_COLUMNS.filter((c) => col(c) < 0);
  if (missing.length) return { ok: false, reason: "missing-columns", missing };

  const ix = Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, col(c)])) as Record<
    (typeof REQUIRED_COLUMNS)[number],
    number
  >;
  const modCol = col(MODALITY_COLUMN);

  const subjects = new Map<string, SubjectDraft>();
  const carreras = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const block = parseHorario(cell(row[ix.Horario]));
    if (!block) continue;
    const sigla = cell(row[ix["Sigla Asignatura"]]);
    const code = cell(row[ix["Sección"]]);
    if (!sigla || !code) continue;

    const carrera = cell(row[ix.Carrera]);
    const jornada = cell(row[ix.Jornada]);
    const modalidad: Modalidad = modCol >= 0 && cell(row[modCol]) ? "online" : "presencial";
    const id = `${sigla}|${jornada}|${modalidad}`;
    carreras.add(carrera);

    let subject = subjects.get(id);
    if (!subject) {
      subject = {
        id,
        sigla,
        rawName: cell(row[ix["Nombre Asignatura"]]),
        jornada,
        modalidad,
        niveles: {},
        sections: new Map(),
      };
      subjects.set(id, subject);
    }
    subject.niveles[carrera] ??= cell(row[ix.Nivel]);

    let section = subject.sections.get(code);
    if (!section) {
      section = { code, docente: cell(row[ix.Docente]), carreras: [], blocks: [] };
      subject.sections.set(code, section);
    }
    if (!section.carreras.includes(carrera)) section.carreras.push(carrera);
    section.blocks.push(block);
  }

  if (subjects.size === 0) return { ok: false, reason: "no-subjects" };

  const list: Subject[] = [...subjects.values()].map((s) => ({
    id: s.id,
    sigla: s.sigla,
    name: toSentenceCase(s.rawName),
    jornada: s.jornada,
    modalidad: s.modalidad,
    niveles: s.niveles,
    sections: [...s.sections.values()].map((sec) => ({
      ...sec,
      blocks: mergeBlocks(sec.blocks),
    })),
  }));

  return {
    ok: true,
    offering: {
      subjects: list,
      carreras: [...carreras].sort((a, b) => a.localeCompare(b, "es")),
    },
  };
}
