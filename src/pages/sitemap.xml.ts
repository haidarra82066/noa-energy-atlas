import { instruments } from "../data/atlas";
export const prerender = true;
export function GET({ site }: { site: URL }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const paths=["/","/instruments/","/market/","/evidence/","/updates/","/methodology/","/about/","/sources/","/search/",...instruments.map((x)=>`/instruments/${x.slug}/`)];
  const urls=paths.map((path)=>`<url><loc>${new URL(`${basePath}${path}`,site)}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{"Content-Type":"application/xml; charset=utf-8"}});
}
