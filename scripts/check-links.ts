import { instruments, news, sources } from "../src/data/atlas";
const bad:string[]=[];
for(const item of [...instruments.map((x)=>`/instruments/${x.slug}/`),...news.map((x)=>`/updates/#${x.slug}`)])if(!item.startsWith("/"))bad.push(item);
for(const source of sources){try{const url=new URL(source.url);if(url.protocol!=="https:")bad.push(source.url)}catch{bad.push(source.url)}}
if(bad.length){console.error(`Invalid links:\n${bad.join("\n")}`);process.exit(1)}
console.log(`Checked ${instruments.length+news.length} internal routes and ${sources.length} source URLs.`);
