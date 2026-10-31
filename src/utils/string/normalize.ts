const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[‘’]/g, "'") // typographic apostrophes
    .replace(/œ/gi, 'oe') // not decomposable by NFD
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
