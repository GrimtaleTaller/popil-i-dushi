// Grimtale: вебхук бота @Grimtalebot. /start — кнопка «Грати»; /stats — статистика гри (лише для адмінів).
// Налаштування вебхука: GET ...?setup=1 — ставить вебхук лише якщо він порожній або вже наш (чужий не перезаписує).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const ADMINS = [464306673];
const BOT = "Grimtalebot";
const SELF = `${Deno.env.get("SUPABASE_URL")}/functions/v1/bot`;

async function secret() {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("grimtale-webhook")));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return await r.json();
}

const TXT: Record<string, { hi: string; play: string; no: string }> = {
  uk: { hi: "⚔️ <b>Grimtale</b> — темна казкова RPG.\nТвій Мандрівник б'ється сам, навіть коли гра закрита. Натисни «Грати»!", play: "▶️ Грати", no: "Ця команда лише для адміністратора." },
  ru: { hi: "⚔️ <b>Grimtale</b> — тёмная сказочная RPG.\nТвой Странник сражается сам, даже когда игра закрыта. Нажми «Играть»!", play: "▶️ Играть", no: "Эта команда только для администратора." },
  en: { hi: "⚔️ <b>Grimtale</b> — a dark fairy-tale RPG.\nYour Wanderer fights on his own, even when the game is closed. Tap “Play”!", play: "▶️ Play", no: "This command is for the admin only." },
};
const langOf = (c?: string) => { const l = String(c || "").slice(0, 2); return l === "uk" ? "uk" : ["ru", "be", "kk", "uz", "ky", "tg", "hy", "az"].includes(l) ? "ru" : "en"; };

async function statsText() {
  const { data: s, error } = await SB.rpc("admin_stats");
  if (error || !s) return "Помилка: " + (error?.message || "немає даних");
  const days = (s.days as { d: string; n: number }[]).slice(-7).map((x) => `${x.d}: ${x.n}`).join(" · ");
  const langs = Object.entries(s.langs as Record<string, number>).map(([k, v]) => `${k} ${v}`).join(", ");
  const top = (s.top as { name: string; lvl: number; stage: number }[]).slice(0, 5).map((t, i) => `${i + 1}. ${t.name} — етап ${t.stage}, ур. ${t.lvl}`).join("\n");
  return `📊 <b>Grimtale</b>\n\n👥 Усього гравців: <b>${s.total}</b>\n🆕 Нових: ${s.new24} за добу · ${s.new7} за тиждень\n🟢 Активних: ${s.act1h} за годину · ${s.act24} за добу · ${s.act7} за тиждень\n🔗 За запрошеннями: ${s.byRef}\n🏰 Кланів: ${s.clans} · ⚔️ боїв на арені: ${s.fights}\n🌐 Мови: ${langs}\n\n📅 Реєстрації (7 днів): ${days}\n\n🏆 Топ за етапом:\n${top}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("setup") === "1") {
    const info = await tg("getWebhookInfo", {});
    const cur = info?.result?.url || "";
    if (cur && cur !== SELF) return new Response(JSON.stringify({ ok: false, reason: "webhook_taken", current: cur }), { status: 409 });
    const r = await tg("setWebhook", { url: SELF, secret_token: await secret(), allowed_updates: ["message"], drop_pending_updates: true });
    await tg("setMyCommands", { commands: [{ command: "start", description: "Грати / Play" }] });
    return new Response(JSON.stringify({ ok: r.ok, was: cur || null, desc: r.description }));
  }
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("x-telegram-bot-api-secret-token") !== await secret()) return new Response("forbidden", { status: 403 });
  let u: { message?: { chat: { id: number; type: string }; from?: { id: number; language_code?: string }; text?: string } };
  try { u = await req.json(); } catch { return new Response("ok"); }
  const m = u.message;
  if (!m?.text || m.chat.type !== "private") return new Response("ok");
  const L = TXT[langOf(m.from?.language_code)];
  const [cmd, arg] = m.text.trim().split(/\s+/, 2);
  try {
    if (cmd.startsWith("/stats")) {
      if (!ADMINS.includes(m.from?.id || 0)) await tg("sendMessage", { chat_id: m.chat.id, text: L.no });
      else await tg("sendMessage", { chat_id: m.chat.id, text: await statsText(), parse_mode: "HTML" });
    } else {
      // /start ref_123 — передаємо запрошення в гру через startapp
      const ref = /^ref_\d{3,15}$/.test(arg || "") ? arg : "";
      await tg("sendMessage", {
        chat_id: m.chat.id, text: L.hi, parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: L.play, url: `https://t.me/${BOT}?startapp=${ref}` }]] },
      });
    }
  } catch (e) { console.error(e); }
  return new Response("ok");
});
