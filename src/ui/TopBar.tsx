import { LogoMark } from "./Logo";
import styles from "./TopBar.module.css";

export type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Archivo" },
  { n: 2, label: "Preferencias" },
  { n: 3, label: "Horarios" },
];

interface TopBarProps {
  /** Paso actual; `null` en el inicio, donde no se muestra el stepper. */
  step: Step | null;
  onHome: () => void;
  onStep: (step: Step) => void;
}

export function TopBar({ step, onHome, onStep }: TopBarProps) {
  return (
    <header className={styles.top}>
      <button type="button" className={styles.brand} onClick={onHome} aria-label="MiHorario, volver al inicio">
        <LogoMark />
        <span translate="no">MiHorario</span>
      </button>
      {step !== null && (
        <nav className={styles.steps} aria-label="Pasos">
          {STEPS.map((s) => (
            <button
              key={s.n}
              type="button"
              className={styles.step}
              aria-current={s.n === step ? "step" : undefined}
              onClick={() => onStep(s.n)}
            >
              <span className={`${styles.stepNum} num`}>{s.n}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
