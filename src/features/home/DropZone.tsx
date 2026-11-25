import { useEffect, useState, type ChangeEvent } from "react";
import { LinkButton } from "@/ui/Button";
import { buttonClass } from "@/ui/classes";
import type { useOfferingLoader } from "./useOfferingLoader";
import styles from "./DropZone.module.css";

interface DropZoneProps {
  loader: ReturnType<typeof useOfferingLoader>;
  /** Se llegó aquí tras recargar sin archivo (D2). */
  notice: boolean;
}

const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");

export function DropZone({ loader, notice }: DropZoneProps) {
  const { state, loadFile, loadSample } = loader;
  const [over, setOver] = useState(false);

  // Se puede soltar el archivo en cualquier parte de la página.
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const overFn = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) void loadFile(file);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", overFn);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [loadFile]);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void loadFile(file);
  };

  const reading = state.status === "reading";
  const title = over
    ? "Suelta el archivo para leerlo"
    : reading
      ? `Leyendo ${state.name}…`
      : "Arrastra o selecciona el Excel de tu oferta académica";

  return (
    <div className={`${styles.drop} ${over ? styles.over : ""}`}>
      {notice && !reading && state.status !== "error" && !over && (
        <p className={styles.notice} role="status">
          Vuelve a subir tu Excel. Tus ramos y horas quedaron guardados.
        </p>
      )}
      <strong className={styles.title} aria-live="polite">
        {title}
      </strong>
      {state.status === "error" && !over && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.actions}>
        <label className={`${buttonClass("dark")} ${styles.file}`} aria-disabled={reading || undefined}>
          Seleccionar Excel
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onPick} disabled={reading} />
        </label>
        <LinkButton onClick={() => void loadSample()} disabled={reading}>
          Probar con un archivo de ejemplo
        </LinkButton>
      </div>
      <small className={styles.note}>Solo .xlsx. Se lee en tu navegador y no se envía a ningún servidor.</small>
    </div>
  );
}
