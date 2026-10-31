import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { dateInBeirut, normalizeState } from "./intelligence-core";
import { isScheduledWindow, type PublicationMode } from "./schedule-policy";

const value=(name:string)=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]};
const mode=value("--mode") as PublicationMode|undefined;
if(!mode||!["news","law"].includes(mode))throw new Error("Use --mode news or --mode law");
const force=process.argv.includes("--force");
const now=new Date();
const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Beirut",weekday:"short",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hour12:false}).formatToParts(now).map((part)=>[part.type,part.value]));
const localDate=dateInBeirut(now),localHour=Number(parts.hour),day=Number(parts.day),weekday=parts.weekday||"";
let raw:unknown=null;try{raw=JSON.parse(await readFile(resolve(`updates/state/${mode}.json`),"utf8"))}catch{}
const state=normalizeState(raw,mode);
const scheduled=isScheduledWindow(mode,{weekday,day,hour:localHour});
const duplicate=state.lastScheduledDate===localDate;
const shouldRun=force||scheduled&&!duplicate;
const reason=force?"manual dispatch":duplicate?`already completed ${localDate}`:scheduled?`scheduled ${mode} window in Asia/Beirut`:`outside ${mode} Beirut-local window`;
const output=value("--github-output");
if(output)await appendFile(resolve(output),`should_run=${shouldRun}\nlocal_date=${localDate}\nreason=${reason}\n`);
console.log(JSON.stringify({mode,shouldRun,localDate,localHour,weekday,reason,timezone:"Asia/Beirut"}));
