import { useAtom, useAtomValue } from "jotai";
import { memo, useCallback, useDeferredValue, useMemo } from "react";
import { countFitting, sectionsInScope, type SectionScope } from "@/domain/fit";
import { applyNeed, nearestSection, type NearestFit } from "@/domain/nearest";
import { plain, toSentenceCase } from "@/domain/text";
import type { Availability, Subject } from "@/domain/types";
import {
  availabilityAtom,
  carreraAtom,
  chosenAtom,
  filtersAtom,
  includeOtherCareersAtom,
  offeringAtom,
  scopeAtom,
} from "@/state/atoms";
import { EMPTY_FILTERS, nextColor } from "@/state/prefs";
import { LinkButton, Button } from "@/ui/Button";
import { checkboxBoxClass } from "@/ui/classes";
import { Checkbox, SelectField, TextField } from "@/ui/Field";
import { compareNivel, nearestTip, nivelOf, subjectMeta } from "./labels";
import styles from "./SubjectsPanel.module.css";

interface SubjectsPanelProps {
  onPeek: (id: string | null) => void;
}

export function SubjectsPanel({ onPeek }: SubjectsPanelProps) {
  const offering = useAtomValue(offeringAtom)!;
  const [filters, setFilters] = useAtom(filtersAtom);
  const [carrera, setCarrera] = useAtom(carreraAtom);
  const [includeOthers, setIncludeOthers] = useAtom(includeOtherCareersAtom);
  const [chosen, setChosen] = useAtom(chosenAtom);
  const [availability, setAvailability] = useAtom(availabilityAtom);
  const scope = useAtomValue(scopeAtom);
  const multiCareer = offering.carreras.length > 1;
  const needsCareer = multiCareer && !carrera;
  const effectiveCarrera = multiCareer ? carrera : null;

  // Asignaturas de la carrera elegida, ordenadas por nivel y nombre.
  const inCareer = useMemo(() => {
    const list = offering.subjects.filter((s) => !effectiveCarrera || effectiveCarrera in s.niveles);
    return list.sort(
      (a, b) =>
        compareNivel(nivelOf(a, effectiveCarrera), nivelOf(b, effectiveCarrera)) ||
        a.name.localeCompare(b.name, "es") ||
        a.jornada.localeCompare(b.jornada, "es"),
    );
  }, [offering, effectiveCarrera]);

  const niveles = useMemo(
    () => [...new Set(inCareer.map((s) => nivelOf(s, effectiveCarrera)))].sort(compareNivel),
    [inCareer, effectiveCarrera],
  );
  const jornadas = useMemo(
    () => [...new Set(inCareer.map((s) => s.jornada))].sort((a, b) => a.localeCompare(b, "es")),
    [inCareer],
  );
  const hasOnline = useMemo(() => inCareer.some((s) => s.modalidad === "online"), [inCareer]);

  const q = useDeferredValue(filters.q);
  const rows = useMemo(() => {
    const needle = plain(q.trim());
    return inCareer.filter(
      (s) =>
        (!needle || plain(s.name).includes(needle) || plain(s.sigla).includes(needle)) &&
        (!filters.nivel || nivelOf(s, effectiveCarrera) === filters.nivel) &&
        (!filters.jornada || s.jornada === filters.jornada) &&
        (!filters.modalidad || s.modalidad === filters.modalidad),
    );
  }, [inCareer, q, filters.nivel, filters.jornada, filters.modalidad, effectiveCarrera]);

  const chosenIds = useMemo(() => new Set(chosen.map((c) => c.id)), [chosen]);
  // Variantes excluyentes: una sola versión por sigla.
  const chosenBySigla = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of offering.subjects) if (chosenIds.has(s.id)) map.set(s.sigla, s);
    return map;
  }, [offering, chosenIds]);

  const toggle = useCallback(
    (s: Subject) =>
      setChosen((prev) =>
        prev.some((c) => c.id === s.id)
          ? prev.filter((c) => c.id !== s.id)
          : [...prev, { id: s.id, color: nextColor(prev) }],
      ),
    [setChosen],
  );
  const fix = useCallback((fit: NearestFit) => setAvailability((a) => applyNeed(a, fit)), [setAvailability]);

  const changeCareer = (value: string) => {
    const next = value || null;
    setCarrera(next);
    setFilters((f) => ({ ...f, nivel: "" }));
    // Los ramos de otra carrera dejan de estar a la vista: se quitan.
    if (next) {
      const keep = new Set(offering.subjects.filter((s) => next in s.niveles).map((s) => s.id));
      setChosen((prev) => prev.filter((c) => keep.has(c.id)));
    }
  };

  const filtersActive = !!(filters.q || filters.nivel || filters.jornada || filters.modalidad);

  return (
    <section aria-labelledby="h-asig">
      <h2 id="h-asig">Asignaturas</h2>
      <div className={styles.filters}>
        {multiCareer && (
          <SelectField
            label="Carrera"
            fieldClassName={styles.wide}
            value={carrera ?? ""}
            onChange={(e) => changeCareer(e.target.value)}
          >
            {!carrera && <option value="">Elige tu carrera</option>}
            {offering.carreras.map((c) => (
              <option key={c} value={c}>
                {toSentenceCase(c)}
              </option>
            ))}
          </SelectField>
        )}
        {!needsCareer && (
          <>
            <TextField
              label="Buscar"
              type="search"
              name="buscar"
              autoComplete="off"
              placeholder="Base de datos…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            <SelectField
              label="Nivel"
              value={filters.nivel}
              onChange={(e) => setFilters((f) => ({ ...f, nivel: e.target.value }))}
            >
              <option value="">Todos</option>
              {niveles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Jornada"
              value={filters.jornada}
              onChange={(e) => setFilters((f) => ({ ...f, jornada: e.target.value }))}
            >
              <option value="">Todas</option>
              {jornadas.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Modalidad"
              value={filters.modalidad}
              onChange={(e) => setFilters((f) => ({ ...f, modalidad: e.target.value === "online" ? "online" : "" }))}
            >
              <option value="">Todas</option>
              {(hasOnline || filters.modalidad === "online") && <option value="online">Online sincrónica</option>}
            </SelectField>
          </>
        )}
      </div>
      {multiCareer && !needsCareer && (
        <Checkbox
          className={styles.others}
          label="Incluir secciones de otras carreras"
          checked={includeOthers}
          onChange={(e) => setIncludeOthers(e.target.checked)}
        />
      )}

      {needsCareer ? (
        <p className={styles.none}>Elige tu carrera para ver sus asignaturas.</p>
      ) : (
        <>
          <ul className={styles.list}>
            {rows.map((s) => {
              const mate = chosenBySigla.get(s.sigla);
              return (
                <SubjectRow
                  key={s.id}
                  subject={s}
                  carrera={effectiveCarrera}
                  scope={scope}
                  availability={availability}
                  on={chosenIds.has(s.id)}
                  mate={mate && mate.id !== s.id ? mate : null}
                  onToggle={toggle}
                  onPeek={onPeek}
                  onFix={fix}
                />
              );
            })}
          </ul>
          {rows.length === 0 && (
            <div className={styles.none}>
              <span>Ninguna asignatura coincide con estos filtros.</span>
              {filtersActive && (
                <LinkButton onClick={() => setFilters({ ...EMPTY_FILTERS })}>Quitar filtros</LinkButton>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface SubjectRowProps {
  subject: Subject;
  carrera: string | null;
  scope: SectionScope;
  availability: Availability;
  on: boolean;
  mate: Subject | null;
  onToggle: (s: Subject) => void;
  onPeek: (id: string | null) => void;
  onFix: (fit: NearestFit) => void;
}

const SubjectRow = memo(function SubjectRow({
  subject: s,
  carrera,
  scope,
  availability,
  on,
  mate,
  onToggle,
  onPeek,
  onFix,
}: SubjectRowProps) {
  const { fit, total } = countFitting(s, scope, availability);
  const bad = on && fit === 0 && total > 0;
  const near = bad ? nearestSection(s, sectionsInScope(s, scope), availability) : null;
  const off = !!mate;
  const tipId = `tip-${s.id}`;

  return (
    <li
      className={[styles.row, on && styles.on, off && styles.off].filter(Boolean).join(" ")}
      onMouseEnter={() => onPeek(s.id)}
      onMouseLeave={() => onPeek(null)}
    >
      <label>
        <input
          type="checkbox"
          className={checkboxBoxClass}
          checked={on}
          disabled={off}
          onChange={() => onToggle(s)}
          onFocus={() => onPeek(s.id)}
          onBlur={() => onPeek(null)}
          aria-describedby={near ? tipId : undefined}
        />
        <span>
          <span className={styles.name}>{s.name}</span>
          <span className={styles.meta}>{subjectMeta(s, carrera, mate)}</span>
        </span>
        <span className={`${styles.fit} ${bad ? styles.fitBad : ""}`}>
          <b className="num">
            {fit} de {total}
          </b>
          {total === 1 ? "sección cabe" : "secciones caben"}
        </span>
      </label>
      {near && (
        <div className={styles.fix}>
          <p id={tipId}>{nearestTip(near)}</p>
          <Button size="small" className={styles.fixButton} onClick={() => onFix(near)}>
            Ampliar horas
          </Button>
        </div>
      )}
    </li>
  );
});

