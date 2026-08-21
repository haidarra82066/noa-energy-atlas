import { atlasSchema } from "../src/data/schema";
import { claims, instruments, metrics, news, relationships, reports, sources, CONTENT_CUTOFF } from "../src/data/atlas";
import { legalDetails } from "../src/data/legal-details";
import { claimAr, instrumentAr, relationshipAr, statusAr } from "../src/data/localization";
import automatedPublications from "../src/data/automated-publications.json";
import { automatedPublicationSchema } from "./auto-publication-schema";

const atlas={sources,claims,instruments,relationships,metrics,news,reports};
atlasSchema.parse(atlas);
const automated=automatedPublicationSchema.parse(automatedPublications);
const errors:string[]=[];
const assertUnique=(name:string,values:string[])=>{const seen=new Set<string>();for(const value of values){if(seen.has(value))errors.push(`${name}: duplicate ${value}`);seen.add(value)}};
assertUnique("source id",sources.map((x)=>x.id));
assertUnique("claim id",claims.map((x)=>x.id));
assertUnique("instrument id",instruments.map((x)=>x.id));
assertUnique("instrument slug",instruments.map((x)=>x.slug));
assertUnique("relationship id",relationships.map((x)=>x.id));
assertUnique("metric id",metrics.map((x)=>x.id));
assertUnique("news id",news.map((x)=>x.id));
const sourceIds=new Set(sources.map((x)=>x.id)); const claimIds=new Set(claims.map((x)=>x.id)); const instrumentIds=new Set(instruments.map((x)=>x.id));
const checkSources=(owner:string,ids:string[])=>ids.forEach((id)=>{if(!sourceIds.has(id))errors.push(`${owner}: missing source ${id}`)});
claims.forEach((x)=>{checkSources(x.id,x.sourceIds);if(!claimAr[x.id])errors.push(`${x.id}: missing Arabic claim localization`)});
instruments.forEach((x)=>{checkSources(x.id,x.sourceIds);x.claimIds.forEach((id)=>{if(!claimIds.has(id))errors.push(`${x.id}: missing claim ${id}`)});if(x.lastReviewed>CONTENT_CUTOFF)errors.push(`${x.id}: reviewed after cutoff`);const detail=legalDetails[x.id];if(!detail)errors.push(`${x.id}: missing legal dossier`);else if(!detail.scopeEn||!detail.scopeAr||!detail.engineeringEn?.length||!detail.engineeringAr?.length||!detail.economicsEn?.length||!detail.economicsAr?.length||!detail.implementationEn?.length||!detail.implementationAr?.length||!detail.verificationEn||!detail.verificationAr)errors.push(`${x.id}: incomplete bilingual professional dossier`);if(!instrumentAr[x.id])errors.push(`${x.id}: missing Arabic localization`);if(!statusAr[x.status])errors.push(`${x.id}: missing Arabic status`)});
relationships.forEach((x)=>{checkSources(x.id,x.sourceIds);if(!instrumentIds.has(x.from)||!instrumentIds.has(x.to))errors.push(`${x.id}: missing endpoint`);if(x.from===x.to)errors.push(`${x.id}: self relationship`);if(!relationshipAr[x.id])errors.push(`${x.id}: missing Arabic relationship`)});
metrics.forEach((x)=>checkSources(x.id,x.sourceIds));
news.forEach((x)=>{checkSources(x.id,x.sourceIds);x.instrumentIds.forEach((id)=>{if(!instrumentIds.has(id))errors.push(`${x.id}: missing instrument ${id}`)});if(x.date>CONTENT_CUTOFF)errors.push(`${x.id}: published after cutoff`)});
reports.forEach((x)=>checkSources(x.id,x.sourceIds));
sources.forEach((x)=>{if(x.publishedAt&&x.publishedAt>CONTENT_CUTOFF)errors.push(`${x.id}: published after cutoff`);if(!x.url.startsWith("https://"))errors.push(`${x.id}: source URL must use https`)});
const versionIds=new Set<string>();
for(const version of automated.legalVersions){
  if(versionIds.has(version.versionId))errors.push(`legal version: duplicate ${version.versionId}`);versionIds.add(version.versionId);
  if(!instrumentIds.has(version.instrumentId))errors.push(`${version.versionId}: missing instrument ${version.instrumentId}`);
  checkSources(version.versionId,version.controllingSourceIds);
  if(version.supersedesVersionId&&!automated.legalVersions.some((candidate)=>candidate.versionId===version.supersedesVersionId&&candidate.instrumentId===version.instrumentId))errors.push(`${version.versionId}: invalid supersession chain`);
}
for(const status of automated.statusHistory){if(!instrumentIds.has(status.instrumentId))errors.push(`status history: missing ${status.instrumentId}`);checkSources(`status history ${status.instrumentId}`,status.sourceIds)}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Validated ${sources.length} sources, ${claims.length} claims, ${instruments.length} instruments, ${relationships.length} relationships, ${metrics.length} metrics, ${news.length} updates and ${reports.length} reports.`);
