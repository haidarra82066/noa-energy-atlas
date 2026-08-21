import { describe, expect, it } from "vitest";
import { atlasSchema } from "../src/data/schema";
import { claims, instruments, metrics, news, relationships, reports, sources } from "../src/data/atlas";

describe("Atlas content",()=>{
  it("matches the typed schema",()=>expect(()=>atlasSchema.parse({sources,claims,instruments,relationships,metrics,news,reports})).not.toThrow());
  it("has no orphan relationships",()=>{const ids=new Set(instruments.map((x)=>x.id));expect(relationships.every((x)=>ids.has(x.from)&&ids.has(x.to))).toBe(true)});
  it("distinguishes future scenarios from observed data",()=>{expect(metrics.filter((x)=>Number.parseInt(x.period,10)>2026).every((x)=>x.precision==="scenario"||x.evidenceType==="official-policy")).toBe(true)});
  it("keeps source ids resolvable",()=>{const ids=new Set(sources.map((x)=>x.id));const refs=[...claims,...instruments,...metrics,...news,...reports,...relationships].flatMap((x)=>x.sourceIds);expect(refs.every((id)=>ids.has(id))).toBe(true)});
});
