export const DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa"] as const;
export type Day = (typeof DAYS)[number];

export const DAY_NAMES: Record<Day, string> = {
  Lu: "Lunes",
  Ma: "Martes",
  Mi: "Miércoles",
  Ju: "Jueves",
  Vi: "Viernes",
  Sa: "Sábado",
};

/** Minutos desde medianoche. */
export type Minutes = number;

export interface Block {
  day: Day;
  start: Minutes;
  end: Minutes;
}

export type Modalidad = "presencial" | "online";

export interface Section {
  /** Código de la sección, p. ej. «BDY1102-008D». */
  code: string;
  docente: string;
  /** Carreras en cuya oferta aparece esta sección (algunas son compartidas). */
  carreras: string[];
  /** Bloques ya fusionados y ordenados por día y hora. */
  blocks: Block[];
}

export interface Subject {
  /** `sigla|jornada|modalidad`: estable entre cargas del mismo archivo. */
  id: string;
  sigla: string;
  /** En minúscula de oración: «Base de datos aplicada II». */
  name: string;
  jornada: string;
  modalidad: Modalidad;
  /** Nivel de la asignatura en cada carrera que la ofrece. */
  niveles: Record<string, string>;
  sections: Section[];
}

export interface Offering {
  subjects: Subject[];
  /** Carreras del archivo, ordenadas alfabéticamente. */
  carreras: string[];
}

export interface DayRange {
  on: boolean;
  start: Minutes;
  end: Minutes;
}

export type Availability = Record<Day, DayRange>;

export interface ScheduleStats {
  /** Días con al menos una clase. */
  days: number;
  /** Minutos de ventanas (huecos de 15 min o más entre clases del mismo día). */
  gap: Minutes;
  /** Hora en que termina la última clase de la semana. */
  end: Minutes;
}

/**
 * Horario compacto: `picks[i]` es el índice, en `subject.sections`,
 * de la sección elegida para la i-ésima asignatura pedida.
 */
export interface Schedule {
  /** Posición en el orden de generación (0, 1, 2…). */
  n: number;
  picks: number[];
  stats: ScheduleStats;
}
