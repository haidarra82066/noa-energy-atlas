export type UpdateMode = "news" | "law";

const shared = [/^src\/data\/automated-publications\.json$/, /^public\/deployment-marker\.json$/];
const news = [
  /^updates\/research\/news-evidence\.json$/,
  /^updates\/candidates\/news(?:\.json|-briefing\.md|\.md)$/,
  /^updates\/pending-state\/news\.json$/,
  /^updates\/publication-ledger-news\.jsonl$/,
  /^updates\/memory\/(briefing-history|watchlist|data-gaps)\.md$/
];
const law = [
  /^updates\/research\/law-evidence\.json$/,
  /^updates\/candidates\/law(?:\.json|-verification\.json|\.md)$/,
  /^updates\/pending-state\/law\.json$/,
  /^updates\/publication-ledger-law\.jsonl$/
];

export function isAllowedUpdateFile(mode: UpdateMode, file: string): boolean {
  return [...shared, ...(mode === "news" ? news : law)].some((pattern) => pattern.test(file));
}
