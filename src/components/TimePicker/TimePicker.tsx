import { useState } from "react";
import styles from "./TimePicker.module.css";

interface Props {
  value?: string;
  onChange?: (val: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0"),
);

const TimePicker = ({ value = "00:00:00", onChange }: Props) => {
  const [active, setActive] = useState(false);
  const [hour, minute] = value.split(":");

  const handleHourClick = (h: string) => {
    onChange?.(`${h}:${minute}:00`);
  };

  const handleMinuteClick = (m: string) => {
    onChange?.(`${hour}:${m}:00`);
  };

  return (
    <div onClick={() => setActive(true)} className={styles.timepickerBody}>
      {hour}:{minute}
      {active && (
        <>
          <div
            className={styles.timepickerOverlay}
            onClick={(e) => {
              e.stopPropagation();
              setActive(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            /* className={`timepicker-form ${active ? "active" : ""}`} */
            className={styles[`timepickerForm ${active ? "active" : ""}`]}
          >
            <div className={styles.timepickerScrollColumn}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  /* className={`timepicker-item ${h === hour ? "active" : ""}`} */
                  className={
                    styles[`timepickerItem ${h === hour ? "active" : ""}`]
                  }
                  onClick={() => handleHourClick(h)}
                >
                  {h}
                </div>
              ))}
            </div>
            <div className={styles.timepickerScrollColumn}>
              {MINUTES.map((m) => (
                <div
                  key={m}
                  /* className={`timepicker-item ${m === minute ? "active" : ""}`} */
                  className={
                    styles[`timepickerItem ${m === minute ? "active" : ""}`]
                  }
                  onClick={() => handleMinuteClick(m)}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimePicker;
