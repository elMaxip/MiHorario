import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { availabilityAtom, chosenSubjectsAtom, scopeAtom } from "@/state/atoms";
import { generationAtom, signatureOf, startGeneration, type GenerationError } from "@/state/generation";

/** Último error de «Crear horarios», ligado a las entradas que lo produjeron. */
export const plannerErrorAtom = atom<{ error: GenerationError; signature: string } | null>(null);

/** Firma de las entradas actuales del planificador. */
export const currentSignatureAtom = atom((get) =>
  signatureOf(
    get(chosenSubjectsAtom).map((c) => c.subject.id),
    get(scopeAtom),
    get(availabilityAtom),
  ),
);

/** El error solo se muestra mientras las entradas sigan iguales. */
export const visiblePlannerErrorAtom = atom((get) => {
  const e = get(plannerErrorAtom);
  return e && e.signature === get(currentSignatureAtom) ? e.error : null;
});

export function useCreateSchedules() {
  const chosen = useAtomValue(chosenSubjectsAtom);
  const scope = useAtomValue(scopeAtom);
  const availability = useAtomValue(availabilityAtom);
  const signature = useAtomValue(currentSignatureAtom);
  const generation = useAtomValue(generationAtom);
  const setError = useSetAtom(plannerErrorAtom);
  const navigate = useNavigate();

  const upToDate = generation.request?.signature === signature && generation.schedules.length > 0;

  const create = useCallback(async () => {
    if (chosen.length === 0) {
      setError({ error: { ok: false, reason: "no-subjects" }, signature });
      navigate("/planificador");
      return;
    }
    if (upToDate) {
      navigate("/horarios");
      return;
    }
    setError(null);
    const res = await startGeneration({
      subjects: chosen.map((c) => c.subject),
      colors: chosen.map((c) => c.color),
      scope,
      availability,
    });
    if (res.ok) navigate("/horarios");
    else if (res.reason !== "superseded") {
      setError({ error: res, signature });
      navigate("/planificador");
    }
  }, [availability, chosen, navigate, scope, setError, signature, upToDate]);

  return { create, running: generation.running && !upToDate, generation };
}
