const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/;

/**
 * «BASE DE DATOS APLICADA II» → «Base de datos aplicada II».
 * Conserva números romanos y siglas entre paréntesis, como «(UML)».
 */
export function toSentenceCase(name: string): string {
  const words = name.trim().replace(/\s+/g, " ").split(" ");
  const out = words.map((w) => {
    const core = w.replace(/^[(¿¡"«]+|[).,:;?!"»]+$/g, "");
    if (ROMAN.test(core)) return w;
    if (/^\(.+\)$/.test(w) && w === w.toUpperCase()) return w;
    return w.toLocaleLowerCase("es");
  });
  const s = out.join(" ");
  const first = s.search(/\p{L}/u);
  if (first < 0) return s;
  return s.slice(0, first) + s[first].toLocaleUpperCase("es") + s.slice(first + 1);
}

/** Minúsculas y sin tildes, para buscar. */
export function plain(text: string): string {
  return text.toLocaleLowerCase("es").normalize("NFD").replace(/\p{M}/gu, "");
}

/** «a», «a y b», «a, b y c». */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}
