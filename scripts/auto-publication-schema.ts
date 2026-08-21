import { z } from "zod";
import { claimSchema, instrumentSchema, relationshipSchema, sourceSchema } from "../src/data/schema";

export const legalDetailSchema = z.object({
  natureEn:z.string().min(12), natureAr:z.string().min(8),
  provisionsEn:z.array(z.string().min(12)).min(2), provisionsAr:z.array(z.string().min(8)).min(2),
  watchEn:z.string().min(20), watchAr:z.string().min(12),
  scopeEn:z.string().min(12), scopeAr:z.string().min(8),
  engineeringEn:z.array(z.string().min(12)).min(2), engineeringAr:z.array(z.string().min(8)).min(2),
  economicsEn:z.array(z.string().min(12)).min(2), economicsAr:z.array(z.string().min(8)).min(2),
  implementationEn:z.array(z.string().min(8)).min(2), implementationAr:z.array(z.string().min(6)).min(2),
  verificationEn:z.string().min(20), verificationAr:z.string().min(12)
});

export const localizedInstrumentSchema = z.object({
  title:z.string().min(5), shortTitle:z.string().min(2), summary:z.string().min(20), whyItMatters:z.string().min(20)
});

const verificationSchema=z.object({
  primarySourceRetrieved:z.literal(true),
  sourceIdentityConfirmed:z.literal(true),
  eventAndPublicationDatesSeparated:z.literal(true),
  amendmentStatusChecked:z.literal(true),
  implementationStatusChecked:z.literal(true),
  articleOrPageLocators:z.array(z.string().min(3)).min(1),
  contradictions:z.array(z.string().min(3)).min(1),
  verificationNotes:z.string().min(40)
});

export const legalPublicationCandidateSchema=z.object({
  id:z.string().regex(/^legal-[a-z0-9-]+$/),
  action:z.enum(["add","update"]),
  instrument:instrumentSchema,
  instrumentAr:localizedInstrumentSchema,
  legalDetail:legalDetailSchema,
  source:sourceSchema.omit({id:true,accessedAt:true}),
  claim:claimSchema.omit({id:true,sourceIds:true,asOf:true}).extend({ textAr:z.string().min(12), caveatAr:z.string().optional() }),
  relationships:z.array(relationshipSchema.omit({id:true,sourceIds:true}).extend({labelAr:z.string().min(3)})).max(8),
  effectiveDate:z.string().date(),
  changeSummary:z.string().min(30),
  changeSummaryAr:z.string().min(20),
  confidence:z.literal("High"),
  verification:verificationSchema,
  correctionHistory:z.array(z.object({date:z.string().date(),change:z.string().min(8),sourceUrl:z.string().url().optional()})).default([])
});

export const legalPublicationBriefingSchema=z.object({
  researchCutoff:z.string().min(10),
  researchCutoffIso:z.string().datetime(),
  editorialTimezone:z.literal("Asia/Beirut"),
  coveragePeriod:z.object({start:z.string().date(),end:z.string().date()}),
  quietPeriod:z.boolean(),
  candidates:z.array(legalPublicationCandidateSchema).max(12)
}).superRefine((value,ctx)=>{
  if(value.quietPeriod&&value.candidates.length)ctx.addIssue({code:z.ZodIssueCode.custom,message:"quiet period cannot contain candidates"});
});

export type LegalPublicationBriefing=z.infer<typeof legalPublicationBriefingSchema>;
export type LegalPublicationCandidate=z.infer<typeof legalPublicationCandidateSchema>;

export const statusHistoryEntrySchema=z.object({
  instrumentId:z.string().regex(/^ins-/), from:z.string().nullable(), to:z.string(), effectiveDate:z.string().date(),
  recordedAt:z.string().datetime(), sourceIds:z.array(z.string().regex(/^src-/)).min(1), summary:z.string().min(12)
});

export const correctionHistoryEntrySchema=z.object({
  recordId:z.string(), date:z.string().date(), change:z.string().min(8), sourceUrl:z.string().url().optional()
});

export const automatedPublicationSchema=z.object({
  version:z.literal(1),
  sources:z.array(sourceSchema),
  claims:z.array(claimSchema),
  instruments:z.array(instrumentSchema),
  instrumentUpdates:z.array(instrumentSchema),
  relationships:z.array(relationshipSchema),
  news:z.array(z.object({id:z.string().regex(/^news-/),slug:z.string(),date:z.string().date(),title:z.string(),summary:z.string(),significance:z.string(),sourceIds:z.array(z.string()),instrumentIds:z.array(z.string()),tags:z.array(z.string())})),
  legalDetails:z.record(legalDetailSchema),
  instrumentAr:z.record(localizedInstrumentSchema),
  claimAr:z.record(z.object({text:z.string().min(12),caveat:z.string().optional()})),
  relationshipAr:z.record(z.string().min(3)),
  statusHistory:z.array(statusHistoryEntrySchema),
  legalVersions:z.array(z.object({
    versionId:z.string().regex(/^ver-/),instrumentId:z.string().regex(/^ins-/),supersedesVersionId:z.string().regex(/^ver-/).nullable(),effectiveDate:z.string().date(),recordedAt:z.string().datetime(),
    controllingSourceIds:z.array(z.string().regex(/^src-/)).min(1),contentHash:z.string().regex(/^[0-9a-f]{64}$/),before:z.unknown().nullable(),after:z.unknown(),
    consolidatedText:z.object({sourceUrl:z.string().url(),asOf:z.string().date(),trackingStatus:z.enum(["official-consolidated-text","official-version-record","no-consolidated-text-available"])}),
    translationReview:z.object({reviewerType:z.literal("automated"),reviewerId:z.literal("noa-legal-publication-agent"),method:z.string().min(12),reviewedAt:z.string().datetime()})
  })),
  correctionHistory:z.array(correctionHistoryEntrySchema)
});

export type AutomatedPublication=z.infer<typeof automatedPublicationSchema>;
