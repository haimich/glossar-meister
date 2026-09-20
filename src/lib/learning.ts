export type Direction = "de_ro" | "ro_de";

export const DIRECTION_LABEL: Record<Direction, string> = {
  de_ro: "DE → RO",
  ro_de: "RO → DE",
};

/** Intervalle in Minuten je Stufe */
const INTERVALS_MIN = [10, 60 * 24, 60 * 24 * 3, 60 * 24 * 7, 60 * 24 * 14, 60 * 24 * 30];

export const MAX_LEVEL = INTERVALS_MIN.length - 1;

export function nextSchedule(level: number, known: boolean) {
  const nextLevel = known ? Math.min(level + 1, MAX_LEVEL) : 0;
  const minutes = known ? (INTERVALS_MIN[nextLevel] ?? 10) : 5;
  const dueAt = new Date(Date.now() + minutes * 60_000).toISOString();
  return { level: nextLevel, dueAt };
}

export function intervalLabel(level: number) {
  const labels = ["wenige Minuten", "1 Tag", "3 Tage", "7 Tage", "14 Tage", "30 Tage"];
  return labels[Math.min(level, MAX_LEVEL)] ?? labels[0];
}
