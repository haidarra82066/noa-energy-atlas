import { z } from "zod";

export const EDITORIAL_TIMEZONE = "Asia/Beirut";

export const intelligenceStatusSchema = z.enum([
  "Confirmed",
  "Proposed",
  "Under implementation",
  "Disputed",
  "Unverified"
]);

export const intelligenceConfidenceSchema = z.enum(["High", "Medium", "Low"]);

export const intelligenceSourceTypeSchema = z.enum([
  "official-law",
  "official-decision",
  "official-institution",
  "official-utility",
  "multilateral",
  "peer-reviewed",
  "institutional-research",
  "news-agency",
  "specialist-media",
  "company-disclosure"
]);

export const intelligenceGeographySchema = z.enum([
  "Lebanon",
  "Levant",
  "Eastern Mediterranean",
  "Middle East",
  "Global"
]);

export const projectStageSchema = z.enum([
  "Announced",
  "Proposed",
  "Approved",
  "Tendered",
  "Awarded",
  "Financed",
  "Under construction",
  "Commissioned",
  "Operational",
  "Suspended",
  "Cancelled",
  "Unknown"
]);

export const corroboratingSourceSchema = z.object({
  title: z.string().min(5),
  publisher: z.string().min(2),
  url: z.string().url(),
  publishedAt: z.string().date().nullable(),
  sourceType: intelligenceSourceTypeSchema
});

export const correctionEntrySchema = z.object({
  date: z.string().date(),
  change: z.string().min(8),
  sourceUrl: z.string().url().optional()
});

export const normalizedNewsCandidateSchema = z.object({
  id: z.string().regex(/^candidate-[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(12),
  summary: z.string().min(40),
  whyItMatters: z.string().min(40),
  eventDate: z.string().date().nullable(),
  publishedAt: z.string().date(),
  publisher: z.string().min(2),
  sourceUrl: z.string().url(),
  sourceType: intelligenceSourceTypeSchema,
  topics: z.array(z.string().min(2)).min(1),
  geography: intelligenceGeographySchema,
  relevanceToLebanon: z.string().min(30),
  relatedLegalRecordIds: z.array(z.string().regex(/^ins-/)),
  corroboratingSources: z.array(corroboratingSourceSchema),
  status: intelligenceStatusSchema,
  confidence: intelligenceConfidenceSchema,
  lastVerifiedAt: z.string().datetime({ offset: true }),
  uncertainties: z.array(z.string().min(8)),
  correctionHistory: z.array(correctionEntrySchema),
  verification: z.object({
    primarySourceRetrieved: z.literal(true),
    sourceIdentityConfirmed: z.literal(true),
    eventAndPublicationDatesSeparated: z.literal(true),
    amendmentStatusChecked: z.literal(true),
    implementationStatusChecked: z.literal(true),
    articleOrPageLocators: z.array(z.string().min(3)).min(1),
    contradictions: z.array(z.string().min(8)),
    verificationNotes: z.string().min(30)
  }),
  verifiedFacts: z.array(z.object({
    claim: z.string().min(15),
    sourceUrls: z.array(z.string().url()).min(1)
  })).min(1),
  analysis: z.object({
    firstOrderImpact: z.string().min(25),
    secondOrderImplications: z.array(z.string().min(20)),
    affectedStakeholders: z.array(z.string().min(2)).min(1),
    whatToWatchNext: z.string().min(20)
  }),
  projectStage: projectStageSchema.nullable(),
  numericalClaims: z.array(z.object({
    value: z.number(),
    unit: z.string().min(1),
    measurementPeriod: z.string().min(4),
    geographicCoverage: z.string().min(2),
    evidenceClass: z.enum(["observed", "estimated", "modeled", "unofficial", "anecdotal"]),
    comparisonPeriod: z.string().nullable(),
    limitations: z.string().min(8),
    sourceUrl: z.string().url()
  }))
});

export const intelligenceBriefingSchema = z.object({
  researchCutoff: z.string().min(10),
  editorialTimezone: z.literal(EDITORIAL_TIMEZONE),
  coveragePeriod: z.object({ start: z.string().date(), end: z.string().date() }),
  cadence: z.enum(["daily", "twice-weekly", "on-demand"]),
  quietPeriod: z.boolean(),
  executiveSummary: z.array(z.string().min(20)).max(8),
  candidates: z.array(normalizedNewsCandidateSchema),
  sections: z.object({
    electricityAvailabilityAndMarketSignals: z.array(z.string().min(20)),
    gridEdlAndEnergySecurity: z.array(z.string().min(20)),
    distributedEnergyStorageAndPrivateGeneration: z.array(z.string().min(20)),
    regulationAndPolicyWatch: z.array(z.object({
      development: z.string().min(15),
      legalStatus: z.string().min(5),
      significance: z.string().min(20),
      sourceUrl: z.string().url()
    })),
    projectsCompaniesAndInvestment: z.array(z.object({
      development: z.string().min(15),
      projectStage: projectStageSchema,
      significance: z.string().min(20),
      sourceUrl: z.string().url()
    })),
    regionalDevelopments: z.array(z.string().min(20)).max(5),
    globalDevelopments: z.array(z.string().min(20)).max(3),
    bessAndDistributedFlexibility: z.array(z.string().min(20)),
    actionTakeaways: z.array(z.string().min(15)).max(10)
  }),
  watchlist: z.array(z.object({
    issue: z.string().min(8),
    whyItMatters: z.string().min(15),
    currentStatus: z.string().min(5),
    nextSignal: z.string().min(8),
    expectedDate: z.string().date().nullable(),
    sourceToMonitor: z.string().url()
  })),
  dataGaps: z.array(z.string().min(10)),
  sourcesUsed: z.array(corroboratingSourceSchema)
});

export type NormalizedNewsCandidate = z.infer<typeof normalizedNewsCandidateSchema>;
export type IntelligenceBriefing = z.infer<typeof intelligenceBriefingSchema>;

export interface IntelligenceSource {
  id: string;
  name: string;
  publisher: string;
  url: string;
  sourceType: z.infer<typeof intelligenceSourceTypeSchema>;
  priority: 1 | 2 | 3;
  geography: z.infer<typeof intelligenceGeographySchema>;
  topics: string[];
  language: "Arabic" | "English" | "French";
  publicationPattern: string;
  note?: string;
}

export const intelligenceSources: IntelligenceSource[] = [
  { id:"monitor-official-gazette", name:"Lebanese Official Gazette", publisher:"Presidency of the Council of Ministers - Official Gazette", url:"https://jo.pcm.gov.lb/", sourceType:"official-law", priority:1, geography:"Lebanon", topics:["laws","decrees","decisions","official-gazette"], language:"Arabic", publicationPattern:"Official issues and legal-text index" },
  { id:"monitor-libnor", name:"LIBNOR standards catalogue", publisher:"Lebanese Standards Institution", url:"https://libnor.gov.lb/ViewCatalogs.aspx?language=en", sourceType:"official-institution", priority:1, geography:"Lebanon", topics:["standards","solar","electrical","energy-efficiency"], language:"English", publicationPattern:"National standards catalogue and technical committees" },
  { id:"monitor-moew", name:"Ministry of Energy and Water", publisher:"Ministry of Energy and Water", url:"https://www.energyandwater.gov.lb/", sourceType:"official-institution", priority:1, geography:"Lebanon", topics:["electricity","regulation","fuel","renewables"], language:"Arabic", publicationPattern:"Decisions and announcements" },
  { id:"monitor-edl", name:"Electricité du Liban", publisher:"Electricité du Liban", url:"https://www.edl.gov.lb/", sourceType:"official-utility", priority:1, geography:"Lebanon", topics:["electricity-supply","tariffs","grid","fuel"], language:"English", publicationPattern:"Operational notices and utility records" },
  { id:"monitor-cabinet", name:"Presidency of the Council of Ministers", publisher:"Presidency of the Council of Ministers", url:"https://www.pcm.gov.lb/", sourceType:"official-decision", priority:1, geography:"Lebanon", topics:["cabinet-decisions","appointments","projects"], language:"Arabic", publicationPattern:"Cabinet decisions" },
  { id:"monitor-parliament", name:"Lebanese Parliament", publisher:"Lebanese Parliament", url:"https://www.lp.gov.lb/", sourceType:"official-law", priority:1, geography:"Lebanon", topics:["legislation","committee-action","electricity"], language:"Arabic", publicationPattern:"Laws and parliamentary records" },
  { id:"monitor-lcec", name:"Lebanese Center for Energy Conservation", publisher:"Lebanese Center for Energy Conservation", url:"https://lcec.org.lb/", sourceType:"official-institution", priority:1, geography:"Lebanon", topics:["distributed-energy","solar","efficiency","standards"], language:"English", publicationPattern:"Programme, policy and market updates" },
  { id:"monitor-lpa", name:"Lebanese Petroleum Administration", publisher:"Lebanese Petroleum Administration", url:"https://www.lpa.gov.lb/", sourceType:"official-institution", priority:1, geography:"Lebanon", topics:["petroleum","gas","licensing","offshore"], language:"English", publicationPattern:"Licensing, legal and operational records" },
  { id:"monitor-nna", name:"National News Agency - Lebanon", publisher:"National News Agency", url:"https://www.nna-leb.gov.lb/en/", sourceType:"news-agency", priority:2, geography:"Lebanon", topics:["government","infrastructure","energy-security"], language:"English", publicationPattern:"Daily national reporting", note:"Use for discovery; verify consequential claims with the responsible institution." },
  { id:"monitor-undp", name:"UNDP Lebanon publications", publisher:"United Nations Development Programme", url:"https://www.undp.org/lebanon/publications", sourceType:"multilateral", priority:2, geography:"Lebanon", topics:["investment","distributed-energy","climate","projects"], language:"English", publicationPattern:"Project and research publications" },
  { id:"monitor-worldbank", name:"World Bank - Lebanon", publisher:"World Bank", url:"https://www.worldbank.org/en/country/lebanon", sourceType:"multilateral", priority:2, geography:"Lebanon", topics:["project-finance","grid","reform"], language:"English", publicationPattern:"Project documents and financing decisions" },
  { id:"monitor-unfccc", name:"UNFCCC - Lebanon", publisher:"UNFCCC", url:"https://unfccc.int/node/61011", sourceType:"multilateral", priority:2, geography:"Lebanon", topics:["climate-policy","ndc","transparency"], language:"English", publicationPattern:"National submissions and technical reviews" },
  { id:"monitor-aub-ifi", name:"AUB Issam Fares Institute energy policy programme", publisher:"AUB Issam Fares Institute", url:"https://www.aub.edu.lb/ifi/Pages/energy-policy-and-security.aspx", sourceType:"institutional-research", priority:3, geography:"Lebanon", topics:["distributed-energy","policy","energy-security"], language:"English", publicationPattern:"Research, projects and policy publications", note:"Keep survey and modeled evidence distinct from official totals." },
  { id:"monitor-iea-oil", name:"IEA oil market indicators", publisher:"International Energy Agency", url:"https://www.iea.org/energy-system/fuels/oil", sourceType:"multilateral", priority:3, geography:"Global", topics:["oil-prices","fuel-security"], language:"English", publicationPattern:"Current oil indicators and monthly report links", note:"Include only when the import-price or supply transmission to Lebanon is material." }
];

export const sourceHierarchy: Record<IntelligenceSource["sourceType"], number> = {
  "official-law": 1,
  "official-decision": 2,
  "official-institution": 3,
  "official-utility": 4,
  multilateral: 5,
  "peer-reviewed": 6,
  "institutional-research": 7,
  "news-agency": 8,
  "specialist-media": 9,
  "company-disclosure": 10
};

export function validateCandidateAgainstAtlas(candidate: NormalizedNewsCandidate, legalRecordIds: Set<string>, publishedSlugs: Set<string>) {
  const errors: string[] = [];
  if (publishedSlugs.has(candidate.slug)) errors.push(`duplicate published slug: ${candidate.slug}`);
  candidate.relatedLegalRecordIds.forEach((id) => { if (!legalRecordIds.has(id)) errors.push(`unknown legal record: ${id}`); });
  if (candidate.geography !== "Lebanon" && candidate.relevanceToLebanon.length < 50) errors.push("regional/global candidate lacks a substantive Lebanon nexus");
  if (candidate.status === "Unverified") errors.push("unverified information cannot be ingested as a public candidate");
  if (candidate.confidence === "High" && !["official-law","official-decision","official-institution","official-utility","multilateral"].includes(candidate.sourceType)) errors.push("high confidence requires an authoritative source class");
  const evidenceUrls = new Set([candidate.sourceUrl, ...candidate.corroboratingSources.map((source) => source.url)]);
  const publishers = new Set([candidate.publisher.trim().toLowerCase(), ...candidate.corroboratingSources.map((source) => source.publisher.trim().toLowerCase())]);
  const legalPrimary = ["official-law", "official-decision"].includes(candidate.sourceType);
  if (candidate.confidence === "High" && !legalPrimary && publishers.size < 2) errors.push("high-confidence market or project claims require independent corroboration");
  if (candidate.topics.some((topic) => /law|regulat|licen|tariff|decree/i.test(topic)) && candidate.relatedLegalRecordIds.length === 0) errors.push("legal or regulatory candidate lacks a related Atlas legal record");
  candidate.verifiedFacts.forEach((fact) => fact.sourceUrls.forEach((url) => { if (!evidenceUrls.has(url)) errors.push(`verified fact cites a URL outside the candidate evidence set: ${url}`); }));
  if (new Date(candidate.lastVerifiedAt).getTime() < new Date(`${candidate.publishedAt}T00:00:00Z`).getTime()) errors.push("last verification predates publication");
  candidate.numericalClaims.forEach((claim) => {
    if (!candidate.verifiedFacts.some((fact) => fact.sourceUrls.includes(claim.sourceUrl))) errors.push(`numerical claim lacks a verified fact source: ${claim.sourceUrl}`);
  });
  return errors;
}
