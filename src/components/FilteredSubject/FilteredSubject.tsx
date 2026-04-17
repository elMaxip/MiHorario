import type { FilteredSubjectProp } from "../SubjectChoise/SubjectChoice";
import styles from "./FilteredSubject.module.css";

interface Props {
  filteredSubject: FilteredSubjectProp;
  chosenSubjects: Set<string>;
  handleCheckBox: (val: string) => void;
}

function someSet(set: Set<any>, callback: (val: any) => boolean) {
  for (let valor of set) {
    if (callback(valor)) return true;
  }
  return false;
}

const FilteredSubject = ({
  filteredSubject,
  chosenSubjects,
  handleCheckBox,
}: Props) => {
  // 1. Creamos el valor exacto de este checkbox
  const itemValue = `${filteredSubject.nombre}/${filteredSubject.nivel}/${filteredSubject.jornada}/${filteredSubject.virtual}`;

  // 2. ¿Este checkbox exacto está seleccionado?
  const isChecked = chosenSubjects.has(itemValue);

  // 3. ¿Hay ALGUNA asignatura en la lista elegida que empiece con este mismo nombre?
  /* const isNameAlreadySelected = chosenSubjects.some((subjectString) =>
    subjectString.startsWith(`${filteredSubject.nombre}/`),
  ); */

  const isNameAlreadySelected = someSet(chosenSubjects, (subjectString) =>
    subjectString.startsWith(`${filteredSubject.nombre}/`),
  );

  // 4. Se desactiva SI el nombre ya fue elegido, PERO no es este checkbox (para poder desmarcarlo)
  const isDisabled = isNameAlreadySelected && !isChecked;

  return (
    <label className={styles.container}>
      <input
        type="checkbox"
        value={itemValue}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(e) => handleCheckBox(e.target.value)}
      />
      {filteredSubject.nombre}
      <span className={styles.badge}>{filteredSubject.nivel}</span>
      <span className={styles.badge}>{filteredSubject.jornada}</span>
      <span className={styles.badge}>{filteredSubject.virtual || "N/A"}</span>
    </label>
  );
};

export default FilteredSubject;
