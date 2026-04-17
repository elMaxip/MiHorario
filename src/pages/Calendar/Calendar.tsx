import { useEffect, useState } from "react";
import styles from "./Calendar.module.css";
import DesktopCalendar from "../../components/DesktopCalendar/DesktopCalendar";
import MobileCalendar from "../../components/MobileCalendar/MobileCalendar";
import { useAtomValue } from "jotai";
import { schedulesAtom } from "../../App";
import { useNavigate } from "react-router-dom";

const SchedulePage = () => {
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [count, setCount] = useState(0);
  const schedules = useAtomValue(schedulesAtom);

  window.addEventListener("resize", () => {
    setWindowWidth(window.innerWidth);
  });

  const changeCount = (number: number) => {
    if (!schedules || !schedules[count + number]) return;

    setCount((prev) => prev + number);
  };

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div className={styles.info}>
          <h1>Visualizador de horarios</h1>
          <span>
            Explora las combinaciones generadas para tu semestre académico.
          </span>
        </div>

        <div className={styles.navbar}>
          <div>
            <button onClick={() => changeCount(-1)}>
              <svg
                width="8"
                height="12"
                viewBox="0 0 8 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 12L0 6L6 0L7.4 1.4L2.8 6L7.4 10.6L6 12Z"
                  fill="#7C5800"
                />
              </svg>
            </button>
            HORARIO {count + 1} DE {schedules?.length || 0}
            <button onClick={() => changeCount(1)}>
              <svg
                width="8"
                height="12"
                viewBox="0 0 8 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.6 6L0 1.4L1.4 0L7.4 6L1.4 12L0 10.6L4.6 6Z"
                  fill="#7C5800"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {windowWidth >= 1030 && <DesktopCalendar schedule={schedules![count]} />}
      {windowWidth < 1030 && <MobileCalendar schedule={schedules![count]} />}
    </main>
  );
};

export default SchedulePage;
