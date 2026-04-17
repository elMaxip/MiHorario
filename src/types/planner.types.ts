export type Day = "Lu" | "Ma" | "Mi" | "Ju" | "Vi";

export interface Time {
  day: Day;
  start: string | number;
  end: string | number;
}

export interface Subject {
  Carrera: string;
  Docente: string;
  Horario: string;
  Jornada: string;
  Nivel: string;
  "Nombre Asignatura": string;
  Plan: number;
  Sección: string;
  Sede: string;
  "Sigla Asignatura": string;
  "ASIGNATURA VIRTUAL SINCRONICA": string;
}

export interface ProcessedSubject {
  Carrera: string;
  Docente: string;
  Horario: Time;
  Jornada: string;
  Nivel: string;
  "Nombre Asignatura": string;
  Plan: number;
  Sección: string;
  Sede: string;
  "Sigla Asignatura": string;
  "ASIGNATURA VIRTUAL SINCRONICA": string;
}

export interface ValidSubjects {
  [subjectName: string]: {
    [section: string]: ProcessedSubject[];
  };
}

export interface Schedule {
  [day: string]: ProcessedSubject[];
}
