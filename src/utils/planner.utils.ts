import * as XLSX from "xlsx";
import type {
  Day,
  ProcessedSubject,
  Schedule,
  Subject,
} from "../types/planner.types";

export const getData = (data: Uint8Array<ArrayBuffer>) => {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet) as Subject[];

  const processedData = rawData.reduce((acc, subject) => {
    const [day, startTime, , endTime] = subject.Horario.split(" ");
    if (day == "0:00:00") return acc;

    const processedSubject = {
      ...subject,
      Horario: {
        day: day as Day,
        start: startTime,
        end: endTime,
      },
    };

    acc.push(processedSubject);
    return acc;
  }, [] as ProcessedSubject[]);
  return processedData;
};

export const timeToSeconds = (time: string) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

function secondsToTime(time: number) {
  const horas = Math.floor(time / 3600);
  const minutos = Math.floor((time % 3600) / 60);
  const segundos = Math.floor(time % 60);

  return [horas, minutos, segundos]
    .map((v) => v.toString().padStart(2, "0"))
    .join(":");
}

export const checkTime = (
  processedSubject: ProcessedSubject,
  day: string,
  hours: Record<Day, [string, string]>,
) => {
  const minTime = timeToSeconds(processedSubject.Horario.start as string);
  const maxTime = timeToSeconds(processedSubject.Horario.end as string);

  if (
    minTime < timeToSeconds(hours[day as Day][0]) ||
    maxTime > timeToSeconds(hours[day as Day][1])
  )
    return false;
  return true;
};

export const checkSchedule = (
  actualSchedule: Schedule,
  blocks: ProcessedSubject[],
) => {
  for (const block of blocks) {
    const day = block.Horario.day;
    const actualSubjects = actualSchedule[day] || [];

    const blockMin = timeToSeconds(block.Horario.start as string);
    const blockMax = timeToSeconds(block.Horario.end as string);

    for (const subject of actualSubjects) {
      const startTime = subject.Horario.start;
      const endTime = subject.Horario.end;

      const overlap =
        blockMin < timeToSeconds(endTime as string) &&
        blockMax > timeToSeconds(startTime as string);

      if (overlap) {
        return true;
      }
    }
  }

  return false;
};

export const createSchedule = (
  validSubjects: Map<string, Map<string, ProcessedSubject[]>>,
) => {
  const subjectNames = Array.from(validSubjects.keys());
  const schedules: Schedule[] = [];

  function backtrack(index: number, actualSchedule: Schedule) {
    if (index === subjectNames.length) {
      schedules.push(structuredClone(actualSchedule));
      return;
    }

    const subjectName = subjectNames[index];
    const sections = validSubjects.get(subjectName)!;

    for (const [_, blocks] of sections) {
      const overlap = checkSchedule(actualSchedule, blocks);
      if (!overlap) {
        const nextSchedule: Schedule = structuredClone(actualSchedule);

        blocks.forEach((block) => {
          const day = block.Horario.day;
          nextSchedule[day] = [...(nextSchedule[day] || []), block];
        });

        backtrack(index + 1, nextSchedule);
      }
    }
  }

  backtrack(0, {});
  return schedules;
};

export const processFileAndGenerateSchedules = (
  fileData: Uint8Array<ArrayBuffer>,
  hours: Record<Day, [string, string]>,
  choosenSet: Set<string>,
  data?: ProcessedSubject[],
): Schedule[] => {
  const processedSubjects = data || getData(fileData);

  const excludedSet: Set<string> = new Set();
  const foundSet: Set<string> = new Set();

  const validSubjects = processedSubjects.reduce((acc, subject) => {
    const subjectName = subject["Nombre Asignatura"];
    const id = `${subjectName}/${subject.Nivel}/${subject.Jornada}/${subject["ASIGNATURA VIRTUAL SINCRONICA"]}`;
    if (!choosenSet.has(id)) return acc;

    const section = subject.Sección;
    if (excludedSet.has(section)) return acc;

    const day = subject.Horario.day;
    if (!hours[day]) {
      if (acc.get(subjectName)?.delete(section)) return acc;
    }

    const isHourValid = checkTime(subject, day, hours);
    if (!isHourValid) {
      excludedSet.add(section);
      acc.get(subjectName)?.delete(section);
      return acc;
    }

    /* 
      [subjectName: string]: {
        [section: string]: ProcessedSubject[];
      };
    */

    if (!acc.has(subjectName))
      acc.set(subjectName, new Map<string, ProcessedSubject[]>());

    const sections = acc.get(subjectName)!;
    if (!sections.has(section)) sections.set(section, []);

    const blocks = sections.get(section)!;
    mergeBlocks(blocks, subject);

    foundSet.add(id);

    return acc;
  }, new Map<string, Map<string, ProcessedSubject[]>>());

  console.log(validSubjects);

  const allSubjectsAreIncluded = [...choosenSet].every((subject) =>
    foundSet.has(subject),
  );

  if (!allSubjectsAreIncluded) {
    alert(
      "Ningún horario ha establecido todas las asignaturas escogidas, intenta cambiar las horas o modificar las asignaturas. Asignaturas encontradas: " +
        Array.from(foundSet.values()),
    );
    return [];
  }

  const generated = createSchedule(validSubjects);

  if (generated.length === 0) {
    alert(
      "No se ha podido crear ningún horario válido que respete esas horas, intenta cambiarlas.",
    );
    return [];
  }

  return generated;
};

function mergeBlocks(
  blocks: ProcessedSubject[],
  subject: ProcessedSubject,
): ProcessedSubject[] {
  const threshold = 15 * 60; // 15 minutos en segundos

  let merged = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (block.Horario.day != subject.Horario.day) continue;

    const subjectStart = timeToSeconds(subject.Horario.start as string);
    const subjectEnd = timeToSeconds(subject.Horario.end as string);
    const blockStart = timeToSeconds(block.Horario.start as string);
    const blockEnd = timeToSeconds(block.Horario.end as string);

    const isClose =
      Math.abs(subjectStart - blockEnd) < threshold ||
      Math.abs(subjectEnd - blockStart) < threshold ||
      (subjectStart >= blockStart && subjectStart <= blockEnd);

    if (isClose) {
      // Merge real: expandir el bloque
      blocks[i] = {
        ...block,
        Horario: {
          start: secondsToTime(Math.min(subjectStart, blockStart)),
          end: secondsToTime(Math.max(subjectEnd, blockEnd)),
          day: subject.Horario.day,
        },
      };

      merged = true;
      break;
    }
  }

  if (!merged) {
    blocks.push(subject);
  }

  return blocks;
}
