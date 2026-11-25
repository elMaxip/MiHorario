import { sectionsInScope, type SectionScope } from "./fit";
import type { Problem } from "./generate";
import type { Availability, Offering, Schedule, Section, Subject } from "./types";

/** Arma el problema de generación con las asignaturas pedidas y su alcance. */
export function buildProblem(
  subjects: readonly Subject[],
  scope: SectionScope,
  availability: Availability,
): Problem {
  return {
    availability,
    subjects: subjects.map((s) => ({
      subjectId: s.id,
      sections: sectionsInScope(s, scope).map((index) => ({
        index,
        code: s.sections[index].code,
        blocks: s.sections[index].blocks,
      })),
    })),
  };
}

export function subjectsById(offering: Offering): Map<string, Subject> {
  return new Map(offering.subjects.map((s) => [s.id, s]));
}

export interface Pick {
  subject: Subject;
  section: Section;
  /** Posición de la asignatura en la lista pedida: decide su color. */
  slot: number;
}

/** Reconstruye las secciones de un horario compacto. */
export function expandSchedule(subjects: readonly Subject[], schedule: Schedule): Pick[] {
  return schedule.picks.map((sectionIndex, slot) => ({
    subject: subjects[slot],
    section: subjects[slot].sections[sectionIndex],
    slot,
  }));
}
