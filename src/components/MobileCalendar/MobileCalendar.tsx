import type { Schedule } from "../../types/planner.types";
import { DAYS } from "../../pages/Planner/Planner";
import styles from "./MobileCalendar.module.css";
import "../DesktopCalendar/DesktopCalendar.module.css";
import SubjectBlock from "../SubjectBlock/SubjectBlock";
import { timeToSeconds } from "../../utils/planner.utils";
import "@/App.css";

interface Props {
  schedule: Schedule;
}

const MobileCalendar = ({ schedule }: Props) => {
  const hourPx = 35;
  const initSpace = 100;

  return (
    <div className={styles.container}>
      {DAYS.map((d) => (
        <details key={d.id}>
          <summary>
            {d.label}{" "}
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
          <div className={styles.columns}>
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
                    top:
                      timeToSeconds(b.Horario.start as string) / hourPx +
                      initSpace,
                    height:
                      (timeToSeconds(b.Horario.end as string) -
                        timeToSeconds(b.Horario.start as string)) /
                        hourPx +
                      "px",
                  }}
                  subject={b}
                />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
};

export default MobileCalendar;
