import styles from "./TimePickerLabel.module.css";
import TimePicker from "../TimePicker/TimePicker";
import type { Day } from "../../types/planner.types";

interface Props {
  day: string;
  dayId: Day;
  valueMin: string;
  valueMax: string;
  onChange: (dayId: Day, type: "min" | "max", value: string) => void;
}

const TimePickerLabel = ({
  day,
  dayId,
  valueMin,
  valueMax,
  onChange,
}: Props) => {
  return (
    <article className={styles.container}>
      <div className={styles.left}>
        <div className={styles.line} />
        <div className={styles.info}>
          <span className={styles.day}>{day}</span>
          <span className={styles.dayText}>Día hábil</span>
        </div>
      </div>

      <div className={styles.inputs}>
        <div className={styles.input}>
          <span>Desde</span>
          <TimePicker
            value={valueMin}
            onChange={(val) => onChange(dayId, "min", val)}
          />
        </div>

        <svg
          width="16"
          height="2"
          viewBox="0 0 16 2"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16 0V1.29688H0V0H16Z" fill="#D5C4AB" />
        </svg>

        <div className={styles.input}>
          <span>Hasta</span>
          <TimePicker
            value={valueMax}
            onChange={(val) => onChange(dayId, "max", val)}
          />
        </div>
      </div>
    </article>
  );
};

export default TimePickerLabel;
