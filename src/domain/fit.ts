import type { Availability, Block, Subject } from "./types";

export function sectionFits(
  section: { readonly blocks: readonly Block[] },
  availability: Availability,
): boolean {
  return section.blocks.every((b) => {
    const r = availability[b.day];
    return r.on && b.start >= r.start && b.end <= r.end;
  });
}

/** Qué secciones se consideran según la carrera elegida (decisión D1). */
export interface SectionScope {
  /** `null` cuando el archivo tiene una sola carrera. */
  carrera: string | null;
  includeOtherCareers: boolean;
}

/** Índices (en `subject.sections`) de las secciones que entran en el alcance. */
export function sectionsInScope(subject: Subject, scope: SectionScope): number[] {
  const out: number[] = [];
  subject.sections.forEach((s, i) => {
    if (
      scope.carrera === null ||
      scope.includeOtherCareers ||
      s.carreras.includes(scope.carrera)
    ) {
      out.push(i);
    }
  });
  return out;
}

/** Índices de las secciones del alcance que caben en la disponibilidad. */
export function fittingSections(
  subject: Subject,
  scope: SectionScope,
  availability: Availability,
): number[] {
  return sectionsInScope(subject, scope).filter((i) =>
    sectionFits(subject.sections[i], availability),
  );
}

export interface FitCount {
  fit: number;
  total: number;
}

/** Para «{fit} de {total} secciones caben». */
export function countFitting(
  subject: Subject,
  scope: SectionScope,
  availability: Availability,
): FitCount {
  const idx = sectionsInScope(subject, scope);
  let fit = 0;
  for (const i of idx) if (sectionFits(subject.sections[i], availability)) fit++;
  return { fit, total: idx.length };
}
