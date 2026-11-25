import styles from "./Progress.module.css";

interface ProgressProps {
  /** 0 a 1. */
  value: number;
  label: string;
  className?: string;
}

/** Barra de progreso nativa, con etiqueta accesible. */
export function Progress({ value, label, className }: ProgressProps) {
  return (
    <progress
      className={[styles.progress, className].filter(Boolean).join(" ")}
      max={1}
      value={Math.max(0, Math.min(1, value))}
      aria-label={label}
    />
  );
}
