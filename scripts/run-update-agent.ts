import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { instruments, news, sources as atlasSources } from "../src/data/atlas";
import { legalDetails } from "../src/data/legal-details";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  EDITORIAL_TIMEZONE,
  intelligenceBriefingSchema,
  intelligenceSources,
  validateCandidateAgainstAtlas,
  type IntelligenceBriefing,
  type IntelligenceSource
} from "../src/data/intelligence";
import {
  briefingToMarkdown,
  computeCoverageStart,
  cutoffInBeirut,
  dateInBeirut,
  discoverRelevantLinks,
  isLikelyBlockPage,
  normalizeTextForFingerprint,
  normalizeState,
  stripHtml,
  type Cadence,
  type UpdateState
} from "./intelligence-core";
import { legalPublicationBriefingSchema, type LegalPublicationBriefing } from "./auto-publication-schema";

type Mode = "law" | "news";
type AtlasSource = (typeof atlasSources)[number];

interface EvidenceResult {
  id: string;
  title: string;
  publisher: string;
  url: string;
  finalUrl: string;
  sourceType: string;
  priority: number;
  topics: string[];
  status: number;
  ok: boolean;
  checkedAt: string;
  contentType: string;
  lastModified: string | null;
  hash: string | null;
  retrievalMethod: "html" | "pdf-text" | "binary";
  textLength: number;
  pageCount: number | null;
  change: "new" | "changed" | "unchanged" | "unavailable";
  excerpt: string;
  discoveredLinks: Array<{ title: string; url: string; score: number }>;
  error?: string;
}

async function extractPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
    pages.push(`[PDF page ${pageNumber}] ${text}`);
  }
  await loadingTask.destroy();
  return { text: pages.join("\n"), pageCount: pages.length };
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hostname = url.hostname.replace(/^www\./i, "");
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

function atlasSourceType(kind: AtlasSource["kind"]): IntelligenceSource["sourceType"] {
  if (kind === "law") return "official-law";
  if (kind === "regulator") return "official-decision";
  if (kind === "official-data") return "official-utility";
  if (["policy", "project"].includes(kind)) return "official-institution";
  return "institutional-research";
}

function sourceCatalog(mode: Mode): IntelligenceSource[] {
  const selectedAtlas = atlasSources.filter((source) => mode === "news" || ["law", "policy", "regulator"].includes(source.kind));
  const atlasMonitors: IntelligenceSource[] = selectedAtlas.map((source) => ({
    id: `atlas-${source.id}`,
    name: source.title,
    publisher: source.publisher,
    url: source.url,
    sourceType: atlasSourceType(source.kind),
    priority: ["law", "policy", "regulator", "official-data"].includes(source.kind) ? 1 : 2,
    geography: "Lebanon",
    topics: [source.kind],
    language: source.language,
    publicationPattern: "Atlas source verification"
  }));
  const extra = (process.env.INTELLIGENCE_EXTRA_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index): IntelligenceSource => ({
      id: `extra-${index + 1}`,
      name: `On-demand source ${index + 1}`,
      publisher: new URL(url).hostname,
      url,
      sourceType: "specialist-media",
      priority: 3,
      geography: "Lebanon",
      topics: ["on-demand"],
      language: "English",
      publicationPattern: "On-demand"
    }));
  const combined = mode === "news" ? [...intelligenceSources, ...atlasMonitors, ...extra] : [...intelligenceSources.filter((source)=>source.priority===1),...atlasMonitors, ...extra];
  const byUrl = new Map<string, IntelligenceSource>();
  combined.forEach((source) => { const key = canonicalUrl(source.url); if (!byUrl.has(key)) byUrl.set(key, source); });
  return [...byUrl.values()].sort((a, b) => a.priority - b.priority || a.publisher.localeCompare(b.publisher));
}

async function fetchEvidence(source: IntelligenceSource, previous: UpdateState): Promise<EvidenceResult> {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
      headers: { "user-agent": "Noa-Energy-Atlas-Research/3.0 (+https://noa-energy-atlas.netlify.app/)" }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const isPdf = /pdf/i.test(contentType) || buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    const isText = !isPdf && /(?:text|html|json|xml|javascript)/i.test(contentType);
    let text = isText ? buffer.toString("utf8") : "";
    let pageCount: number | null = null;
    let retrievalMethod: EvidenceResult["retrievalMethod"] = isText ? "html" : "binary";
    if (isPdf) {
      try {
        const extracted = await extractPdfText(buffer);
        text = extracted.text;
        pageCount = extracted.pageCount;
        retrievalMethod = "pdf-text";
      } catch {
        retrievalMethod = "binary";
      }
    }
    const semanticText = isText ? stripHtml(text) : text;
    const canonicalContent = text ? normalizeTextForFingerprint(semanticText) : buffer;
    const hash = createHash("sha256").update(canonicalContent).digest("hex");
    const oldHash = previous.sources[source.id]?.hash;
    const blocked = isText && isLikelyBlockPage(String(canonicalContent));
    const usable = response.ok && (text ? canonicalContent.length >= 80 && !blocked : !isPdf);
    return {
      id: source.id,
      title: source.name,
      publisher: source.publisher,
      url: source.url,
      finalUrl: response.url,
      sourceType: source.sourceType,
      priority: source.priority,
      topics: source.topics,
      status: response.status,
      ok: usable,
      checkedAt,
      contentType,
      lastModified: response.headers.get("last-modified"),
      hash,
      retrievalMethod,
      textLength: text.length,
      pageCount,
      change: !usable ? "unavailable" : !oldHash ? "new" : oldHash === hash ? "unchanged" : "changed",
      excerpt: text ? semanticText.slice(0, 12_000) : `[binary document: ${buffer.length} bytes]`,
      discoveredLinks: isText ? discoverRelevantLinks(text, response.url, Number.parseInt(dateInBeirut(new Date()).slice(0, 4), 10)).slice(0, 12) : [],
      ...(usable ? {} : { error: response.ok ? (blocked ? "bot-protection response; no source content retrieved" : "empty or non-semantic response body") : `HTTP ${response.status}` })
    };
  } catch (error) {
    return {
      id: source.id,
      title: source.name,
      publisher: source.publisher,
      url: source.url,
      finalUrl: source.url,
      sourceType: source.sourceType,
      priority: source.priority,
      topics: source.topics,
      status: 0,
      ok: false,
      checkedAt,
      contentType: "",
      lastModified: null,
      hash: null,
      retrievalMethod: "binary",
      textLength: 0,
      pageCount: null,
      change: "unavailable",
      excerpt: "",
      discoveredLinks: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function readJson(path: string): Promise<unknown> {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return null; }
}

function parseModelJson(value: string): unknown {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

async function generateBriefing(evidencePacket: Record<string, unknown>): Promise<IntelligenceBriefing | null> {
  if (hasFlag("--no-analysis")) return null;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!apiKey || !model) return null;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const mandate = await readFile(resolve("agents/lebanon-energy-market-intelligence.md"), "utf8");
  const memoryFiles = ["briefing-history.md", "watchlist.md", "source-preferences.md", "data-gaps.md", "assumption-register.md"];
  const memory = Object.fromEntries(await Promise.all(memoryFiles.map(async (name) => {
    try { return [name, await readFile(resolve("updates/memory", name), "utf8")]; } catch { return [name, ""]; }
  })));
  const boundedPacket=boundedEvidencePacket(evidencePacket,"news");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(120_000),
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${mandate}\nReturn only one JSON object that conforms exactly to the supplied schema. Use only URLs and facts present in the evidence packet. A quiet-period briefing with zero candidates is valid.` },
        { role: "user", content: JSON.stringify({
          evidencePacket:boundedPacket,
          memory,
          outputContract: {
            researchCutoff: "exact evidencePacket.researchCutoff",
            editorialTimezone: EDITORIAL_TIMEZONE,
            coveragePeriod: { start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
            cadence: "daily | twice-weekly | on-demand",
            quietPeriod: "boolean",
            executiveSummary: ["five to eight consequence-ordered points, or fewer in a quiet period"],
            candidates: [{
              id: "candidate-lowercase-slug", slug: "lowercase-slug", title: "string", summary: "string", whyItMatters: "string",
              eventDate: "YYYY-MM-DD or null", publishedAt: "YYYY-MM-DD", publisher: "string", sourceUrl: "verified retrieved URL",
              sourceType: "official-law | official-decision | official-institution | official-utility | multilateral | peer-reviewed | institutional-research | news-agency | specialist-media | company-disclosure",
              topics: ["string"], geography: "Lebanon | Levant | Eastern Mediterranean | Middle East | Global", relevanceToLebanon: "string",
              relatedLegalRecordIds: ["existing ins-* id"],
              corroboratingSources: [{ title: "string", publisher: "string", url: "verified retrieved URL", publishedAt: "YYYY-MM-DD or null", sourceType: "same sourceType enum" }],
              status: "Confirmed | Proposed | Under implementation | Disputed",
              confidence: "High | Medium | Low", lastVerifiedAt: "ISO datetime with offset", uncertainties: ["string"],
              correctionHistory: [{ date: "YYYY-MM-DD", change: "string", sourceUrl: "URL, optional" }],
              verification: { primarySourceRetrieved: true, sourceIdentityConfirmed: true, eventAndPublicationDatesSeparated: true, amendmentStatusChecked: true, implementationStatusChecked: true, articleOrPageLocators: ["article, section or PDF page locator"], contradictions: ["resolved conflict or explicit none identified"], verificationNotes: "methods, source hierarchy and remaining limits" },
              verifiedFacts: [{ claim: "string", sourceUrls: ["verified retrieved URL"] }],
              analysis: { firstOrderImpact: "string", secondOrderImplications: ["string"], affectedStakeholders: ["string"], whatToWatchNext: "string" },
              projectStage: "Announced | Proposed | Approved | Tendered | Awarded | Financed | Under construction | Commissioned | Operational | Suspended | Cancelled | Unknown | null",
              numericalClaims: [{ value: "number", unit: "string", measurementPeriod: "string", geographicCoverage: "string", evidenceClass: "observed | estimated | modeled | unofficial | anecdotal", comparisonPeriod: "string or null", limitations: "string", sourceUrl: "verified retrieved URL" }]
            }],
            sections: {
              electricityAvailabilityAndMarketSignals: ["verified signal with scope, period and limitations"],
              gridEdlAndEnergySecurity: ["string"],
              distributedEnergyStorageAndPrivateGeneration: ["string"],
              regulationAndPolicyWatch: [{ development: "string", legalStatus: "precise legal-status label", significance: "string", sourceUrl: "verified retrieved URL" }],
              projectsCompaniesAndInvestment: [{ development: "string", projectStage: "projectStage enum", significance: "string", sourceUrl: "verified retrieved URL" }],
              regionalDevelopments: ["two to five only when materially relevant; empty is valid"],
              globalDevelopments: ["no more than three and only when materially relevant"],
              bessAndDistributedFlexibility: ["practical implication without fictional market revenue"],
              actionTakeaways: ["five to ten actionable takeaways, or fewer in a quiet period"]
            },
            watchlist: [{ issue: "string", whyItMatters: "string", currentStatus: "string", nextSignal: "string", expectedDate: "YYYY-MM-DD or null", sourceToMonitor: "URL" }],
            dataGaps: ["string"],
            sourcesUsed: [{ title: "string", publisher: "string", url: "verified retrieved URL", publishedAt: "YYYY-MM-DD or null", sourceType: "sourceType enum" }]
          }
        }) }
      ]
    })
  });
  if (!response.ok) throw new Error(`Analysis provider returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Analysis provider returned no briefing content");
  return intelligenceBriefingSchema.parse(parseModelJson(content));
}

function boundedEvidencePacket(packet:Record<string,unknown>,mode:Mode){
  const sources=Array.isArray(packet.sources)?packet.sources as Array<Record<string,unknown>>:[];
  const bounded=sources
    .filter((source)=>source.ok===true&&(mode==="news"||source.priority===1))
    .sort((a,b)=>Number(a.priority)-Number(b.priority)||(a.change==="unchanged"?1:-1)-(b.change==="unchanged"?1:-1))
    .slice(0,mode==="news"?36:20)
    .map((source)=>({...source,excerpt:String(source.excerpt||"").slice(0,mode==="news"?5500:8000),discoveredLinks:Array.isArray(source.discoveredLinks)?source.discoveredLinks.slice(0,5):[]}));
  return {...packet,sources:bounded,contextPolicy:{freshJob:true,sourceLimit:bounded.length,excerptCharacters:mode==="news"?5500:8000,chatHistoryUsed:false}};
}

async function generateLegalBriefing(evidencePacket:Record<string,unknown>):Promise<LegalPublicationBriefing|null>{
  const apiKey=process.env.AI_API_KEY,model=process.env.AI_MODEL;
  if(!apiKey||!model)return null;
  const baseUrl=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
  const mandate=await readFile(resolve("agents/law-update.md"),"utf8");
  const boundedPacket=boundedEvidencePacket(evidencePacket,"law");
  const response=await fetch(`${baseUrl}/chat/completions`,{
    method:"POST",signal:AbortSignal.timeout(120_000),headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body:JSON.stringify({model,temperature:0,response_format:{type:"json_object"},messages:[
      {role:"system",content:`${mandate}\nYou are running in a fresh isolated publication job. Use only priority-one official sources successfully retrieved in this evidence packet. Return one JSON object only. A quiet period with no candidates is preferred to any uncertain claim. Every candidate must be High confidence, complete in English and Arabic, and backed by a controlling primary source with exact article or PDF-page locators.`},
      {role:"user",content:JSON.stringify({evidencePacket:boundedPacket,outputContract:{researchCutoff:"exact evidencePacket.researchCutoff",researchCutoffIso:"exact evidencePacket.researchCutoffIso",editorialTimezone:"Asia/Beirut",coveragePeriod:"exact evidencePacket.coveragePeriod",quietPeriod:"boolean",candidates:[{id:"legal-lowercase-slug",action:"add | update",instrument:"complete Instrument object using existing id for update or new ins-* id for add",instrumentAr:"complete Arabic title, shortTitle, summary, whyItMatters",legalDetail:"complete bilingual professional dossier with nature, provisions, watch, scope, engineering, economics, implementation, verification",source:"controlling source without id/accessedAt; kind must be law, policy, regulator or official-data",claim:"claim without id/sourceIds/asOf plus textAr and optional caveatAr",relationships:"zero to eight relationships without id/sourceIds plus labelAr; endpoints must exist or be the candidate instrument",effectiveDate:"YYYY-MM-DD",changeSummary:"English",changeSummaryAr:"Arabic",confidence:"High",verification:{primarySourceRetrieved:true,sourceIdentityConfirmed:true,eventAndPublicationDatesSeparated:true,amendmentStatusChecked:true,implementationStatusChecked:true,articleOrPageLocators:["exact locator"],contradictions:["resolved conflict or none identified"],verificationNotes:"method and limits"},correctionHistory:[]}]}})}
    ]})
  });
  if(!response.ok)throw new Error(`Legal analysis provider returned HTTP ${response.status}: ${(await response.text()).slice(0,500)}`);
  const payload=await response.json() as {choices?:Array<{message?:{content?:string}}>};const content=payload.choices?.[0]?.message?.content;
  if(!content)throw new Error("Legal analysis provider returned no content");
  return legalPublicationBriefingSchema.parse(parseModelJson(content));
}

async function appendMemory(briefing: IntelligenceBriefing) {
  const stamp = briefing.coveragePeriod.end;
  const history = briefing.candidates.length
    ? briefing.candidates.map((item) => `- ${item.title} — ${item.status}, ${item.confidence}; ${item.sourceUrl}`).join("\n")
    : "- Quiet period: no candidate met the publication threshold.";
  await Promise.all([
    writeFile(resolve("updates/memory/briefing-history.md"), `\n## ${stamp}\n\n${history}\n`, { flag: "a" }),
    writeFile(resolve("updates/memory/watchlist.md"), `\n## ${stamp}\n\n${briefing.watchlist.map((item) => `- ${item.issue}: ${item.currentStatus}; next: ${item.nextSignal}`).join("\n") || "- No change."}\n`, { flag: "a" }),
    writeFile(resolve("updates/memory/data-gaps.md"), `\n## ${stamp}\n\n${briefing.dataGaps.map((item) => `- ${item}`).join("\n") || "- No new gap recorded."}\n`, { flag: "a" })
  ]);
}

async function main() {
  const mode = argument("--mode") as Mode | undefined;
  if (!mode || !["law", "news"].includes(mode)) throw new Error("Use --mode law or --mode news");
  const cadence = (argument("--cadence") ?? (mode === "news" ? "twice-weekly" : "on-demand")) as Cadence;
  if (!["daily", "twice-weekly", "on-demand"].includes(cadence)) throw new Error("Invalid cadence");
  const lookbackValue = argument("--lookback-days");
  const lookbackDays = lookbackValue ? Number.parseInt(lookbackValue, 10) : undefined;
  if (lookbackDays !== undefined && (!Number.isFinite(lookbackDays) || lookbackDays < 1)) throw new Error("--lookback-days must be a positive integer");

  await Promise.all(["updates/state", "updates/pending-state", "updates/research", "updates/candidates", "updates/memory"].map((dir) => mkdir(resolve(dir), { recursive: true })));
  const statePath = resolve(`updates/state/${mode}.json`);
  const previous = normalizeState(await readJson(statePath), mode);
  const now = new Date();
  const coverage = { start: computeCoverageStart(now, cadence, previous.lastSuccessfulRun, lookbackDays), end: dateInBeirut(now) };
  const catalog = sourceCatalog(mode);
  const concurrency = Math.max(1, Math.min(10, Number.parseInt(process.env.INTELLIGENCE_FETCH_CONCURRENCY ?? "6", 10) || 6));
  const primaryEvidence = await mapConcurrent(catalog, concurrency, (source) => fetchEvidence(source, previous));
  const knownUrls = new Set(catalog.map((source) => canonicalUrl(source.url)));
  const discoveredCatalog = mode === "news" || mode === "law"
    ? primaryEvidence
        .filter((parent)=>mode==="news"||parent.priority===1)
        .flatMap((parent) => parent.discoveredLinks.slice(0, 5).map((link) => ({ parent, link })))
        .sort((a, b) => b.link.score - a.link.score)
        .filter(({ link }) => {
          const key = canonicalUrl(link.url);
          if (knownUrls.has(key)) return false;
          knownUrls.add(key);
          return true;
        })
        .slice(0, mode==="news"?24:16)
        .map(({ parent, link }): IntelligenceSource => ({
          id: `discovered-${createHash("sha1").update(link.url).digest("hex").slice(0, 12)}`,
          name: link.title,
          publisher: parent.publisher,
          url: link.url,
          sourceType: parent.sourceType as IntelligenceSource["sourceType"],
          priority: parent.priority as 1 | 2 | 3,
          geography: "Lebanon",
          topics: [...parent.topics, "current-discovery"],
          language: "English",
          publicationPattern: `Discovered from ${parent.title}`
        }))
    : [];
  const discoveredEvidence = await mapConcurrent(discoveredCatalog, concurrency, (source) => fetchEvidence(source, previous));
  const evidence = [...primaryEvidence, ...discoveredEvidence];
  const successful = evidence.filter((item) => item.ok);
  const material = evidence.filter((item) => item.change === "new" || item.change === "changed");
  const cutoff = cutoffInBeirut(now);
  const packet = {
    version: 2,
    mode,
    cadence,
    editorialTimezone: EDITORIAL_TIMEZONE,
    researchCutoff: cutoff,
    researchCutoffIso: now.toISOString(),
    coveragePeriod: coverage,
    guardrails: {
      publication: "strict-high-confidence-auto-publication",
      evidence: "Use only successfully retrieved sources in this packet; keep facts, analysis, uncertainty and scenarios distinct.",
      relevance: "Lebanon first; regional or global items require a material Lebanon transmission channel."
    },
    atlasContext: {
      legalRecords: instruments.map(({ id, title, status }) => ({ id, title, status })),
      publishedNews: news.map(({ slug, date, title }) => ({ slug, date, title }))
    },
    retrievalSummary: { seedSources: catalog.length, discoveredSources: discoveredCatalog.length, attempted: evidence.length, successful: successful.length, materialChanges: material.length, unavailable: evidence.length - successful.length },
    sources: evidence
  };
  await writeFile(resolve(`updates/research/${mode}-evidence.json`), `${JSON.stringify(packet, null, 2)}\n`);

  const legalAudit = mode === "law" ? instruments.map((instrument) => {
    const detail = legalDetails[instrument.id];
    const records = instrument.sourceIds.map((id) => atlasSources.find((source) => source.id === id)).filter((source): source is AtlasSource => Boolean(source));
    const officialRecords = records.filter((source) => !["research", "event"].includes(source.kind));
    const retrieved = evidence.filter((item) => records.some((source) => canonicalUrl(source.url) === canonicalUrl(item.url) || canonicalUrl(source.url) === canonicalUrl(item.finalUrl)) && item.ok);
    const retrievedOfficial = retrieved.filter((item) => officialRecords.some((source) => canonicalUrl(source.url) === canonicalUrl(item.url) || canonicalUrl(source.url) === canonicalUrl(item.finalUrl)));
    const blockers: string[] = [];
    if (!detail) blockers.push("missing legal dossier");
    if (!detail?.scopeEn || !detail.scopeAr || !detail.engineeringEn?.length || !detail.engineeringAr?.length || !detail.economicsEn?.length || !detail.economicsAr?.length || !detail.implementationEn?.length || !detail.implementationAr?.length || !detail.verificationEn || !detail.verificationAr) blockers.push("incomplete bilingual professional analysis");
    if (!officialRecords.length) blockers.push("no authoritative primary or institutional source assigned");
    if (!retrievedOfficial.length) blockers.push("authoritative source not retrieved in this run");
    if (retrievedOfficial.some((item) => /pdf/i.test(item.contentType) && item.retrievalMethod !== "pdf-text")) blockers.push("official PDF lacks semantic text extraction");
    if (retrievedOfficial.some((item) => item.change === "changed")) blockers.push("changed official text requires article/page locator comparison and amendment review");
    return {
      id: instrument.id,
      title: instrument.title,
      legalStatus: instrument.status,
      lastReviewed: instrument.lastReviewed,
      sourceRecords: records.map(({ id, title, publisher, url, kind }) => ({ id, title, publisher, url, kind })),
      officialSourceCount: officialRecords.length,
      retrievedOfficialSourceCount: retrievedOfficial.length,
      semanticPdfSources: retrievedOfficial.filter((item) => item.retrievalMethod === "pdf-text").map((item) => ({ url: item.finalUrl, pageCount: item.pageCount, textLength: item.textLength, sha256: item.hash })),
      amendmentStatusCheckRequired: ["In force", "Under implementation", "Operational programme", "Draft"].includes(instrument.status),
      implementationStatusCheckRequired: true,
      disposition: blockers.length ? "blocked-pending-expert-verification" : "ready-for-expert-review",
      blockers
    };
  }) : [];
  if (mode === "law") await writeFile(resolve("updates/candidates/law-verification.json"), `${JSON.stringify({ researchCutoff: cutoff, publication: "strict-high-confidence-auto-publication", protocolVersion: 4, records: legalAudit }, null, 2)}\n`);

  const nextState: UpdateState = { version: 2, mode, lastSuccessfulRun: successful.length ? now.toISOString() : previous.lastSuccessfulRun, lastScheduledDate: dateInBeirut(now), editorialTimezone: EDITORIAL_TIMEZONE, sources: { ...previous.sources } };
  evidence.forEach((item) => {
    if (item.ok && item.hash) nextState.sources[item.id] = { hash: item.hash, checkedAt: item.checkedAt, status: item.status, finalUrl: item.finalUrl };
  });
  await writeFile(resolve(`updates/pending-state/${mode}.json`), `${JSON.stringify(nextState, null, 2)}\n`);

  let briefing: IntelligenceBriefing | null = null;
  let analysisFailure: Error | null = null;
  let analysisMessage = "Structured analysis was not run because no analysis provider is configured. Automatic publication is blocked for this run.";
  if (mode === "news") {
    try {
      briefing = await generateBriefing(packet);
      if (briefing) {
        const liveUrls = new Set(successful.flatMap((item) => [item.url, item.finalUrl]));
        const legalIds = new Set(instruments.map((item) => item.id));
        const slugs = new Set(news.map((item) => item.slug));
        const errors = briefing.candidates.flatMap((candidate) => [
          ...validateCandidateAgainstAtlas(candidate, legalIds, slugs),
          ...(!liveUrls.has(candidate.sourceUrl) ? [`candidate source was not retrieved in this run: ${candidate.sourceUrl}`] : []),
          ...candidate.corroboratingSources.filter((source) => !liveUrls.has(source.url)).map((source) => `corroborating source was not retrieved in this run: ${source.url}`),
          ...candidate.verifiedFacts.flatMap((fact) => fact.sourceUrls.filter((url) => !liveUrls.has(url)).map((url) => `fact source was not retrieved in this run: ${url}`))
        ]);
        errors.push(
          ...briefing.sourcesUsed.filter((source) => !liveUrls.has(source.url)).map((source) => `source-list URL was not retrieved in this run: ${source.url}`),
          ...briefing.sections.regulationAndPolicyWatch.filter((item) => !liveUrls.has(item.sourceUrl)).map((item) => `regulation source was not retrieved in this run: ${item.sourceUrl}`),
          ...briefing.sections.projectsCompaniesAndInvestment.filter((item) => !liveUrls.has(item.sourceUrl)).map((item) => `project source was not retrieved in this run: ${item.sourceUrl}`)
        );
        if (errors.length) throw new Error(`Briefing rejected:\n- ${errors.join("\n- ")}`);
        if (briefing.researchCutoff !== cutoff || briefing.coveragePeriod.start !== coverage.start || briefing.coveragePeriod.end !== coverage.end || briefing.cadence !== cadence) {
          throw new Error("Briefing rejected: run metadata does not match the evidence packet");
        }
        await writeFile(resolve("updates/candidates/news.json"), `${JSON.stringify(briefing, null, 2)}\n`);
        await writeFile(resolve("updates/candidates/news-briefing.md"), briefingToMarkdown(briefing));
        await appendMemory(briefing);
        analysisMessage = `${briefing.candidates.length} normalized publication candidate(s) passed validation.`;
      } else analysisFailure = new Error(analysisMessage);
    } catch (error) {
      analysisMessage = error instanceof Error ? error.message : String(error);
      analysisFailure = error instanceof Error ? error : new Error(String(error));
    }
  }
  if(mode==="law"){
    try{
      const legalBriefing=await generateLegalBriefing(packet);
      if(legalBriefing){
        if(legalBriefing.researchCutoff!==cutoff||legalBriefing.researchCutoffIso!==now.toISOString()||legalBriefing.coveragePeriod.start!==coverage.start||legalBriefing.coveragePeriod.end!==coverage.end)throw new Error("Legal briefing rejected: run metadata does not match the evidence packet");
        const liveUrls=new Set(successful.flatMap((item)=>[canonicalUrl(item.url),canonicalUrl(item.finalUrl)]));
        const knownIds=new Set(instruments.map((item)=>item.id));const errors:string[]=[];
        for(const candidate of legalBriefing.candidates){
          if(!liveUrls.has(canonicalUrl(candidate.source.url)))errors.push(`${candidate.id}: controlling source was not retrieved in this run`);
          if(candidate.action==="update"&&!knownIds.has(candidate.instrument.id))errors.push(`${candidate.id}: update targets unknown instrument`);
          if(candidate.action==="add"&&knownIds.has(candidate.instrument.id))errors.push(`${candidate.id}: add collides with existing instrument`);
          const record=successful.find((item)=>[item.url,item.finalUrl].some((url)=>canonicalUrl(url)===canonicalUrl(candidate.source.url)));
          if(!record||record.priority!==1)errors.push(`${candidate.id}: controlling source is not priority one`);
          if(!["law","policy","regulator","official-data"].includes(candidate.source.kind))errors.push(`${candidate.id}: controlling source kind is not publishable`);
        }
        if(errors.length)throw new Error(`Legal briefing rejected:\n- ${errors.join("\n- ")}`);
        await writeFile(resolve("updates/candidates/law.json"),`${JSON.stringify(legalBriefing,null,2)}\n`);
        analysisMessage=`${legalBriefing.candidates.length} high-confidence legal publication candidate(s) passed controlling-source validation.`;
      } else analysisFailure = new Error(analysisMessage);
    }catch(error){analysisMessage=error instanceof Error?error.message:String(error);analysisFailure=error instanceof Error?error:new Error(String(error))}
  }

  const candidateMarkdown = [
    `# ${mode === "news" ? "Market intelligence" : "Legal source"} review queue`,
    "",
    `- Research cutoff: ${cutoff} (${EDITORIAL_TIMEZONE})`,
    `- Coverage: ${coverage.start} to ${coverage.end}`,
    `- Sources checked: ${evidence.length}`,
    `- Sources retrieved: ${successful.length}`,
    `- New or changed fingerprints: ${material.length}`,
    ...(mode === "law" ? [`- Legal dossiers audited: ${legalAudit.length}`, `- Ready for expert review: ${legalAudit.filter((item) => item.disposition === "ready-for-expert-review").length}`, `- Blocked pending expert verification: ${legalAudit.filter((item) => item.disposition !== "ready-for-expert-review").length}`] : []),
    "",
    "## Analysis status",
    "",
    analysisMessage,
    "",
    "## Source changes requiring review",
    "",
    ...(material.length ? material.map((item) => `- **${item.change}:** [${item.title}](${item.finalUrl}) — ${item.publisher}`) : ["No source fingerprint changed in this run."]),
    "",
    "## Retrieval issues",
    "",
    ...(evidence.some((item) => !item.ok) ? evidence.filter((item) => !item.ok).map((item) => `- [${item.title}](${item.url}): ${item.error ?? "unavailable"}`) : ["None."]),
    ...(mode === "law" ? ["", "## Legal verification gates", "", ...legalAudit.filter((item) => item.blockers.length).map((item) => `- **${item.title}:** ${item.blockers.join("; ")}`)] : []),
    "",
    "_Only candidates that pass the deterministic high-confidence publication gate can modify the production Atlas ledger._",
    ""
  ].join("\n");
  await writeFile(resolve(`updates/candidates/${mode}.md`), candidateMarkdown);
  if (analysisFailure) throw new Error(`${mode === "news" ? "News" : "Legal"} structured analysis failed: ${analysisFailure.message}`);
  console.log(JSON.stringify({ mode, cadence, cutoff, coverage, attempted: evidence.length, successful: successful.length, changed: material.length, briefingCandidates: briefing?.candidates.length ?? 0 }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
