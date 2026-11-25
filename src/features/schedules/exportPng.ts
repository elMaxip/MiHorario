import { formatHM, formatRange } from "@/domain/time";
import { DAY_NAMES, DAYS, type Availability } from "@/domain/types";
import { blocksByDay, type PlacedSection } from "./model";

export interface PngInput {
  items: readonly PlacedSection[];
  availability: Availability;
  range: { start: number; end: number };
  summary: string;
}

/** Lee los colores de `tokens.css`, para no repetirlos aquí. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    accent: v("--amber-400"),
    ink: v("--neutral-950"),
    ink900: v("--neutral-900"),
    secondary: v("--neutral-600"),
    line: v("--neutral-200"),
    muted: v("--neutral-100"),
    white: v("--neutral-0"),
    subject: [0, 1, 2, 3, 4, 5].map((i) => [v(`--subject-${i}-bg`), v(`--subject-${i}-fg`)] as const),
  };
}

const FONT = '"Archivo Variable", Archivo, "Helvetica Neue", Arial, sans-serif';

/** Dibuja el horario en un PNG de 1600 px de ancho, igual en escritorio y móvil. */
export function drawSchedule(o: PngInput): HTMLCanvasElement {
  const c = palette();
  const W = 1600;
  const M = 56;
  const AX = 84;
  const HP = 92;
  const top = 206;
  const H = ((o.range.end - o.range.start) / 60) * HP;
  const cw = (W - M * 2 - AX) / 6;
  const rows = Math.ceil(o.items.length / 2);

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = top + H + 110 + rows * 68 + 32;
  const x = cv.getContext("2d");
  if (!x) throw new Error("Sin canvas 2D");

  const font = (w: number, s: number) => (x.font = `${w} ${s}px ${FONT}`);
  const txt = (t: string, px: number, py: number, color: string, align: CanvasTextAlign = "left") => {
    x.fillStyle = color;
    x.textAlign = align;
    x.fillText(t, px, py);
  };
  const rr = (px: number, py: number, w: number, h: number, r: number) => {
    x.beginPath();
    x.roundRect(px, py, w, h, r);
  };
  const wrap = (t: string, w: number) => {
    const out: string[] = [];
    let l = "";
    for (const p of t.split(" ")) {
      const n = l ? `${l} ${p}` : p;
      if (l && x.measureText(n).width > w) {
        out.push(l);
        l = p;
      } else l = n;
    }
    // Evita dejar sola una palabra corta (como el «I» de «Desarrollo fullstack I»).
    if (out.length && l.length <= 3 && !l.includes(" ")) {
      const prev = out[out.length - 1].split(" ");
      if (prev.length > 1) {
        const moved = prev.pop()!;
        out[out.length - 1] = prev.join(" ");
        l = `${moved} ${l}`;
      }
    }
    return out.concat(l);
  };
  const yOf = (m: number) => top + ((m - o.range.start) / 60) * HP;

  x.textBaseline = "alphabetic";
  x.fillStyle = c.white;
  x.fillRect(0, 0, W, cv.height);

  // Franja con el logo y el resumen.
  x.fillStyle = c.accent;
  x.fillRect(0, 0, W, 128);
  [0, 1, 2].forEach((k) => {
    x.fillStyle = c.ink;
    rr(M + k * 17, 44 + [0, 10, 5][k], 13, [27, 36, 20][k], 3);
    x.fill();
  });
  font(800, 48);
  txt("Mi horario", M + 68, 82, c.ink);
  font(500, 24);
  txt(o.summary, W - M, 78, c.ink, "right");

  // Semana
  DAYS.forEach((d, i) => {
    const cx = M + AX + i * cw;
    const a = o.availability[d];
    font(700, 24);
    txt(DAY_NAMES[d], cx + cw / 2, top - 22, c.ink, "center");
    x.fillStyle = c.muted;
    x.fillRect(cx, top, cw, H);
    if (a.on) {
      const s = Math.max(a.start, o.range.start);
      const e = Math.min(a.end, o.range.end);
      x.fillStyle = c.white;
      x.fillRect(cx, yOf(s), cw, yOf(e) - yOf(s));
    }
  });
  // Líneas de grilla: la tinta al 16 %, como --color-rule-soft.
  const rule = (px: number, py: number, w: number, h: number) => {
    x.globalAlpha = 0.16;
    x.fillStyle = c.ink;
    x.fillRect(px, py, w, h);
    x.globalAlpha = 1;
  };
  for (let m = o.range.start; m < o.range.end; m += 60) {
    rule(M + AX, yOf(m), W - M * 2 - AX, 1);
    font(600, 20);
    txt(formatHM(m), M + AX - 14, yOf(m) + 24, c.secondary, "right");
  }
  for (let i = 0; i < 6; i++) rule(M + AX + i * cw, top, 1, H);
  x.fillStyle = c.ink;
  x.fillRect(M, top - 2, W - M * 2, 3);

  const byDay = blocksByDay(o.items);
  DAYS.forEach((d, i) => {
    for (const b of byDay[d]) {
      const [bg, fg] = c.subject[b.item.color % 6];
      const bx = M + AX + i * cw + 6;
      const by = yOf(b.start) + 2;
      const bw = cw - 12;
      const bh = ((b.end - b.start) / 60) * HP - 2;
      let ty = by + 28;
      x.save();
      x.fillStyle = bg;
      rr(bx, by, bw, bh, 8);
      x.fill();
      if (b.item.color % 6 === 4) {
        x.strokeStyle = c.ink900;
        x.lineWidth = 2;
        x.stroke();
      }
      x.beginPath();
      x.rect(bx, by, bw, bh);
      x.clip();
      font(700, 21);
      for (const l of wrap(b.item.subject.name, bw - 24)) {
        txt(l, bx + 12, ty, fg);
        ty += 25;
      }
      font(500, 19);
      txt(formatRange(b.start, b.end), bx + 12, ty, fg);
      ty += 24;
      if (ty < by + bh - 6) txt(b.item.section.docente, bx + 12, ty, fg);
      x.restore();
    }
  });

  // Secciones
  const sy = top + H + 64;
  font(700, 28);
  txt("Secciones", M, sy, c.ink);
  x.fillStyle = c.ink;
  x.fillRect(M, sy + 18, W - M * 2, 3);
  const hw = (W - M * 2 - 48) / 2;
  o.items.forEach((s, k) => {
    const px = M + (k % 2) * (hw + 48);
    const py = sy + 21 + Math.floor(k / 2) * 68;
    x.fillStyle = c.subject[s.color % 6][0];
    rr(px, py + 21, 26, 26, 5);
    x.fill();
    x.strokeStyle = c.secondary;
    x.lineWidth = 1;
    x.stroke();
    font(700, 21);
    txt(s.subject.name, px + 42, py + 31, c.ink);
    txt(s.section.code, px + hw, py + 42, c.ink, "right");
    font(500, 18);
    txt(s.origin ? `${s.section.docente} · ${s.origin}` : s.section.docente, px + 42, py + 55, c.secondary);
    x.fillStyle = c.line;
    x.fillRect(px, py + 67, hw, 1);
  });
  return cv;
}

/** Genera el PNG y lo descarga directamente como `mi-horario-{N}.png`. */
export async function downloadSchedule(o: PngInput, n: number): Promise<void> {
  if (document.fonts?.load) {
    await Promise.all(
      ["500 20px", "600 20px", "700 20px", "800 20px"].map((f) => document.fonts.load(`${f} "Archivo Variable"`)),
    ).catch(() => undefined);
  }
  const canvas = drawSchedule(o);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("No se pudo crear la imagen");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mi-horario-${n}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
