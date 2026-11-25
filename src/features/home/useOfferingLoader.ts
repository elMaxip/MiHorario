import { useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinList } from "@/domain/text";
import { offeringAtom, prefsAtom } from "@/state/atoms";
import { resetGeneration } from "@/state/generation";
import { reconcilePrefs } from "@/state/prefs";

export type LoaderState =
  | { status: "idle" }
  | { status: "reading"; name: string }
  | { status: "error"; message: string };

export const SAMPLE_URL = "/Horario.xlsx";

function errorMessage(name: string, reason: "unreadable" | "missing-columns" | "no-subjects", missing: string[] = []) {
  switch (reason) {
    case "missing-columns":
      return `A ${name} le ${missing.length === 1 ? "falta la columna" : "faltan las columnas"} ${joinList(
        missing.map((c) => `«${c}»`),
      )}. Sube la oferta académica tal como se descarga.`;
    case "no-subjects":
      return `${name} no tiene asignaturas con horario. Revisa que sea la oferta académica completa.`;
    case "unreadable":
      return `No pudimos leer ${name}. Revisa que sea un archivo .xlsx válido y vuelve a subirlo.`;
  }
}

/** Lee el Excel en el navegador, guarda la oferta y restaura las preferencias. */
export function useOfferingLoader() {
  const [state, setState] = useState<LoaderState>({ status: "idle" });
  const setOffering = useSetAtom(offeringAtom);
  const setPrefs = useSetAtom(prefsAtom);
  const navigate = useNavigate();

  const read = useCallback(
    async (name: string, getData: () => Promise<ArrayBuffer>) => {
      if (!/\.xlsx$/i.test(name)) {
        setState({
          status: "error",
          message: `${name} no es un archivo .xlsx. Descarga la oferta en formato Excel y vuelve a subirla.`,
        });
        return;
      }
      setState({ status: "reading", name });
      try {
        // SheetJS pesa: se descarga solo cuando hace falta.
        const [data, { parseOffering }] = await Promise.all([getData(), import("@/domain/parse")]);
        const res = parseOffering(data);
        if (!res.ok) {
          setState({
            status: "error",
            message: errorMessage(name, res.reason, res.reason === "missing-columns" ? res.missing : []),
          });
          return;
        }
        resetGeneration();
        setOffering(res.offering);
        setPrefs((p) => reconcilePrefs(p, res.offering));
        setState({ status: "idle" });
        navigate("/planificador");
      } catch {
        setState({ status: "error", message: errorMessage(name, "unreadable") });
      }
    },
    [navigate, setOffering, setPrefs],
  );

  const loadFile = useCallback((file: File) => read(file.name, () => file.arrayBuffer()), [read]);

  const loadSample = useCallback(
    () =>
      read("Horario.xlsx", async () => {
        const res = await fetch(SAMPLE_URL);
        if (!res.ok) throw new Error(String(res.status));
        return res.arrayBuffer();
      }),
    [read],
  );

  return { state, loadFile, loadSample };
}
