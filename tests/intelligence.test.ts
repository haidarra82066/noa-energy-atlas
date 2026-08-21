import { describe, expect, it } from "vitest";
import { instruments, news } from "../src/data/atlas";
import {
  EDITORIAL_TIMEZONE,
  intelligenceBriefingSchema,
  normalizedNewsCandidateSchema,
  sourceHierarchy,
  validateCandidateAgainstAtlas
} from "../src/data/intelligence";
import { computeCoverageStart, dateInBeirut, discoverRelevantLinks, isLikelyBlockPage, normalizeState, normalizeTextForFingerprint, stripHtml } from "../scripts/intelligence-core";
import automatedPublications from "../src/data/automated-publications.json";
import { automatedPublicationSchema } from "../scripts/auto-publication-schema";

const candidate = normalizedNewsCandidateSchema.parse({
  id: "candidate-era-secondary-rules",
  slug: "era-secondary-rules-published",
  title: "Electricity regulator publishes secondary market rules",
  summary: "The regulator published a defined package of secondary rules governing electricity-sector procedures in Lebanon.",
  whyItMatters: "The rules would narrow the implementation gap between the statutory framework and executable market procedures.",
  eventDate: "2026-08-15",
  publishedAt: "2026-08-15",
  publisher: "Ministry of Energy and Water",
  sourceUrl: "https://www.energyandwater.gov.lb/example",
  sourceType: "official-decision",
  topics: ["electricity", "regulation"],
  geography: "Lebanon",
  relevanceToLebanon: "The decision directly governs electricity-sector institutions and participants in Lebanon.",
  relatedLegalRecordIds: ["ins-law-462", "ins-era"],
  corroboratingSources: [],
  status: "Confirmed",
  confidence: "High",
  lastVerifiedAt: "2026-08-16T10:00:00+03:00",
  uncertainties: ["Implementation timing remains subject to follow-up decisions."],
  correctionHistory: [],
  verification: {
    primarySourceRetrieved: true,
    sourceIdentityConfirmed: true,
    eventAndPublicationDatesSeparated: true,
    amendmentStatusChecked: true,
    implementationStatusChecked: true,
    articleOrPageLocators: ["Decision, operative section 2"],
    contradictions: ["No material contradiction identified in the retrieved official record."],
    verificationNotes: "The responsible ministry record was retrieved and checked against the current Atlas legal framework."
  },
  verifiedFacts: [{ claim: "The official decision was published by the responsible ministry.", sourceUrls: ["https://www.energyandwater.gov.lb/example"] }],
  analysis: {
    firstOrderImpact: "It establishes procedures needed for regulatory execution.",
    secondOrderImplications: ["Market participants can begin assessing compliance requirements."],
    affectedStakeholders: ["ERA", "EDL", "developers"],
    whatToWatchNext: "Effective dates, implementation circulars and the first licensing decisions."
  },
  projectStage: null,
  numericalClaims: []
});

describe("Lebanon energy intelligence contract", () => {
  it("keeps authoritative sources above media", () => {
    expect(sourceHierarchy["official-law"]).toBeLessThan(sourceHierarchy["news-agency"]);
    expect(sourceHierarchy.multilateral).toBeLessThan(sourceHierarchy["specialist-media"]);
  });

  it("validates a normalized briefing with exact run metadata", () => {
    expect(() => intelligenceBriefingSchema.parse({
      researchCutoff: "Sunday, 16 August 2026 at 13:00:00 GMT+3",
      editorialTimezone: EDITORIAL_TIMEZONE,
      coveragePeriod: { start: "2026-08-12", end: "2026-08-16" },
      cadence: "twice-weekly",
      quietPeriod: false,
      executiveSummary: ["A verified regulatory development warrants an editorial publication candidate."],
      candidates: [candidate],
      sections: {
        electricityAvailabilityAndMarketSignals: [],
        gridEdlAndEnergySecurity: [],
        distributedEnergyStorageAndPrivateGeneration: [],
        regulationAndPolicyWatch: [],
        projectsCompaniesAndInvestment: [],
        regionalDevelopments: [],
        globalDevelopments: [],
        bessAndDistributedFlexibility: [],
        actionTakeaways: []
      },
      watchlist: [],
      dataGaps: ["The effective implementation timetable is not yet available."],
      sourcesUsed: []
    })).not.toThrow();
  });

  it("rejects duplicate, unverified and unknown-law candidates", () => {
    const invalid = { ...candidate, slug: news[0]!.slug, status: "Unverified" as const, relatedLegalRecordIds: ["ins-unknown"] };
    const errors = validateCandidateAgainstAtlas(invalid, new Set(instruments.map((item) => item.id)), new Set(news.map((item) => item.slug)));
    expect(errors.join(" ")).toContain("duplicate");
    expect(errors.join(" ")).toContain("unknown legal record");
    expect(errors.join(" ")).toContain("unverified information");
  });

  it("rejects high-confidence market claims without an independent publisher", () => {
    const invalid = { ...candidate, sourceType: "official-institution" as const, topics: ["project-finance"], relatedLegalRecordIds: [] };
    expect(validateCandidateAgainstAtlas(invalid, new Set(instruments.map((item) => item.id)), new Set()).join(" ")).toContain("independent corroboration");
  });

  it("rejects verified facts that cite outside the declared evidence set", () => {
    const invalid = { ...candidate, verifiedFacts: [{ claim: "A material official action was published.", sourceUrls: ["https://unlisted.example/fact"] }] };
    expect(validateCandidateAgainstAtlas(invalid, new Set(instruments.map((item) => item.id)), new Set()).join(" ")).toContain("outside the candidate evidence set");
  });

  it("requires an article or page locator in the verification record", () => {
    expect(() => normalizedNewsCandidateSchema.parse({ ...candidate, verification: { ...candidate.verification, articleOrPageLocators: [] } })).toThrow();
  });

  it("uses a minimum Beirut-local coverage window and migrates old state", () => {
    const now = new Date("2026-08-16T10:00:00Z");
    expect(dateInBeirut(now)).toBe("2026-08-16");
    expect(computeCoverageStart(now, "twice-weekly", null)).toBe("2026-08-12");
    expect(computeCoverageStart(now, "on-demand", "2026-01-01T00:00:00Z")).toBe("2026-08-11");
    expect(computeCoverageStart(now, "on-demand", null, 30)).toBe("2026-08-11");
    expect(normalizeState({ source: "abc" }, "news").sources.source?.hash).toBe("abc");
  });

  it("validates the isolated automated production ledger",()=>{
    expect(()=>automatedPublicationSchema.parse(automatedPublications)).not.toThrow();
  });

  it("removes scripts and markup before evidence excerpts", () => {
    expect(stripHtml("<style>x</style><h1>Decision &amp; notice</h1><script>bad()</script>")).toBe("Decision & notice");
    expect(normalizeTextForFingerprint("Decision 1723824000000 token aabbccddeeffaabbccddeeffaa")).toBe("Decision [timestamp] token [token]");
    expect(isLikelyBlockPage("Request unsuccessful. Incapsula incident ID: 123")).toBe(true);
  });

  it("discovers relevant current links while ignoring unrelated navigation", () => {
    const html = '<a href="/about">About us</a><a href="/news/2026-electricity-grid-decision">Lebanon electricity grid decision</a>';
    expect(discoverRelevantLinks(html, "https://example.gov.lb/", 2026)).toEqual([
      expect.objectContaining({ title: "Lebanon electricity grid decision", url: "https://example.gov.lb/news/2026-electricity-grid-decision" })
    ]);
  });
});
