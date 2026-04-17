import { useState } from "react";
import styles from "./SubjectChoise.module.css";
import type { ProcessedSubject } from "../../types/planner.types";
import FilteredSubject from "../FilteredSubject/FilteredSubject";

interface Props {
  subjects: ProcessedSubject[];
  chosenSubjects: Set<string>;
  setChoosenSubjects: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface InputProp {
  key: keyof ProcessedSubject;
  label: string;
}

interface FilterProp {
  Carrera: string;
  Nivel: string;
  Jornada: string;
  "ASIGNATURA VIRTUAL SINCRONICA": string;
}

export interface FilteredSubjectProp {
  nombre: string;
  nivel: string;
  jornada: string;
  virtual: string;
}

const SubjectChoise = ({
  subjects,
  chosenSubjects,
  setChoosenSubjects,
}: Props) => {
  const inputs: InputProp[] = [
    { key: "Carrera", label: "Carrera" },
    { key: "Nivel", label: "Semestre/Nivel" },
    { key: "Jornada", label: "Jornada" },
    { key: "ASIGNATURA VIRTUAL SINCRONICA", label: "Virtual" },
  ];

  const [filter, setFilter] = useState<FilterProp>({
    Carrera: "",
    Nivel: "",
    Jornada: "",
    "ASIGNATURA VIRTUAL SINCRONICA": "",
  });

  const handleChange = (key: string, value: string) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const filteredSubjects = subjects.filter((subject) => {
    return Object.entries(filter).every(([key, value]) => {
      if (value === "") return true;
      return String(subject[key as keyof ProcessedSubject]) === String(value);
    });
  });

  const handleCheckBox = (val: string) => {
    if (chosenSubjects.has(val)) {
      setChoosenSubjects((prev) => {
        const newSet = new Set(prev);
        newSet.delete(val);
        return newSet;
      });
    } else {
      setChoosenSubjects((prev) => new Set([...prev, val]));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputs}>
        {inputs.map((inputConfig) => {
          const uniqueValues = [
            ...new Set(subjects.map((fila) => fila[inputConfig.key])),
          ];

          return (
            <label className={styles.inputBody} key={inputConfig.key}>
              {inputConfig.label}
              <select
                onChange={(val) =>
                  handleChange(inputConfig.key, val.target.value)
                }
              >
                <option value="">Todos</option>
                {uniqueValues.map((val, index) => {
                  const displayValue =
                    typeof val === "string" || typeof val === "number"
                      ? val
                      : "N/A";

                  return (
                    <option
                      key={`${inputConfig.key}-${index}`}
                      value={displayValue}
                    >
                      {displayValue}
                    </option>
                  );
                })}
              </select>
            </label>
          );
        })}
      </div>

      <div className={styles.filteredSubjects}>
        {(() => {
          const uniqueMap = new Map<string, FilteredSubjectProp>();

          filteredSubjects.forEach((subject) => {
            const key = `${subject["Nombre Asignatura"]}-${subject.Nivel}-${subject.Jornada}-${subject["ASIGNATURA VIRTUAL SINCRONICA"]}`;

            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, {
                nombre: subject["Nombre Asignatura"],
                nivel: subject.Nivel,
                jornada: subject.Jornada,
                virtual: subject["ASIGNATURA VIRTUAL SINCRONICA"],
              });
            }
          });

          return Array.from(uniqueMap.values()).map((item, index) => (
            <FilteredSubject
              key={index}
              filteredSubject={item}
              chosenSubjects={chosenSubjects}
              handleCheckBox={handleCheckBox}
            />
          ));
        })()}
      </div>
    </div>
  );
};

export default SubjectChoise;
