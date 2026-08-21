const VERSION="noa-energy-atlas-v5";
const CORE=["/","/instruments/","/updates/","/about/","/offline/","/manifest.webmanifest","/favicon.svg","/icons/icon-192.png","/assets/noa-phoenix-editorial-idle.webp","/assets/noa-phoenix-editorial-listening.webp"];
self.addEventListener("install",(event)=>event.waitUntil(caches.open(VERSION).then((cache)=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",(event)=>event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==VERSION).map((key)=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",(event)=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url); if(url.origin!==location.origin)return;
  if(event.request.mode==="navigate")event.respondWith(fetch(event.request).then((response)=>{const copy=response.clone();caches.open(VERSION).then((cache)=>cache.put(event.request,copy));return response}).catch(async()=>await caches.match(event.request)||await caches.match("/offline/")));
  else event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{if(response.ok)caches.open(VERSION).then((cache)=>cache.put(event.request,response.clone()));return response})));
});
