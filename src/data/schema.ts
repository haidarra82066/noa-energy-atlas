import { z } from "zod";

export const precisionSchema = z.enum(["exact", "rounded", "estimate", "scenario", "range"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const evidenceTypeSchema = z.enum([
  "law",
  "official-policy",
  "official-data",
  "regulatory-action",
  "modeled-result",
  "survey-result",
  "interview-result",
  "secondary-analysis",
  "event"
]);

export const sourceSchema = z.object({
  id: z.string().regex(/^src-/),
  title: z.string().min(5),
  publisher: z.string().min(2),
  url: z.string().url(),
  publishedAt: z.string().date().nullable(),
  accessedAt: z.string().datetime({ offset: true }),
  language: z.enum(["English", "Arabic", "French"]),
  kind: z.enum(["law", "policy", "regulator", "official-data", "research", "project", "event"]),
  archivedUrl: z.string().url().optional(),
  note: z.string().optional()
});

export const claimSchema = z.object({
  id: z.string().regex(/^clm-/),
  text: z.string().min(12),
  sourceIds: z.array(z.string().regex(/^src-/)).min(1),
  asOf: z.string().date(),
  evidenceType: evidenceTypeSchema,
  confidence: confidenceSchema,
  precision: precisionSchema,
  caveat: z.string().optional()
});

export const instrumentSchema = z.object({
  id: z.string().regex(/^ins-/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(5),
  shortTitle: z.string().min(2),
  year: z.number().int().min(1950).max(2035),
  jurisdiction: z.enum(["Lebanon", "International"]),
  category: z.enum(["Electricity", "Renewables", "Climate", "Petroleum", "Finance", "Institutions"]),
  status: z.enum(["In force", "Under implementation", "Operational programme", "Draft", "Policy", "Voluntary commitment", "Project", "Superseded", "Expired", "Historic law"]),
  summary: z.string().min(30),
  whyItMatters: z.string().min(30),
  sourceIds: z.array(z.string().regex(/^src-/)).min(1),
  claimIds: z.array(z.string().regex(/^clm-/)).default([]),
  lastReviewed: z.string().date()
});

export const relationshipSchema = z.object({
  id: z.string().regex(/^rel-/),
  from: z.string().regex(/^ins-/),
  to: z.string().regex(/^ins-/),
  type: z.enum(["implements", "amends", "enables", "governs", "sets-target-for", "finances", "operationalizes", "informs"]),
  label: z.string().min(3),
  sourceIds: z.array(z.string().regex(/^src-/)).min(1)
});

export const metricSchema = z.object({
  id: z.string().regex(/^met-/),
  label: z.string().min(3),
  value: z.number(),
  unit: z.string().min(1),
  period: z.string().min(4),
  segment: z.string().min(2),
  precision: precisionSchema,
  evidenceType: evidenceTypeSchema,
  sourceIds: z.array(z.string().regex(/^src-/)).min(1),
  note: z.string().optional()
});

export const newsItemSchema = z.object({
  id: z.string().regex(/^news-/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  date: z.string().date(),
  title: z.string().min(8),
  summary: z.string().min(25),
  significance: z.string().min(25),
  sourceIds: z.array(z.string().regex(/^src-/)).min(1),
  instrumentIds: z.array(z.string().regex(/^ins-/)).default([]),
  tags: z.array(z.string()).min(1)
});

export const reportSchema = z.object({
  id: z.string().regex(/^rep-/),
  title: z.string().min(8),
  publisher: z.string().min(2),
  year: z.number().int(),
  method: z.string().min(20),
  usefulFor: z.string().min(20),
  limits: z.string().min(20),
  evidenceClass: z.enum(["official-scenario", "policy-brief", "voluntary-commitment", "modeled-analysis", "conceptual-study"]),
  sourceIds: z.array(z.string().regex(/^src-/)).min(1)
});

export const atlasSchema = z.object({
  sources: z.array(sourceSchema),
  claims: z.array(claimSchema),
  instruments: z.array(instrumentSchema),
  relationships: z.array(relationshipSchema),
  metrics: z.array(metricSchema),
  news: z.array(newsItemSchema),
  reports: z.array(reportSchema)
});

export type Source = z.infer<typeof sourceSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Instrument = z.infer<typeof instrumentSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type Metric = z.infer<typeof metricSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Report = z.infer<typeof reportSchema>;
