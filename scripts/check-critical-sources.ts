import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
type Mode="news"|"law";
const mode=process.argv.includes("--mode")?process.argv[process.argv.indexOf("--mode")+1] as Mode:undefined;
if(!mode||!["news","law"].includes(mode))throw new Error("Use --mode news or --mode law");
type Source={id:string;ok:boolean;priority:number;publisher:string;sourceType:string;error?:string};
const packet=JSON.parse(await readFile(resolve(`updates/research/${mode}-evidence.json`),"utf8")) as {sources:Source[]};
const primary=packet.sources.filter((item)=>item.priority===1&&!item.id.startsWith("discovered-"));
const available=new Set(packet.sources.filter((item)=>item.ok).map((item)=>item.id));
const failures:string[]=[];
const requireGroup=(name:string,ids:string[],minimum:number)=>{const count=ids.filter((id)=>available.has(id)).length;if(count<minimum)failures.push(`${name}: ${count}/${ids.length} available; minimum ${minimum}`)};
if(primary.length===0||primary.filter((item)=>item.ok).length/primary.length<.6)failures.push(`priority-one availability below 60% (${primary.filter((item)=>item.ok).length}/${primary.length})`);
if(mode==="news"){
  requireGroup("core electricity and government",["monitor-moew","monitor-edl","monitor-cabinet"],2);
  requireGroup("climate and independent analysis",["monitor-unfccc","monitor-aub-ifi","atlas-src-irena-2020"],1);
}else{
  requireGroup("controlling legislation index",["monitor-official-gazette","monitor-parliament"],1);
  requireGroup("regulator and standards authorities",["monitor-moew","monitor-cabinet","monitor-lcec","monitor-libnor"],2);
}
if(failures.length)throw new Error(`Critical-source gate failed closed for ${mode}:\n- ${failures.join("\n- ")}`);
console.log(JSON.stringify({status:"PASS",mode,primaryAvailable:primary.filter((item)=>item.ok).length,primaryAttempted:primary.length}));
