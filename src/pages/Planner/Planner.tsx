import { useEffect, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { fileAtom, schedulesAtom } from "../../App";
import type { Day, ProcessedSubject, Subject } from "../../types/planner.types";
import {
  getData,
  processFileAndGenerateSchedules,
} from "../../utils/planner.utils";
import styles from "./Planner.module.css";
import TimePickerLabel from "../../components/TimePickerLabel/TimePickerLabel";
import Button from "../../components/Button/Button";
import * as XLSX from "xlsx";
import SubjectChoise from "../../components/SubjectChoise/SubjectChoice";
import { useNavigate } from "react-router-dom";

export const DAYS: { id: Day; label: string }[] = [
  { id: "Lu", label: "Lunes" },
  { id: "Ma", label: "Martes" },
  { id: "Mi", label: "Miércoles" },
  { id: "Ju", label: "Jueves" },
  { id: "Vi", label: "Viernes" },
  { id: "Sa", label: "Sábado" },
];

const Planner = () => {
  const navigate = useNavigate();
  const [file, _] = useAtom(fileAtom);
  const setGeneratedSchedules = useSetAtom(schedulesAtom);
  const [processedSubjects, setProcessedSubjects] = useState<
    ProcessedSubject[] | null
  >(null);
  const [chosenSubjects, setChoosenSubjects] = useState<Set<string>>(new Set());

  const [hours, setHours] = useState<Record<Day, [string, string]>>({
    Lu: ["08:00:00", "14:00:00"],
    Ma: ["08:00:00", "14:00:00"],
    Mi: ["08:00:00", "14:00:00"],
    Ju: ["08:00:00", "14:00:00"],
    Vi: ["08:00:00", "14:00:00"],
    Sa: ["08:00:00", "14:00:00"],
  });

  const handleTimePicker = (day: Day, type: "min" | "max", value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: type === "min" ? [value, prev[day][1]] : [prev[day][0], value],
    }));
  };

  const processData = () => {
    const reader = new FileReader();
    const finalFile = file || new File([""], "testfile.xlsx");
    reader.onload = (event) => {
      if (!event.target) return;
      const result = new Uint8Array(event.target.result as ArrayBuffer);
      const data = getData(result);
      setProcessedSubjects(data);
    };

    reader.readAsArrayBuffer(finalFile);
  };

  const processDataForDev = async () => {
    try {
      const response = await fetch("/Horario-full.xlsx");
      const arrayBuffer = await response.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer);

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawData = XLSX.utils.sheet_to_json(worksheet) as Subject[];

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

      setProcessedSubjects(processedData);
    } catch (error) {
      console.error("Error", error);
    }
  };

  const createSchedules = () => {
    if (
      !processedSubjects ||
      processedSubjects.length == 0 ||
      chosenSubjects.size == 0
    )
      return;
    const generated = processFileAndGenerateSchedules(
      processedSubjects,
      hours,
      chosenSubjects,
    );

    if (generated.length > 0) {
      setGeneratedSchedules(generated);
      navigate("/calendar");
    }
  };

  useEffect(() => {
    if (import.meta.env.VITE_MODE === "dev") {
      processDataForDev();
    } else {
      processData();
    }
  }, []);

  useEffect(() => {
    if (processedSubjects && processedSubjects.length == 0) {
      console.log(processedSubjects);
      alert("El archivo no tiene ninguna asignatura");
      navigate("/");
    }
  }, [processedSubjects]);

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <span className={styles.step}>PASO 2 DE 2</span>
        <h1 className={styles.title}>Define tus parámetros</h1>
        <span className={styles.description}>
          Personaliza los rangos de tiempo en los que prefieres asistir a
          clases. El sistema optimizará tu horario respetando estos límites.
        </span>
      </div>

      <div className={styles.detailsContainer}>
        <details open className={styles.availability}>
          <summary>
            Disponibilidad{" "}
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 7.4L0 1.4L1.4 0L6 4.6L10.6 0L12 1.4L6 7.4Z"
                fill="#837560"
              />
            </svg>
          </summary>
          <div className={styles.inputs}>
            {DAYS.map((day) => (
              <TimePickerLabel
                key={day.id}
                dayId={day.id}
                day={day.label}
                valueMin={hours[day.id][0]}
                valueMax={hours[day.id][1]}
                onChange={handleTimePicker}
              />
            ))}
          </div>
        </details>

        <details className={styles.subjects}>
          <summary>
            Asignaturas{" "}
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 7.4L0 1.4L1.4 0L6 4.6L10.6 0L12 1.4L6 7.4Z"
                fill="#837560"
              />
            </svg>
          </summary>

          <SubjectChoise
            subjects={processedSubjects || []}
            chosenSubjects={chosenSubjects}
            setChoosenSubjects={setChoosenSubjects}
          />
        </details>
      </div>

      <Button onClick={createSchedules}>Crear y visualizar horarios</Button>
    </main>
  );
};

export default Planner;
