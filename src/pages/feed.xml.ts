import { news } from "../data/atlas";
export const prerender = true;
export function GET({ site }: { site: URL }) {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const escape=(value:string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const items=news.map((item)=>`<item><title>${escape(item.title)}</title><link>${new URL(`${basePath}/updates/#${item.slug}`,site)}</link><guid>${new URL(`${basePath}/updates/#${item.slug}`,site)}</guid><pubDate>${new Date(`${item.date}T12:00:00Z`).toUTCString()}</pubDate><description>${escape(item.summary)}</description></item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Noa Energy Atlas updates</title><link>${new URL(`${basePath}/`,site)}</link><description>Documented changes in Lebanon’s energy law and market.</description>${items}</channel></rss>`,{headers:{"Content-Type":"application/rss+xml; charset=utf-8"}});
}
