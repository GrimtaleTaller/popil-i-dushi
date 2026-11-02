// Grimtale: нагадування гравцям від @Grimtalebot (02.11, рішення Влада). Запускає pg_cron щогодини.
// Не більше одного повідомлення за запуск і двох на добу на гравця; кожен вид — не частіше, ніж зазначено в GAP.
// Виклик: pg_cron «grimtale-remind» щогодини, заголовок x-remind-key = vault remind_key.
// Гравець вимикає нагадування в грі (Профіль → Нагадування) — players.notify = false.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const BOT = "Grimtalebot";
const H = 3600e3;
const OFFLINE_MAX = 8 * H;
const GAP: Record<string, number> = { off: 24 * H, streak: 20 * H, egg: 0, find: 24 * H, wb: 7 * 24 * H };

const TXT: Record<string, Record<string, string>> = {
  uk: {
    off: "💰 Скарбничка повна! Твій Мандрівник набив повні кишені й чекає. Забери здобич, поки він не нудьгує.",
    streak: "🔥 Серія щоденних нагород — {n} дн. Зайди сьогодні, щоб вона не згоріла!",
    egg: "🥚 Яйце вилупилось! Подивись, хто з'явився.",
    find: "🐾 Пітомець приніс 3 знахідки й більше не вміщає. Забери їх!",
    wb: "👹 Світовий бос прокинувся! Б'ємо всі разом — нагороди за урон у понеділок.",
    play: "▶️ Грати", off_hint: "Вимкнути нагадування: у грі → Профіль.",
  },
  ru: {
    off: "💰 Копилка полна! Твой Странник набил карманы и ждёт. Забери добычу.",
    streak: "🔥 Серия ежедневных наград — {n} дн. Зайди сегодня, чтобы она не сгорела!",
    egg: "🥚 Яйцо вылупилось! Посмотри, кто появился.",
    find: "🐾 Питомец принёс 3 находки и больше не вмещает. Забери их!",
    wb: "👹 Мировой босс проснулся! Бьём все вместе — награды за урон в понедельник.",
    play: "▶️ Играть", off_hint: "Отключить напоминания: в игре → Профиль.",
  },
  en: {
    off: "💰 Your loot chest is full! Your Wanderer is waiting with full pockets — come collect.",
    streak: "🔥 Daily reward streak: {n} days. Log in today so it doesn't burn!",
    egg: "🥚 Your egg has hatched! Come see who appeared.",
    find: "🐾 Your pet brought 3 finds and can't carry more. Collect them!",
    wb: "👹 The World Boss has awakened! Everyone hits together — rewards for damage on Monday.",
    play: "▶️ Play", off_hint: "Turn off reminders: in game → Profile.",
  },
};
const langOf = (c?: string) => { const l = String(c || "").slice(0, 2); return l === "uk" ? "uk" : ["ru", "be", "kk", "uz", "ky", "tg", "hy", "az"].includes(l) ? "ru" : "en"; };
const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const weekStart = (ms: number) => { const d = new Date(ms); const w = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - w); };

async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return await r.json();
}

// що варто нагадати гравцю зараз (за пріоритетом); null — нічого
// deno-lint-ignore no-explicit-any
function pick(G: any, now: number, last: Record<string, number>): { k: string; n?: number } | null {
  const can = (k: string, since = 0) => GAP[k] ? (!last[k] || now - last[k] >= GAP[k]) : (!last[k] || last[k] < since); // egg: раз на кожне вилуплення
  const hr = new Date(now).getUTCHours();
  if (G.pet?.inc && G.pet.inc.at <= now && can("egg", G.pet.inc.at)) return { k: "egg" };
  const y = dayStr(now - 864e5);
  if (G.daily?.date === y && (G.daily.streak || 0) >= 2 && hr >= 16 && hr <= 18 && can("streak")) return { k: "streak", n: G.daily.streak };
  if (now - (G.tick || now) >= OFFLINE_MAX && now - (G.tick || now) < 72 * H && can("off")) return { k: "off" };
  if (G.pet?.act && (G.pet.fn || 0) >= 3 && can("find")) return { k: "find" };
  if ((G.maxStage || 0) >= 15 && now - weekStart(now) < 30 * H && hr >= 15 && (!last.wb || last.wb < weekStart(now))) return { k: "wb" };
  return null;
}

Deno.serve(async (req) => {
  // ключ лежить у Vault бази (remind_key), pg_cron передає його в заголовку; функція звіряє через remind_key_ok
  const k = req.headers.get("x-remind-key") || ""; const { data: ok } = k ? await SB.rpc("remind_key_ok", { k }) : { data: false };
  if (!ok) return new Response("forbidden", { status: 403 });
  const now = Date.now(), dry = new URL(req.url).searchParams.get("dry") === "1"; const plan: unknown[] = []; // dry=1 — лише показати, кому що пішло б
  const { data: ps, error } = await SB.from("players").select("tg_id,lang,last_seen").eq("banned", false).eq("bot_blocked", false).eq("notify", true)
    .lt("last_seen", new Date(now - 3 * H).toISOString()).gt("last_seen", new Date(now - 14 * 24 * H).toISOString()).limit(3000);
  if (error) { console.error(error); return new Response("err", { status: 500 }); }
  const ids = (ps || []).map((p) => p.tg_id as number);
  if (!ids.length) return new Response(JSON.stringify({ sent: 0 }));
  const { data: gs } = await SB.from("game_state").select("player_id,state").in("player_id", ids);
  const { data: rs } = await SB.from("reminders").select("player_id,kind,sent_at").in("player_id", ids);
  const last: Record<number, Record<string, number>> = {};
  for (const r of rs || []) (last[r.player_id] = last[r.player_id] || {})[r.kind] = Date.parse(r.sent_at);
  const st: Record<number, unknown> = {}; for (const g of gs || []) st[g.player_id] = g.state;
  let sent = 0; const blocked: number[] = [];
  for (const p of ps || []) {
    const G = st[p.tg_id as number]; if (!G) continue;
    const ls = last[p.tg_id as number] || {};
    const today = Object.entries(ls).filter(([k, t]) => k !== "any" && now - t < 24 * H).length;
    if (today >= 2) continue;
    const r = pick(G, now, ls); if (!r) continue;
    const l = langOf(p.lang as string), T = TXT[l];
    if (dry) { plan.push({ id: p.tg_id, k: r.k, l }); continue; }
    const res = await tg("sendMessage", { chat_id: p.tg_id, text: T[r.k].replace("{n}", String(r.n ?? "")) + "\n\n<i>" + T.off_hint + "</i>", parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: T.play, url: `https://t.me/${BOT}?startapp=remind` }]] } });
    if (res?.ok) { sent++; await SB.from("reminders").upsert({ player_id: p.tg_id, kind: r.k, sent_at: new Date(now).toISOString() }); }
    else if (res?.error_code === 403) blocked.push(p.tg_id as number);
    await new Promise((x) => setTimeout(x, 40));
  }
  if (blocked.length) await SB.from("players").update({ bot_blocked: true }).in("tg_id", blocked);
  return new Response(JSON.stringify({ sent, checked: ids.length, plan }));
});
