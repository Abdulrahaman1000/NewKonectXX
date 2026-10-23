/** SC-STAFF2  Date-range presets shared by the Expenses and Reports pages. */
const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export type Preset = "today" | "7d" | "month" | "30d" | "custom";
export const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

export function presetRange(p: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const to = ymd(now);
  if (p === "today") return { from: to, to };
  if (p === "month") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  const back = new Date(now);
  back.setDate(back.getDate() - (p === "7d" ? 6 : 29));
  return { from: ymd(back), to };
}
