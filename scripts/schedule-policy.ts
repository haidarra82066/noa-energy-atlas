export type PublicationMode = "news" | "law";

type BeirutScheduleParts = {
  weekday: string;
  day: number;
  hour: number;
};

export function isScheduledWindow(mode: PublicationMode, parts: BeirutScheduleParts): boolean {
  if (mode === "news") {
    return ["Tue", "Fri"].includes(parts.weekday) && parts.hour >= 8 && parts.hour <= 23;
  }

  return [1, 15].includes(parts.day) && parts.hour >= 8 && parts.hour <= 23;
}
