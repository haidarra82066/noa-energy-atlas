import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const mode=process.argv.includes("--mode")?process.argv[process.argv.indexOf("--mode")+1]:undefined;
if(!mode||!["news","law"].includes(mode))throw new Error("Use --mode news or --mode law");
const pending=resolve(`updates/pending-state/${mode}.json`),target=resolve(`updates/state/${mode}.json`),temp=`${target}.tmp`;
await mkdir(resolve("updates/state"),{recursive:true});
const value=await readFile(pending,"utf8");JSON.parse(value);
await writeFile(temp,value);await rename(temp,target);
console.log(JSON.stringify({status:"PROMOTED",mode,target}));
