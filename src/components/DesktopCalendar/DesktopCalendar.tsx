import styles from "./DesktopCalendar.module.css";
import type { Schedule } from "../../types/planner.types";
import { timeToSeconds } from "../../utils/planner.utils";
import { DAYS } from "../../pages/Planner/Planner";
import SubjectBlock from "../SubjectBlock/SubjectBlock";

interface Props {
  schedule: Schedule;
}

const DesktopCalendar = ({ schedule }: Props) => {
  const hourPx = 35;
  const initSpace = 100;

  return (
    <div className={styles.container}>
      <div className={styles.hourColumn}>
        <div className={styles.columnLabel} style={{ height: initSpace }}>
          <span className={styles.hourColumnLabel}>HORA</span>
        </div>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={styles.hourLabel}
            style={{
              top: (i * 3600) / hourPx + initSpace,
            }}
          >
            {i}:00
          </div>
        ))}
      </div>

      {DAYS.map((d) => (
        <div
          key={d.id}
          className={styles.dayColumn}
          style={{ height: (24 * 3600) / hourPx + initSpace }}
        >
          <div className={styles.columnLabel} style={{ height: initSpace }}>
            <span>{d.label}</span>
          </div>
          {schedule[d.id]?.map((b, i) => (
            <SubjectBlock
              key={i}
              style={{
                top: timeToSeconds(b.Horario.start) / hourPx + initSpace,
                height:
                  (timeToSeconds(b.Horario.end) -
                    timeToSeconds(b.Horario.start)) /
                    hourPx +
                  "px",
              }}
              subject={b}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default DesktopCalendar;
