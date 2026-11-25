import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { fittingSections } from "@/domain/fit";
import { availabilityAtom, chosenSubjectsAtom, scopeAtom, subjectMapAtom } from "@/state/atoms";
import { BATCH_SIZE } from "@/workers/protocol";
import { Button } from "@/ui/Button";
import { Progress } from "@/ui/Progress";
import { joinList } from "@/domain/text";
import { AvailabilityPanel } from "./AvailabilityPanel";
import { SubjectsPanel } from "./SubjectsPanel";
import { plural } from "./labels";
import { currentSignatureAtom, useCreateSchedules, visiblePlannerErrorAtom } from "./useCreateSchedules";
import styles from "./PlannerPage.module.css";

export function PlannerPage() {
  const [peekId, setPeekId] = useState<string | null>(null);
  return (
    <>
      <main className={styles.wrap}>
        <h1>Elige tus ramos y tus horas</h1>
        <div className={styles.two}>
          <SubjectsPanel onPeek={setPeekId} />
          <AvailabilityPanel peekId={peekId} />
        </div>
      </main>
      <PlannerFooter />
    </>
  );
}

function PlannerFooter() {
  const chosen = useAtomValue(chosenSubjectsAtom);
  const scope = useAtomValue(scopeAtom);
  const availability = useAtomValue(availabilityAtom);
  const subjects = useAtomValue(subjectMapAtom);
  const error = useAtomValue(visiblePlannerErrorAtom);
  const signature = useAtomValue(currentSignatureAtom);
  const { create, generation } = useCreateSchedules();

  const fitting = useMemo(
    () => chosen.reduce((n, c) => n + fittingSections(c.subject, scope, availability).length, 0),
    [chosen, scope, availability],
  );

  const generating =
    generation.running && generation.schedules.length === 0 && generation.request?.signature === signature;

  let message: string;
  if (error) {
    switch (error.reason) {
      case "no-subjects":
        message = "Elige al menos una asignatura para crear horarios.";
        break;
      case "subject-does-not-fit": {
        const names = error.subjectIds.map((id) => subjects.get(id)?.name ?? id);
        const many = names.length > 1;
        message = `${joinList(names)} ${many ? "no caben" : "no cabe"} en tus horas. Amplía la disponibilidad o ${
          many ? "quítalas" : "quítala"
        } de la lista.`;
        break;
      }
      case "no-combinations":
        message =
          "Las secciones que caben en tus horas chocan entre sí. Amplía la disponibilidad o quita una asignatura.";
        break;
    }
  } else if (chosen.length === 0) {
    message = "Aún no eliges asignaturas.";
  } else {
    message = `${plural(chosen.length, "asignatura elegida", "asignaturas elegidas")}. ${plural(
      fitting,
      "sección cabe",
      "secciones caben",
    )} en tus horas.`;
  }

  return (
    <div className={styles.foot}>
      <div>
        <p className={error ? styles.error : undefined} aria-live="polite">
          {message}
        </p>
        <div className={styles.action}>
          {generating && (
            <Progress
              className={styles.progress}
              value={generation.batchFound / BATCH_SIZE}
              label="Generando horarios"
            />
          )}
          <Button variant="primary" onClick={() => void create()} disabled={generating} aria-busy={generating}>
            {generating ? "Generando…" : "Crear horarios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
