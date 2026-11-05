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
const GAP: Record<string, number> = { off: 24 * H, streak: 20 * H, egg: 0, find: 24 * H, wb: 7 * 24 * H, rank: 5 * 24 * H, back: 0 };
// тижневі рейтинги (05.11): нагадування за 1–6 год до підсумку (понеділок 00:00 UTC) тим, хто в топ-50 за Силою, Етапом чи Ареною
const PRIZE = (pl: number) => pl === 1 ? 300 : pl <= 3 ? 200 : pl <= 10 ? 100 : pl <= 50 ? 30 : 0;

const TXT: Record<string, Record<string, string>> = {
  uk: {
    off: "💰 Скарбничка повна! Твій Мандрівник набив повні кишені й чекає. Забери здобич, поки він не нудьгує.",
    streak: "🔥 Серія щоденних нагород — {n} дн. Зайди сьогодні, щоб вона не згоріла!",
    egg: "🥚 Яйце вилупилось! Подивись, хто з'явився.",
    find: "🐾 Пітомець приніс 3 знахідки й більше не вміщає. Забери їх!",
    wb: "👹 Світовий бос прокинувся! Б'ємо всі разом — нагороди за урон у понеділок.",
    rank: "⏳ До підсумку тижневих рейтингів — {h} год. Ти #{p} {kind}: це +{a} Попелу. Місце ще можна втримати або підняти!",
    back: "⚔️ Тебе не було {d} дн. — Мандрівник сумує. Чекають на тебе:\n{list}",
    k_power: "за Силою", k_stage: "за Етапом", k_arena: "на Арені",
    l_chests: "• скрині: {n}", l_egg: "• яйце вилупилось", l_find: "• знахідки пітомця: {n}", l_daily: "• щоденна нагорода", l_loot: "• повна скарбничка",
    play: "▶️ Грати", off_hint: "Вимкнути нагадування: у грі → Профіль.",
  },
  ru: {
    off: "💰 Копилка полна! Твой Странник набил карманы и ждёт. Забери добычу.",
    streak: "🔥 Серия ежедневных наград — {n} дн. Зайди сегодня, чтобы она не сгорела!",
    egg: "🥚 Яйцо вылупилось! Посмотри, кто появился.",
    find: "🐾 Питомец принёс 3 находки и больше не вмещает. Забери их!",
    wb: "👹 Мировой босс проснулся! Бьём все вместе — награды за урон в понедельник.",
    rank: "⏳ До итогов недельных рейтингов — {h} ч. Ты #{p} {kind}: это +{a} Пепла. Место ещё можно удержать или поднять!",
    back: "⚔️ Тебя не было {d} дн. — Странник скучает. Тебя ждут:\n{list}",
    k_power: "по Силе", k_stage: "по Этапу", k_arena: "на Арене",
    l_chests: "• сундуки: {n}", l_egg: "• яйцо вылупилось", l_find: "• находки питомца: {n}", l_daily: "• ежедневная награда", l_loot: "• полная копилка",
    play: "▶️ Играть", off_hint: "Отключить напоминания: в игре → Профиль.",
  },
  en: {
    off: "💰 Your loot chest is full! Your Wanderer is waiting with full pockets — come collect.",
    streak: "🔥 Daily reward streak: {n} days. Log in today so it doesn't burn!",
    egg: "🥚 Your egg has hatched! Come see who appeared.",
    find: "🐾 Your pet brought 3 finds and can't carry more. Collect them!",
    wb: "👹 The World Boss has awakened! Everyone hits together — rewards for damage on Monday.",
    rank: "⏳ Weekly rankings close in {h} h. You are #{p} {kind}: that's +{a} Ash. You can still hold or climb!",
    back: "⚔️ You've been away {d} days — your Wanderer misses you. Waiting for you:\n{list}",
    k_power: "by Power", k_stage: "by Stage", k_arena: "in the Arena",
    l_chests: "• chests: {n}", l_egg: "• your egg has hatched", l_find: "• pet finds: {n}", l_daily: "• daily reward", l_loot: "• a full loot chest",
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
function pick(G: any, now: number, last: Record<string, number>, seen: number, rk?: { p: number; kind: string }): { k: string; n?: number; x?: Record<string, string | number> } | null {
  const can = (k: string, since = 0) => GAP[k] ? (!last[k] || now - last[k] >= GAP[k]) : (!last[k] || last[k] < since); // egg: раз на кожне вилуплення
  const hr = new Date(now).getUTCHours();
  if (G.pet?.inc && G.pet.inc.at <= now && can("egg", G.pet.inc.at)) return { k: "egg" };
  const y = dayStr(now - 864e5);
  if (G.daily?.date === y && (G.daily.streak || 0) >= 2 && hr >= 16 && hr <= 18 && can("streak")) return { k: "streak", n: G.daily.streak };
  const toSettle = weekStart(now) + 7 * 24 * H - now; // до підсумку тижня
  if (rk && toSettle <= 6 * H && toSettle >= H && can("rank")) return { k: "rank", x: { h: Math.round(toSettle / H), p: rk.p, kind: rk.kind, a: PRIZE(rk.p) } };
  if (now - seen >= 72 * H && (!last.back || last.back < seen)) return { k: "back", x: { d: Math.floor((now - seen) / (24 * H)) } }; // раз за кожну відсутність
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
  const ranks: Record<number, { p: number; kind: string }> = {};
  const toSettle = weekStart(now) + 7 * 24 * H - now;
  if (toSettle <= 6 * H && toSettle >= H) {
    const { data: sts } = await SB.from("stats").select("player_id,power,max_stage,rating,wins,losses").limit(5000);
    const all = sts || [];
    const rankBy = (kind: string, val: (x: (typeof all)[number]) => number, only?: (x: (typeof all)[number]) => boolean) => {
      all.filter((x) => !only || only(x)).sort((a, b) => val(b) - val(a)).slice(0, 50).forEach((x, i) => {
        const cur = ranks[x.player_id as number]; if (!cur || i + 1 < cur.p) ranks[x.player_id as number] = { p: i + 1, kind };
      });
    };
    rankBy("k_power", (x) => Number(x.power || 0)); rankBy("k_stage", (x) => Number(x.max_stage || 0));
    rankBy("k_arena", (x) => Number(x.rating || 0), (x) => Number(x.wins || 0) + Number(x.losses || 0) > 0);
  }
  let sent = 0; const blocked: number[] = [];
  for (const p of ps || []) {
    const G = st[p.tg_id as number]; if (!G) continue;
    const ls = last[p.tg_id as number] || {};
    const today = Object.entries(ls).filter(([k, t]) => k !== "any" && now - t < 24 * H).length;
    if (today >= 2) continue;
    const r = pick(G, now, ls, Date.parse(p.last_seen as string), ranks[p.tg_id as number]); if (!r) continue;
    const l = langOf(p.lang as string), T = TXT[l];
    let text = T[r.k].replace("{n}", String(r.n ?? ""));
    if (r.k === "rank") text = text.replace("{h}", String(r.x!.h)).replace("{p}", String(r.x!.p)).replace("{kind}", T[String(r.x!.kind)]).replace("{a}", String(r.x!.a));
    if (r.k === "back") { // deno-lint-ignore no-explicit-any
      const g = G as any, ch = Object.values(g.chests || {}).reduce((a: number, b) => a + Number(b || 0), 0) as number, li: string[] = [];
      li.push(T.l_loot); if (ch) li.push(T.l_chests.replace("{n}", String(ch))); if (g.pet?.inc && g.pet.inc.at <= now) li.push(T.l_egg);
      if (g.pet?.act && (g.pet.fn || 0) > 0) li.push(T.l_find.replace("{n}", String(g.pet.fn))); if (g.daily?.date !== dayStr(now)) li.push(T.l_daily);
      text = text.replace("{d}", String(r.x!.d)).replace("{list}", li.join("\n"));
    }
    if (dry) { plan.push({ id: p.tg_id, k: r.k, l, text }); continue; }
    const res = await tg("sendMessage", { chat_id: p.tg_id, text: text + "\n\n<i>" + T.off_hint + "</i>", parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: T.play, url: `https://t.me/${BOT}?startapp=remind` }]] } });
    if (res?.ok) { sent++; await SB.from("reminders").upsert({ player_id: p.tg_id, kind: r.k, sent_at: new Date(now).toISOString() }); }
    else if (res?.error_code === 403) blocked.push(p.tg_id as number);
    await new Promise((x) => setTimeout(x, 40));
  }
  if (blocked.length) await SB.from("players").update({ bot_blocked: true }).in("tg_id", blocked);
  return new Response(JSON.stringify({ sent, checked: ids.length, plan }));
});
