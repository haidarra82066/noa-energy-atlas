import { execFileSync } from "node:child_process";
const from=process.env.CACHED_COMMIT_REF,to=process.env.COMMIT_REF;
if(!from||!to)process.exit(1);
const changed=execFileSync("git",["diff","--name-only",from,to],{encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
const affectsSite=changed.some((file)=>/^(src\/|public\/|package(?:-lock)?\.json$|astro\.config\.mjs$|netlify\.toml$)/.test(file));
console.log(affectsSite?"Production input changed; building.":"Operational state only; skipping Netlify build.");
process.exit(affectsSite?1:0);
