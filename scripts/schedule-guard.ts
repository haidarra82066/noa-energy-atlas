import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { dateInBeirut, normalizeState } from "./intelligence-core";

type Mode="news"|"law";
const value=(name:string)=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]};
const mode=value("--mode") as Mode|undefined;
if(!mode||!["news","law"].includes(mode))throw new Error("Use --mode news or --mode law");
const force=process.argv.includes("--force");
const now=new Date();
const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Beirut",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hour12:false}).formatToParts(now).map((part)=>[part.type,part.value]));
const localDate=dateInBeirut(now),localHour=Number(parts.hour),day=Number(parts.day),weekday=parts.weekday||"";
let raw:unknown=null;try{raw=JSON.parse(await readFile(resolve(`updates/state/${mode}.json`),"utf8"))}catch{}
const state=normalizeState(raw,mode);
const scheduled=mode==="news"?["Tue","Fri"].includes(weekday)&&localHour===8:[1,15].includes(day)&&localHour===8;
const duplicate=state.lastScheduledDate===localDate;
const shouldRun=force||scheduled&&!duplicate;
const reason=force?"manual dispatch":duplicate?`already completed ${localDate}`:scheduled?`scheduled ${mode} window in Asia/Beirut`:`outside ${mode} Beirut-local window`;
const output=value("--github-output");
if(output)await appendFile(resolve(output),`should_run=${shouldRun}\nlocal_date=${localDate}\nreason=${reason}\n`);
console.log(JSON.stringify({mode,shouldRun,localDate,localHour,weekday,reason,timezone:"Asia/Beirut"}));
