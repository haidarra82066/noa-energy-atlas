import { appendFile, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { instruments, news, sources } from "../src/data/atlas";
import { intelligenceBriefingSchema, validateCandidateAgainstAtlas, type NormalizedNewsCandidate } from "../src/data/intelligence";
import { automatedPublicationSchema, legalPublicationBriefingSchema, type AutomatedPublication } from "./auto-publication-schema";

type Mode="news"|"law";
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]};
const mode=arg("--mode") as Mode|undefined;
if(!mode||!["news","law"].includes(mode))throw new Error("Use --mode news or --mode law");

const canonical=(value:string)=>{const url=new URL(value);url.hash="";url.hostname=url.hostname.replace(/^www\./i,"");return url.toString()};
const stableId=(prefix:string,value:string)=>`${prefix}${createHash("sha256").update(value).digest("hex").slice(0,14)}`;
const unique=<T>(items:T[])=>[...new Set(items)];
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Beirut",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const now=new Date().toISOString();
const publicationPath=resolve("src/data/automated-publications.json");
const current=automatedPublicationSchema.parse(JSON.parse(await readFile(publicationPath,"utf8"))) as AutomatedPublication;
const before=JSON.stringify(current);
const allSources=[...sources,...current.sources];
const allInstruments=[...instruments,...current.instruments,...current.instrumentUpdates];

type Evidence={url:string;finalUrl:string;ok:boolean;priority:number;sourceType:string};
const evidencePacket=JSON.parse(await readFile(resolve(`updates/research/${mode}-evidence.json`),"utf8")) as {researchCutoff:string;researchCutoffIso:string;sources:Evidence[]};
const evidenceByUrl=new Map<string,Evidence>();
for(const item of evidencePacket.sources||[])if(item.ok){evidenceByUrl.set(canonical(item.url),item);evidenceByUrl.set(canonical(item.finalUrl),item)}

function atlasKind(sourceType:string){
  if(sourceType==="official-law")return "law" as const;
  if(sourceType==="official-decision")return "regulator" as const;
  if(sourceType==="official-utility")return "official-data" as const;
  if(["official-institution","multilateral"].includes(sourceType))return "policy" as const;
  if(sourceType==="company-disclosure")return "project" as const;
  return "research" as const;
}

function ensureSource(input:{title:string;publisher:string;url:string;publishedAt:string|null;sourceType?:string;kind?:"law"|"policy"|"regulator"|"official-data"|"research"|"project"|"event";language?:"English"|"Arabic"|"French"},note:string){
  const existing=allSources.find((source)=>canonical(source.url)===canonical(input.url));
  if(existing)return existing.id;
  const id=stableId("src-auto-",canonical(input.url));
  if(!current.sources.some((source)=>source.id===id))current.sources.push({id,title:input.title,publisher:input.publisher,url:input.url,publishedAt:input.publishedAt,accessedAt:now,language:input.language||"English",kind:input.kind||atlasKind(input.sourceType||"institutional-research"),note});
  return id;
}

const decisions:Array<Record<string,unknown>>=[];
let published=0;

if(mode==="news"){
  const briefing=intelligenceBriefingSchema.parse(JSON.parse(await readFile(resolve("updates/candidates/news.json"),"utf8")));
  if(briefing.researchCutoff!==evidencePacket.researchCutoff)throw new Error("Refusing stale news candidates: research cutoff does not match this evidence run");
  const legalIds=new Set(allInstruments.map((item)=>item.id));
  const publishedSlugs=new Set([...news,...current.news].map((item)=>item.slug));
  for(const candidate of briefing.candidates){
    const reasons=publicationReasons(candidate,evidenceByUrl,legalIds,publishedSlugs);
    if(reasons.length){decisions.push({candidateId:candidate.id,disposition:"rejected",reasons});continue}
    const sourceInputs=[{title:candidate.title,publisher:candidate.publisher,url:candidate.sourceUrl,publishedAt:candidate.publishedAt,sourceType:candidate.sourceType},...candidate.corroboratingSources];
    const sourceIds=unique(sourceInputs.map((source)=>ensureSource(source,`Automatically published from the ${briefing.researchCutoff} verified evidence run.`)));
    current.news.push({id:`news-auto-${candidate.slug}`,slug:candidate.slug,date:candidate.eventDate||candidate.publishedAt,title:candidate.title,summary:candidate.summary,significance:candidate.whyItMatters,sourceIds,instrumentIds:candidate.relatedLegalRecordIds,tags:unique(candidate.topics.map((tag)=>tag.toLowerCase()))});
    for(const correction of candidate.correctionHistory)current.correctionHistory.push({recordId:`news-auto-${candidate.slug}`,...correction});
    publishedSlugs.add(candidate.slug);published++;
    decisions.push({candidateId:candidate.id,recordId:`news-auto-${candidate.slug}`,disposition:"published",sourceIds,verification:candidate.verification});
  }
}else{
  const briefing=legalPublicationBriefingSchema.parse(JSON.parse(await readFile(resolve("updates/candidates/law.json"),"utf8")));
  if(briefing.researchCutoffIso!==evidencePacket.researchCutoffIso)throw new Error("Refusing stale legal candidates: evidence run id does not match");
  const ids=new Set(allInstruments.map((item)=>item.id));
  for(const candidate of briefing.candidates){
    const retrieved=evidenceByUrl.get(canonical(candidate.source.url));
    const reasons:string[]=[];
    if(!retrieved)reasons.push("controlling source was not retrieved successfully in this run");
    if(retrieved&&retrieved.priority!==1)reasons.push("controlling source is not priority-one evidence");
    if(!["law","policy","regulator","official-data"].includes(candidate.source.kind))reasons.push("source is not controlling or official primary evidence");
    if(candidate.action==="add"&&ids.has(candidate.instrument.id))reasons.push("add action collides with an existing instrument id");
    if(candidate.action==="update"&&!ids.has(candidate.instrument.id))reasons.push("update action targets an unknown instrument id");
    for(const relation of candidate.relationships){if(!ids.has(relation.from)&&relation.from!==candidate.instrument.id)reasons.push(`unknown relationship endpoint: ${relation.from}`);if(!ids.has(relation.to)&&relation.to!==candidate.instrument.id)reasons.push(`unknown relationship endpoint: ${relation.to}`)}
    if(reasons.length){decisions.push({candidateId:candidate.id,disposition:"rejected",reasons});continue}
    const sourceId=ensureSource({...candidate.source,sourceType:retrieved!.sourceType},`Controlling source for automated legal publication ${candidate.id}; verified at ${briefing.researchCutoff}.`);
    const claimId=stableId("clm-auto-",`${candidate.instrument.id}:${candidate.effectiveDate}:${candidate.claim.text}`);
    if(!current.claims.some((claim)=>claim.id===claimId))current.claims.push({id:claimId,text:candidate.claim.text,sourceIds:[sourceId],asOf:candidate.effectiveDate,evidenceType:candidate.claim.evidenceType,confidence:"high",precision:candidate.claim.precision,...(candidate.claim.caveat?{caveat:candidate.claim.caveat}:{})});
    current.claimAr[claimId]={text:candidate.claim.textAr,...(candidate.claim.caveatAr?{caveat:candidate.claim.caveatAr}:{})};
    const existing=allInstruments.find((item)=>item.id===candidate.instrument.id);const previousDetail=current.legalDetails[candidate.instrument.id]||null;
    const instrument={...candidate.instrument,sourceIds:unique([...(existing?.sourceIds||[]),sourceId]),claimIds:unique([...(existing?.claimIds||[]),claimId]),lastReviewed:today};
    if(candidate.action==="add"){current.instruments.push(instrument);ids.add(instrument.id)}else{
      current.instrumentUpdates=current.instrumentUpdates.filter((item)=>item.id!==instrument.id);current.instrumentUpdates.push(instrument);
    }
    current.legalDetails[instrument.id]=candidate.legalDetail;
    current.instrumentAr[instrument.id]=candidate.instrumentAr;
    for(const relation of candidate.relationships){
      const id=stableId("rel-auto-",`${relation.from}:${relation.type}:${relation.to}`);
      if(current.relationships.some((item)=>item.id===id))continue;
      current.relationships.push({...relation,id,sourceIds:[sourceId]});current.relationshipAr[id]=relation.labelAr;
    }
    if(!existing||existing.status!==instrument.status)current.statusHistory.push({instrumentId:instrument.id,from:existing?.status||null,to:instrument.status,effectiveDate:candidate.effectiveDate,recordedAt:now,sourceIds:[sourceId],summary:candidate.changeSummary});
    const previousVersion=[...current.legalVersions].reverse().find((version)=>version.instrumentId===instrument.id);
    const versionPayload={instrument,legalDetail:candidate.legalDetail,instrumentAr:candidate.instrumentAr,claim:candidate.claim,relationships:candidate.relationships};
    current.legalVersions.push({versionId:stableId("ver-",`${instrument.id}:${candidate.effectiveDate}:${JSON.stringify(versionPayload)}`),instrumentId:instrument.id,supersedesVersionId:previousVersion?.versionId||null,effectiveDate:candidate.effectiveDate,recordedAt:now,controllingSourceIds:[sourceId],contentHash:createHash("sha256").update(JSON.stringify(versionPayload)).digest("hex"),before:existing?{instrument:existing,legalDetail:previousDetail}:null,after:versionPayload,consolidatedText:{sourceUrl:candidate.source.url,asOf:candidate.effectiveDate,trackingStatus:candidate.source.kind==="law"?"official-version-record":"no-consolidated-text-available"},translationReview:{reviewerType:"automated",reviewerId:"noa-legal-publication-agent",method:"source-constrained bilingual generation with deterministic completeness checks",reviewedAt:now}});
    for(const correction of candidate.correctionHistory)current.correctionHistory.push({recordId:instrument.id,...correction});
    published++;decisions.push({candidateId:candidate.id,recordId:instrument.id,disposition:"published",sourceIds:[sourceId],verification:candidate.verification});
  }
}

const parsed=automatedPublicationSchema.parse(current);
const changed=JSON.stringify(parsed)!==before;
const publicationId=changed?createHash("sha256").update(`${mode}:${now}:${JSON.stringify(parsed)}`).digest("hex").slice(0,20):"";
if(changed){const temp=`${publicationPath}.tmp`;await writeFile(temp,`${JSON.stringify(parsed,null,2)}\n`);await rename(temp,publicationPath);await writeFile(resolve("public/deployment-marker.json"),`${JSON.stringify({publicationId,mode,publishedAt:now,publishedRecords:published},null,2)}\n`)}

const ledgerPath=resolve(`updates/publication-ledger-${mode}.jsonl`);
if(decisions.length)await appendFile(ledgerPath,decisions.map((decision)=>JSON.stringify({runAt:now,mode,...decision})).join("\n")+"\n");
const githubOutput=arg("--github-output");
if(githubOutput)await appendFile(resolve(githubOutput),`public_changed=${changed}\npublished_count=${published}\npublication_id=${publicationId}\n`);
console.log(JSON.stringify({mode,publicChanged:changed,publicationId,published,rejected:decisions.filter((item)=>item.disposition==="rejected").length},null,2));

function publicationReasons(candidate:NormalizedNewsCandidate,evidence:Map<string,Evidence>,legalIds:Set<string>,slugs:Set<string>){
  const reasons=validateCandidateAgainstAtlas(candidate,legalIds,slugs);
  if(candidate.confidence!=="High")reasons.push("confidence is not High");
  if(!["Confirmed","Under implementation"].includes(candidate.status))reasons.push("status is not publishable");
  if(!candidate.verification.primarySourceRetrieved||!candidate.verification.sourceIdentityConfirmed)reasons.push("primary-source verification is incomplete");
  if(!candidate.verification.articleOrPageLocators.length)reasons.push("source locator is missing");
  const urls=[candidate.sourceUrl,...candidate.corroboratingSources.map((source)=>source.url),...candidate.verifiedFacts.flatMap((fact)=>fact.sourceUrls)];
  for(const url of urls)if(!evidence.has(canonical(url)))reasons.push(`evidence URL was not retrieved in this run: ${url}`);
  if(candidate.topics.some((topic)=>/law|regulat|policy/i.test(topic))&&!['official-law','official-decision','official-institution'].includes(candidate.sourceType))reasons.push("legal or policy news lacks a controlling official primary source");
  return unique(reasons);
}
