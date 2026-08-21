const base=(process.argv[2]||process.env.DEPLOY_URL||"https://haidarra82066.github.io/noa-energy-atlas").replace(/\/$/,"");
const expected=process.argv[3]||process.env.PUBLICATION_ID||"";
const deadline=Date.now()+Number(process.env.SMOKE_TIMEOUT_MS||240000);
const wait=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
let marker=null,lastError="";
while(Date.now()<deadline){
  try{
    const response=await fetch(`${base}/deployment-marker.json`,{cache:"no-store",signal:AbortSignal.timeout(15000)});
    if(response.ok){marker=await response.json();if(!expected||marker.publicationId===expected)break}
    lastError=`marker HTTP ${response.status}`;
  }catch(error){lastError=String(error)}
  await wait(10000);
}
if(expected&&marker?.publicationId!==expected)throw new Error(`Deployment marker did not reach ${expected}: ${lastError}`);
for(const path of ["/","/updates/","/instruments/","/relationships/","/manifest.webmanifest"]){
  const response=await fetch(`${base}${path}`,{redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`${path} returned HTTP ${response.status}`);
  const text=await response.text();if(text.length<100)throw new Error(`${path} returned an unexpectedly short body`);
}
console.log(JSON.stringify({status:"PASS",base,publicationId:marker?.publicationId||null,routes:5}));
