import { access, readFile } from "node:fs/promises";
const required=["dist/index.html","dist/instruments/index.html","dist/market/index.html","dist/evidence/index.html","dist/offline/index.html","dist/sw.js","dist/manifest.webmanifest","dist/sitemap.xml"];
for(const file of required)await access(file);
const html=await readFile("dist/index.html","utf8");
for(const marker of ["<main","Skip to content","manifest.webmanifest"])if(!html.includes(marker))throw new Error(`Post-build verification: missing ${marker}`);
console.log(`Post-build verified ${required.length} required outputs.`);
