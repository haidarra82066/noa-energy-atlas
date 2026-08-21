import { EDITORIAL_TIMEZONE, type IntelligenceBriefing } from "../src/data/intelligence";

export type Cadence = "daily" | "twice-weekly" | "on-demand";

export interface StoredSourceState {
  hash: string;
  checkedAt: string;
  status: number;
  finalUrl: string;
}

export interface UpdateState {
  version: 2;
  mode: "law" | "news";
  lastSuccessfulRun: string | null;
  lastScheduledDate: string | null;
  editorialTimezone: typeof EDITORIAL_TIMEZONE;
  sources: Record<string, StoredSourceState>;
}

export function dateInBeirut(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EDITORIAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function cutoffInBeirut(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: EDITORIAL_TIMEZONE,
    dateStyle: "full",
    timeStyle: "long",
    hour12: false
  }).format(date);
}

export function computeCoverageStart(
  now: Date,
  cadence: Cadence,
  previousSuccessfulRun: string | null,
  overrideDays?: number
): string {
  const defaultDays = cadence === "daily" ? 2 : cadence === "twice-weekly" ? 4 : 5;
  const days = Math.max(1, Math.min(5, overrideDays ?? defaultDays));
  const fallback = new Date(now.getTime() - days * 86_400_000);
  if (!previousSuccessfulRun) return dateInBeirut(fallback);
  const previous = new Date(previousSuccessfulRun);
  if (Number.isNaN(previous.getTime())) return dateInBeirut(fallback);
  return dateInBeirut(previous > fallback ? previous : fallback);
}

export function normalizeState(raw: unknown, mode: "law" | "news"): UpdateState {
  const empty: UpdateState = {
    version: 2,
    mode,
    lastSuccessfulRun: null,
    lastScheduledDate: null,
    editorialTimezone: EDITORIAL_TIMEZONE,
    sources: {}
  };
  if (!raw || typeof raw !== "object") return empty;
  const record = raw as Record<string, unknown>;
  if (record.version === 2 && record.sources && typeof record.sources === "object") {
    return { ...empty, ...record, mode, editorialTimezone: EDITORIAL_TIMEZONE } as UpdateState;
  }
  for (const [id, hash] of Object.entries(record)) {
    if (typeof hash === "string") empty.sources[id] = { hash, checkedAt: "", status: 0, finalUrl: "" };
  }
  return empty;
}

export function stripHtml(input: string): string {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeTextForFingerprint(input: string): string {
  return stripHtml(input)
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?\b/g, "[datetime]")
    .replace(/\b\d{10,13}\b/g, "[timestamp]")
    .replace(/\b[0-9a-f]{24,}\b/gi, "[token]")
    .replace(/\b[A-Za-z0-9_-]{48,}\b/g, "[token]");
}

export function isLikelyBlockPage(input: string): boolean {
  return /request unsuccessful|incapsula incident|access denied|attention required.*cloudflare|verify you are human|captcha/i.test(input);
}

export interface DiscoveredLink {
  title: string;
  url: string;
  score: number;
}

export function discoverRelevantLinks(html: string, baseUrl: string, currentYear: number): DiscoveredLink[] {
  const englishKeywords = /\b(?:electric(?:ity)?|energy|renewables?|solar|wind|hydro|battery|storage|grid|tariffs?|fuel|diesel|gas|petroleum|power|laws?|regulation|regulatory|climate)\b/i;
  const arabicKeywords = /طاقة|كهرباء|نفط|غاز|قانون|تنظيم/i;
  const links = new Map<string, DiscoveredLink>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    try {
      const url = new URL(match[1]!, baseUrl);
      if (!/^https?:$/.test(url.protocol)) continue;
      if (/chrome-extension|moz-extension/i.test(url.href)) continue;
      url.hash = "";
      url.hostname = url.hostname.replace(/^www\./i, "");
      const title = stripHtml(match[2]!).slice(0, 180);
      if (/contact|about us|privacy|newsletter|room \d|corniche|اتصل بنا/i.test(title)) continue;
      const signal = `${title} ${url.pathname}`;
      let score = 0;
      if (englishKeywords.test(signal) || arabicKeywords.test(signal)) score += 3;
      if (new RegExp(`${currentYear}|${currentYear - 1}`).test(signal)) score += 2;
      if (/news|publication|decision|law|report|project|press|details|documents?/i.test(url.pathname)) score += 1;
      if (!title || score < 3) continue;
      const normalized = url.toString();
      const existing = links.get(normalized);
      if (!existing || score > existing.score) links.set(normalized, { title, url: normalized, score });
    } catch {
      // Ignore malformed page links; the parent retrieval remains valid evidence.
    }
  }
  return [...links.values()].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function briefingToMarkdown(briefing: IntelligenceBriefing): string {
  const bullets = (items: string[], empty: string) => items.length ? items.map((item) => `- ${item}`) : [empty];
  const lines = [
    "# Lebanon Energy Market Intelligence Briefing",
    "",
    `- Research cutoff: ${briefing.researchCutoff} (${briefing.editorialTimezone})`,
    `- Coverage: ${briefing.coveragePeriod.start} to ${briefing.coveragePeriod.end}`,
    `- Cadence: ${briefing.cadence}`,
    `- Quiet period: ${briefing.quietPeriod ? "Yes" : "No"}`,
    "",
    "## 1. Executive summary",
    "",
    ...(briefing.executiveSummary.length ? briefing.executiveSummary.map((item) => `- ${item}`) : ["No material verified development identified in the coverage period."]),
    "",
    "## 2. Top Lebanese stories and publication candidates",
    ""
  ];
  if (!briefing.candidates.length) lines.push("No publication candidate met the verification threshold.", "");
  for (const candidate of briefing.candidates) {
    lines.push(
      `### ${candidate.title}`,
      "",
      `${candidate.summary}`,
      "",
      `**Why it matters:** ${candidate.whyItMatters}`,
      "",
      `**Status / confidence:** ${candidate.status} / ${candidate.confidence}`,
      "",
      `**Lebanon relevance:** ${candidate.relevanceToLebanon}`,
      "",
      `**Source:** [${candidate.publisher}](${candidate.sourceUrl})`,
      "",
      `**What to watch:** ${candidate.analysis.whatToWatchNext}`,
      ""
    );
  }
  lines.push(
    "## 3. Electricity availability and market signals", "", ...bullets(briefing.sections.electricityAvailabilityAndMarketSignals, "No new comparable verified signal."), "",
    "## 4. Grid, EDL and energy security", "", ...bullets(briefing.sections.gridEdlAndEnergySecurity, "No material verified development."), "",
    "## 5. Distributed energy, storage and private generation", "", ...bullets(briefing.sections.distributedEnergyStorageAndPrivateGeneration, "No material verified development."), "",
    "## 6. Regulation and policy watch", ""
  );
  if (!briefing.sections.regulationAndPolicyWatch.length) lines.push("No material verified development.", "");
  briefing.sections.regulationAndPolicyWatch.forEach((item) => lines.push(`- **${item.legalStatus}:** ${item.development} ${item.significance} [Source](${item.sourceUrl})`, ""));
  lines.push("## 7. Projects, companies and investment", "");
  if (!briefing.sections.projectsCompaniesAndInvestment.length) lines.push("No material verified development.", "");
  briefing.sections.projectsCompaniesAndInvestment.forEach((item) => lines.push(`- **${item.projectStage}:** ${item.development} ${item.significance} [Source](${item.sourceUrl})`, ""));
  lines.push(
    "## 8. Regional developments with a Lebanon nexus", "", ...bullets(briefing.sections.regionalDevelopments, "No regional item met the Lebanon-relevance threshold."), "",
    "## 9. Material global developments", "", ...bullets(briefing.sections.globalDevelopments, "No global item met the Lebanon-relevance threshold."), "",
    "## 10. BESS and distributed-flexibility implications", "", ...bullets(briefing.sections.bessAndDistributedFlexibility, "No new evidence-based implication."), "",
    "## 11. Action-oriented takeaways", "", ...bullets(briefing.sections.actionTakeaways, "Maintain the current watchlist."), "",
    "## 12. Watchlist", ""
  );
  if (!briefing.watchlist.length) lines.push("No watchlist changes.", "");
  briefing.watchlist.forEach((item) => lines.push(`- **${item.issue}:** ${item.currentStatus}. Next signal: ${item.nextSignal}`, ""));
  lines.push("## 13. Data gaps and uncertainties", "");
  briefing.dataGaps.forEach((item) => lines.push(`- ${item}`));
  lines.push("", "## 14. Direct sources", "");
  if (!briefing.sourcesUsed.length) lines.push("No source supported a publishable development.", "");
  briefing.sourcesUsed.forEach((source) => lines.push(`- [${source.title}](${source.url}) — ${source.publisher}${source.publishedAt ? `, ${source.publishedAt}` : ""}`));
  lines.push("", "_Publication is automatic only for candidates that pass every deterministic high-confidence evidence gate._", "");
  return lines.join("\n");
}
