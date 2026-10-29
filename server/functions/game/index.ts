// Grimtale: сервер гри. Один ендпоінт POST { initData, action, args }.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as L from "./logic.ts";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const DEV_KEY = Deno.env.get("DEV_KEY") ?? ""; // лише для тестів; на проді секрет не задано
const MAX_AGE = 24 * 3600; // initData дійсні добу
const ADMINS = [464306673]; // tg_id адмінів: дашборд статистики в профілі

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-dev-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type TgUser = { id: number; first_name?: string; username?: string; language_code?: string; is_premium?: boolean };

async function hmac(key: ArrayBuffer | Uint8Array, msg: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
}
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

// Перевірка підпису Telegram WebApp initData
let lastAuthErr = "";
async function verify(initData: string): Promise<{ user: TgUser; start?: string } | null> {
  lastAuthErr = !initData ? "no_init_data" : !BOT_TOKEN ? "no_token" : "";
  if (lastAuthErr) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get("hash"); if (!hash) { lastAuthErr = "no_hash"; return null; }
  p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const calc = hex(await hmac(secret, dcs));
  if (calc !== hash) { lastAuthErr = "bad_hash"; return null; }
  const ad = Number(p.get("auth_date") || 0);
  if (!ad || Date.now() / 1000 - ad > MAX_AGE) { lastAuthErr = "expired"; return null; }
  try { return { user: JSON.parse(p.get("user") || "null"), start: p.get("start_param") || undefined }; } catch { return null; }
}

async function loadOrCreate(u: TgUser, start: string | undefined, now: number) {
  const { data: row, error } = await SB.from("game_state").select("version,state").eq("player_id", u.id).maybeSingle();
  if (error) throw error;
  const prof = { username: u.username ?? null, first_name: u.first_name ?? null, lang: u.language_code ?? null, is_premium: !!u.is_premium, last_seen: new Date(now).toISOString() };
  if (row) {
    await SB.from("players").update(prof).eq("tg_id", u.id);
    return { version: row.version as number, state: L.migrate(row.state as L.State), isNew: false };
  }
  // новий гравець; реферал з start_param виду ref_<tg_id>
  let ref: number | null = null;
  const m = /^ref_(\d{3,15})$/.exec(start || "");
  if (m && Number(m[1]) !== u.id) {
    const { data: rp } = await SB.from("players").select("tg_id").eq("tg_id", Number(m[1])).maybeSingle();
    if (rp) ref = rp.tg_id;
  }
  const { error: e1 } = await SB.from("players").upsert({ tg_id: u.id, ...prof, ref_by: ref }, { onConflict: "tg_id", ignoreDuplicates: true });
  if (e1) throw e1;
  const st = L.fresh(now);
  const { error: e2 } = await SB.from("game_state").insert({ player_id: u.id, version: 0, state: st });
  if (e2 && e2.code !== "23505") throw e2; // одночасний перший запит
  if (e2) return loadOrCreate(u, start, now);
  return { version: 0, state: st, isNew: true };
}

function view(G: L.State, now: number, uid = 0) {
  const H = L.hero(G);
  return {
    s: G, hero: { ...H, power: L.power(H) }, daily: L.dailyInfo(G, now), canFarm: L.canFarm(G, G.stage), kt: L.killTime(G, G.stage), now,
    forge: { soulsPerHour: L.soulsPerHour(G), ench: L.enchCost(G), enchMax: L.ENCH_MAX, enchStep: L.ENCH_STEP, myth: L.MYTH, junk: L.junkIds(G).length, ast: L.AST, astChance: L.astChance(G) },
    arena: {
      stage: L.ARENA.stage, daily: L.ARENA.daily, left: Math.max(0, L.ARENA.daily - (G.arena.day === new Date(now).toISOString().slice(0, 10) ? G.arena.used : 0)),
      pts: G.arena.pts, rating: G.arena.rating, w: G.arena.w, l: G.arena.l, win: L.ARENA.win, lose: L.ARENA.lose, shop: L.ARENA_SHOP,
      opps: G.arena.opps.map((o) => ({ name: o.name, lvl: o.lvl, power: o.power, rating: o.rating })),
    },
    xp: { need: L.xpNeed(G.lvl), mob: L.mobXp(G.stage) },
    cb: G.cb || { atk: 0, gold: 0, xp: 0 }, isAdmin: ADMINS.includes(uid), clanStage: L.CLAN.joinStage, clanCost: L.clanCreateCost(G),
    payout: { lvl: L.PAYOUT.lvl, days: L.PAYOUT.days, myDays: G.act.days, ok: G.lvl >= L.PAYOUT.lvl && G.act.days >= L.PAYOUT.days },
    smelt: L.SMELT, inv: { max: L.invMax(G), cost: L.bagCost(G), step: L.BAG.step, vaultMax: L.VAULT_MAX, rate: L.OVF_RATE },
    train: { gateStep: L.GATE_STEP, gate: Object.fromEntries(Object.keys(L.UPG).map((k) => [k, L.gateCost(k, G.up[k as keyof L.State["up"]])])) },
    dng: {
      unlockStage: L.DNG_UNLOCK_STAGE, rooms: L.DNG_ROOMS, daily: L.DNG_DAILY, left: L.dngLeft(G, now),
      tiers: Array.from({ length: L.DNG_TIERS }, (_, i) => {
        const t = i + 1, open = L.dngOpen(G, t);
        const diffs = Array.from({ length: L.DNG_DIFF }, (_, k) => { const d = k + 1, o = L.dngOpen(G, t, d); return { d, open: o, stage: L.dngStage(t, d), rw: L.dngRewards(t, d), est: o ? L.dngEstimate(G, t, 16, d) : null, need: L.dngNeedPower(G, t, d) }; });
        return { t, open, loc: L.dngLoc(t), stage: L.dngStage(t), price: L.keyPrice(t), keys: G.keys[String(t)] || 0, rw: L.dngRewards(t), pay: L.dngPrice(G, t, now), est: open ? L.dngEstimate(G, t) : null, best: L.dngDiffMax(G, t), diffs };
      }),
    },
  };
}

// ---------- арена й рейтинги ----------
async function myRating(id: number) {
  const { data } = await SB.from("stats").select("rating").eq("player_id", id).maybeSingle();
  return (data?.rating as number | undefined) ?? 1000;
}
async function pickOpps(G: L.State, id: number): Promise<L.ArenaOpp[]> {
  const r = G.arena.rating;
  const { data } = await SB.from("stats").select("player_id,name,lvl,power,rating,snap")
    .neq("player_id", id).not("snap", "is", null).gte("rating", r - 250).lte("rating", r + 250).limit(40);
  const pool = (data || []).sort(() => Math.random() - 0.5).slice(0, 3);
  const opps: L.ArenaOpp[] = pool.map((x) => ({ id: x.player_id as number, name: String(x.name || "Hero").slice(0, 24), lvl: x.lvl as number, power: Number(x.power), rating: x.rating as number, st: x.snap as L.ArenaOpp["st"] }));
  for (let k = 0; opps.length < 3; k++) opps.push(L.botOpp(G, k));
  return opps;
}
const TOP_COL: Record<string, string> = { stage: "max_stage", power: "power", lvl: "lvl", rating: "rating" };
// тижневі рейтинги: нагороди Попелом за місце (рішення 29.10). Підсумки — у понеділок 00:00 UTC, при першому запиті тижня.
const PRIZES = [{ from: 1, to: 1, ash: 300 }, { from: 2, to: 3, ash: 200 }, { from: 4, to: 10, ash: 100 }, { from: 11, to: 50, ash: 30 }];
const CLAN_PRIZES = [{ from: 1, to: 1, ash: 1000 }, { from: 2, to: 3, ash: 600 }, { from: 4, to: 10, ash: 300 }];
const PRIZE_KINDS = ["power", "stage", "rating"];
const weekStart = (now: number) => { const d = new Date(now); const w = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - w)).toISOString().slice(0, 10); };
let settledWeek = "";
async function settleWeek(now: number) {
  const wk = weekStart(now); if (wk === settledWeek) return;
  const { error } = await SB.rpc("rating_settle", { p_week: wk }); if (error) { console.error("settle", error); return; }
  settledWeek = wk;
}
async function prizeInfo(id: number, now: number) {
  const next = Date.parse(weekStart(now) + "T00:00:00Z") + 7 * 864e5;
  const { data: last } = await SB.from("rating_rewards").select("kind,place,ash,week").eq("player_id", id).order("week", { ascending: false }).limit(6);
  const lw = last?.[0]?.week; return { prizes: PRIZES, clanPrizes: CLAN_PRIZES, kinds: PRIZE_KINDS, resetIn: next - now, last: (last || []).filter((x) => x.week === lw) };
}
async function topClans(id: number) {
  const { data } = await SB.from("clan_view").select("id,name,members,power").gt("members", 0).order("power", { ascending: false }).order("id", { ascending: true }).limit(50);
  const mine = await clanOf(id);
  const rows = (data || []).map((x, i) => ({ place: i + 1, name: String(x.name), me: mine?.clan_id === x.id, v: Number(x.power), lvl: x.members }));
  const { count } = await SB.from("clans").select("id", { count: "exact", head: true });
  return { kind: "clan", rows, me: rows.find((r) => r.me) || null, total: count || 0 };
}
async function topList(kind: string, id: number) {
  const now = Date.now();
  if (kind === "clan") return { ...(await topClans(id)), ...(await prizeInfo(id, now)) };
  const col = TOP_COL[kind] || "max_stage";
  const { data, error } = await SB.from("stats").select(`player_id,name,lvl,max_stage,power,rating`).order(col, { ascending: false }).order("updated_at", { ascending: true }).limit(50);
  if (error) throw error;
  const rows = (data || []).map((x, i) => ({ place: i + 1, name: String(x.name || "Hero").slice(0, 24), me: x.player_id === id, v: Number((x as Record<string, unknown>)[col]), lvl: x.lvl }));
  let me = rows.find((r) => r.me) || null;
  if (!me) {
    const { data: m } = await SB.from("stats").select(`name,lvl,${col}`).eq("player_id", id).maybeSingle();
    if (m) {
      const v = Number((m as Record<string, unknown>)[col]);
      const { count } = await SB.from("stats").select("player_id", { count: "exact", head: true }).gt(col, v);
      me = { place: (count || 0) + 1, name: String((m as Record<string, unknown>).name || "Hero"), me: true, v, lvl: (m as Record<string, unknown>).lvl as number };
    }
  }
  const { count: total } = await SB.from("stats").select("player_id", { count: "exact", head: true });
  return { kind, rows, me, total: total || 0, ...(await prizeInfo(id, now)) };
}
async function arenaDivision(rating: number) {
  const { count: total } = await SB.from("stats").select("player_id", { count: "exact", head: true }).or("wins.gt.0,losses.gt.0");
  const { count: above } = await SB.from("stats").select("player_id", { count: "exact", head: true }).gt("rating", rating).or("wins.gt.0,losses.gt.0");
  const t = total || 0, top = t ? (above || 0) / t : 1;
  return { top: Math.round(top * 1000) / 10, div: top <= 0.03 ? 4 : top <= 0.1 ? 3 : top <= 0.3 ? 2 : top <= 0.6 ? 1 : 0, total: t };
}

// ---------- профіль, клани, адмін: дії з базою, що виконуються один раз до запису стану ----------
type Pre = { out?: unknown; fx?: (G: L.State, now: number) => void };
const PRE = new Set(["clanBuild", "profile", "admin", "clan", "clanCreate", "clanJoin", "clanLeave", "clanKick", "clanRole", "clanCraft", "clanTake", "clanApp", "clanSettings", "clanUnapply", "market", "marketBuy", "marketCancel"]);
const uname = (u: TgUser) => String(u.first_name || u.username || "Hero").slice(0, 24);
// журнал клану: останні дії учасників
async function clog(clan: number, u: TgUser | null, kind: string, data: Record<string, unknown> = {}) {
  const { error } = await SB.from("clan_log").insert({ clan_id: clan, player_id: u?.id ?? null, name: u ? uname(u) : null, kind, data });
  if (error) console.error(error);
}
const fail = (m: string): never => { throw new L.GameError(m); };
async function clanOf(id: number) {
  const { data } = await SB.from("clan_members").select("clan_id,role").eq("player_id", id).maybeSingle();
  return data as { clan_id: number; role: string } | null;
}
async function clanBonusOf(id: number) {
  const me = await clanOf(id); if (!me) return { atk: 0, gold: 0, xp: 0 };
  const { data } = await SB.from("clans").select("bld").eq("id", me.clan_id).maybeSingle();
  return L.clanBonus(data?.bld as Record<string, number>);
}
async function nameOf(id: number) {
  const { data } = await SB.from("stats").select("name").eq("player_id", id).maybeSingle();
  return String(data?.name || "Hero");
}
async function clanInfo(id: number, G: L.State, now: number, q = "") {
  const me = await clanOf(id);
  const base = { max: L.CLAN.max, createStage: L.CLAN.createStage, joinStage: L.CLAN.joinStage, createCost: L.clanCreateCost(G) };
  if (!me) {
    let qb = SB.from("clan_view").select("id,name,members,power,join_mode,min_stage,min_power,bld").order("power", { ascending: false }).limit(30);
    const qq = q.replace(/[%_,()]/g, "").trim().slice(0, 20);
    if (qq) qb = qb.ilike("name", `%${qq}%`);
    const { data } = await qb;
    const { data: ap } = await SB.from("clan_apps").select("clan_id").eq("player_id", id);
    const myPower = L.power(L.hero(G));
    return { ...base, clan: null, q: qq, apps: (ap || []).map((a) => a.clan_id), list: (data || []).map((c) => ({ ...c, bld: undefined, max: L.clanMax(c.bld), power: Number(c.power), min_power: Number(c.min_power), ok: G.maxStage >= c.min_stage && myPower >= Number(c.min_power) })) };
  }
  const { data: c } = await SB.from("clan_view").select("id,name,members,power,keys,bank,kn,join_mode,min_stage,min_power,bld,res,ash").eq("id", me.clan_id).single();
  const { data: ms } = await SB.from("clan_members").select("player_id,role,joined_at,given,given_ash").eq("clan_id", me.clan_id);
  const ids = (ms || []).map((m) => m.player_id as number);
  const { data: st } = await SB.from("stats").select("player_id,name,lvl,max_stage,power").in("player_id", ids);
  const { data: pl } = await SB.from("players").select("tg_id,last_seen,first_name").in("tg_id", ids);
  const ro: Record<string, number> = { leader: 0, officer: 1, member: 2 };
  const members = (ms || []).map((m) => {
    const x = (st || []).find((y) => y.player_id === m.player_id), p = (pl || []).find((y) => y.tg_id === m.player_id);
    return { id: m.player_id, name: String(x?.name || p?.first_name || "Hero").slice(0, 24), lvl: x?.lvl || 1, stage: x?.max_stage || 1, power: Number(x?.power || 0), role: m.role, given: Number(m.given || 0), givenAsh: Number(m.given_ash || 0), seen: p?.last_seen || null, me: m.player_id === id };
  }).sort((a, b) => ro[a.role] - ro[b.role] || b.power - a.power);
  const kn = Number(c!.kn || 0), bld = (c!.bld || {}) as Record<string, number>;
  const builds = (Object.keys(L.BUILD) as L.BldKey[]).map((k) => ({ k, lvl: Number(bld[k] || 0), max: L.BUILD[k].max, step: L.BUILD[k].step, cost: L.bldCost(k, Number(bld[k] || 0)) }));
  const craft = Array.from({ length: L.DNG_TIERS }, (_, i) => ({ t: i + 1, ash: L.clanKeyCost(i + 1, 1, Number(bld.forge || 0)), ash5: L.clanKeyCost(i + 1, 5, Number(bld.forge || 0)), can: (G.dng?.max || 0) >= i + 1 }));
  const { data: lg } = await SB.from("clan_log").select("name,kind,data,at").eq("clan_id", me.clan_id).order("id", { ascending: false }).limit(30);
  let apps: unknown[] = [];
  if (me.role === "leader" || me.role === "officer") {
    const { data: aps } = await SB.from("clan_apps").select("id,player_id,created_at").eq("clan_id", me.clan_id).order("created_at", { ascending: true }).limit(30);
    const aids = (aps || []).map((a) => a.player_id as number);
    const { data: ast } = aids.length ? await SB.from("stats").select("player_id,name,lvl,max_stage,power").in("player_id", aids) : { data: [] as { player_id: number; name: string; lvl: number; max_stage: number; power: number }[] };
    apps = (aps || []).map((a) => { const x = (ast || []).find((y) => y.player_id === a.player_id); return { id: a.id, name: String(x?.name || "Hero").slice(0, 24), lvl: x?.lvl || 1, stage: x?.max_stage || 1, power: Number(x?.power || 0), at: a.created_at }; });
  }
  return { ...base, clan: { id: c!.id, name: c!.name, members: c!.members, power: Number(c!.power), keys: c!.keys || {}, bank: Number(c!.bank || 0), ash: Number(c!.ash || 0), kn, mode: c!.join_mode, minStage: c!.min_stage, minPower: Number(c!.min_power), max: L.clanMax(bld), res: c!.res || { m: [0, 0, 0, 0], sh: 0 } }, role: me.role, members, craft, log: lg || [], apps, builds };
}
// ринок: лоти інших гравців (з фільтрами) і мої активні лоти
async function marketInfo(id: number, args: Record<string, unknown>) {
  let q = SB.from("market_lots").select("id,seller_name,item,slot,rarity,ilvl,price,created_at,seller,cur").is("buyer", null).neq("seller", id);
  const slot = String(args.slot || ""), r = Number(args.r), cur = String(args.cur || "");
  if ((L.SLOTS as readonly string[]).includes(slot) || slot === "mat") q = q.eq("slot", slot);
  if (slot !== "mat" && r >= 2 && r <= 6) q = q.eq("rarity", r);
  if (cur === "ash" || cur === "gold") q = q.eq("cur", cur);
  const sort = String(args.sort || "price");
  q = sort === "new" ? q.order("created_at", { ascending: false }) : sort === "lvl" ? q.order("ilvl", { ascending: false }) : q.order("price", { ascending: true });
  const { data } = await q.limit(50);
  const { data: mine } = await SB.from("market_lots").select("id,item,price,created_at,cur").eq("seller", id).is("buyer", null).order("created_at", { ascending: false });
  return { fee: L.MARKET.fee, maxLots: L.MARKET.maxLots, minR: L.MARKET.minR, ashOnlyR: L.MARKET.ashOnlyR, lots: (data || []).map((x) => ({ id: x.id, seller: x.seller_name, item: x.item, price: Number(x.price), cur: x.cur, at: x.created_at })), mine: mine || [] };
}
async function profile(user: TgUser, G: L.State) {
  const { data: p } = await SB.from("players").select("created_at").eq("tg_id", user.id).maybeSingle();
  const { data: l1 } = await SB.from("players").select("tg_id,first_name,username,created_at").eq("ref_by", user.id).order("created_at", { ascending: false }).limit(200);
  const ids1 = (l1 || []).map((x) => x.tg_id as number);
  let ids2: number[] = [], n3 = 0;
  if (ids1.length) { const { data: l2 } = await SB.from("players").select("tg_id").in("ref_by", ids1); ids2 = (l2 || []).map((x) => x.tg_id as number); }
  if (ids2.length) { const { count } = await SB.from("players").select("tg_id", { count: "exact", head: true }).in("ref_by", ids2); n3 = count || 0; }
  const { data: st } = ids1.length ? await SB.from("stats").select("player_id,lvl,max_stage").in("player_id", ids1) : { data: [] as { player_id: number; lvl: number; max_stage: number }[] };
  const { data: me } = await SB.from("stats").select("rating,wins,losses").eq("player_id", user.id).maybeSingle();
  const cm = await clanOf(user.id);
  let clan: string | null = null;
  if (cm) { const { data: c } = await SB.from("clans").select("name").eq("id", cm.clan_id).maybeSingle(); clan = c?.name || null; }
  return {
    id: user.id, joined: p?.created_at || null, days: G.act.days,
    refs: {
      pct: [8, 3, 1], n1: ids1.length, n2: ids2.length, n3,
      list: (l1 || []).slice(0, 50).map((x) => { const s = (st || []).find((y) => y.player_id === x.tg_id); return { name: String(x.first_name || x.username || "Hero").slice(0, 24), lvl: s?.lvl || 1, stage: s?.max_stage || 1, joined: x.created_at }; }),
    },
    arena: { rating: me?.rating ?? 1000, w: me?.wins ?? 0, l: me?.losses ?? 0 }, clan, role: cm?.role || null,
  };
}
async function preAction(user: TgUser, start: string | undefined, action: string, args: Record<string, unknown>): Promise<Pre> {
  const now = Date.now();
  const { state: G } = await loadOrCreate(user, start, now); // лише для перевірок; зміни стану — у fx
  L.migrate(G);
  const me = action.startsWith("clan") ? await clanOf(user.id) : null;
  const canLead = (r?: string) => r === "leader" || r === "officer";
  switch (action) {
    case "profile": return { out: await profile(user, G) };
    case "admin": {
      if (!ADMINS.includes(user.id)) fail("forbidden");
      const { data, error } = await SB.rpc("admin_stats"); if (error) throw error;
      return { out: data };
    }
    case "clan": return { out: await clanInfo(user.id, G, now, String(args.q || "")) };
    case "clanCreate": {
      if (me) fail("clan_already");
      if (G.maxStage < L.CLAN.createStage) fail("clan_stage");
      const cost = L.clanCreateCost(G); if (G.gold < cost) fail("no_gold");
      const name = String(args.name || "").replace(/\s+/g, " ").trim();
      if (!L.clanNameOk(name)) fail("clan_name_bad");
      const { data: c, error } = await SB.from("clans").insert({ name, leader: user.id }).select("id").single();
      if (error) { if (error.code === "23505") fail("clan_name_taken"); throw error; }
      const { error: e2 } = await SB.from("clan_members").insert({ player_id: user.id, clan_id: c.id, role: "leader" });
      if (e2) { await SB.from("clans").delete().eq("id", c.id); fail("clan_already"); }
      await clog(c.id, user, "create");
      return { fx: (S) => { S.gold = Math.max(0, S.gold - cost); }, out: await clanInfo(user.id, G, now) };
    }
    case "clanJoin": {
      if (me) fail("clan_already");
      if (G.maxStage < L.CLAN.joinStage) fail("clan_stage");
      const { data: c } = await SB.from("clan_view").select("id,members,join_mode,min_stage,min_power,bld").eq("id", Number(args.id)).maybeSingle();
      if (!c) fail("clan_none");
      if (c!.join_mode === "closed") fail("clan_closed");
      if (G.maxStage < c!.min_stage || L.power(L.hero(G)) < Number(c!.min_power)) fail("clan_reqs");
      if (c!.members >= L.clanMax(c!.bld)) fail("clan_full");
      if (c!.join_mode === "apply") {
        const { count } = await SB.from("clan_apps").select("id", { count: "exact", head: true }).eq("player_id", user.id);
        if ((count || 0) >= L.CLAN_APPS_MAX) fail("clan_apps_max");
        const { error: ae } = await SB.from("clan_apps").insert({ clan_id: c!.id, player_id: user.id });
        if (ae && ae.code !== "23505") throw ae;
        await clog(c!.id, user, "apply");
        return { out: { ...(await clanInfo(user.id, G, now)), applied: true } };
      }
      const { error } = await SB.from("clan_members").insert({ player_id: user.id, clan_id: c!.id, role: "member" });
      if (error) fail("clan_already");
      await SB.from("clan_apps").delete().eq("player_id", user.id);
      await clog(c!.id, user, "join");
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanLeave": {
      if (!me) fail("clan_none");
      if (me!.role === "leader") {
        const { data: ms } = await SB.from("clan_members").select("player_id,role,joined_at").eq("clan_id", me!.clan_id).neq("player_id", user.id).order("joined_at", { ascending: true });
        if (!ms || !ms.length) { await SB.from("clans").delete().eq("id", me!.clan_id); return { out: await clanInfo(user.id, G, now) }; }
        const heir = ms.find((m) => m.role === "officer") || ms[0];
        await SB.from("clan_members").update({ role: "leader" }).eq("player_id", heir.player_id);
        await SB.from("clans").update({ leader: heir.player_id }).eq("id", me!.clan_id);
      }
      await SB.from("clan_members").delete().eq("player_id", user.id);
      await clog(me!.clan_id, user, "leave");
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanKick": case "clanRole": {
      if (!me || !canLead(me.role)) fail("clan_rights");
      const pid = Number(args.pid);
      const t = await clanOf(pid);
      if (!t || t.clan_id !== me!.clan_id || pid === user.id) fail("clan_none");
      if (action === "clanKick") {
        if (t!.role === "leader" || (me!.role === "officer" && t!.role !== "member")) fail("clan_rights");
        await SB.from("clan_members").delete().eq("player_id", pid);
        await clog(me!.clan_id, user, "kick", { who: await nameOf(pid) });
      } else {
        if (me!.role !== "leader") fail("clan_rights");
        const role = String(args.role);
        if (role === "leader") {
          await SB.from("clan_members").update({ role: "leader" }).eq("player_id", pid);
          await SB.from("clan_members").update({ role: "officer" }).eq("player_id", user.id);
          await SB.from("clans").update({ leader: pid }).eq("id", me!.clan_id);
        } else if (role === "officer" || role === "member") await SB.from("clan_members").update({ role }).eq("player_id", pid);
        else fail("bad_role");
        await clog(me!.clan_id, user, "role", { who: await nameOf(pid), role: String(args.role) });
      }
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanBuild": {
      if (!me || !canLead(me.role)) fail("clan_rights");
      const k = String(args.k) as L.BldKey; if (!L.BUILD[k]) fail("bad_role");
      const { data: cv } = await SB.from("clan_view").select("bank,bld,res").eq("id", me!.clan_id).single();
      const lvl = Number((cv!.bld || {})[k] || 0), cost = L.bldCost(k, lvl);
      if (cost === null) fail("max");
      const res = (cv!.res || { m: [0, 0, 0, 0], sh: 0 }) as { m: number[]; sh: number };
      if (Number(cv!.bank || 0) < cost!.gold) fail("clan_no_bank");
      if (Number(res.m?.[cost!.mat] || 0) < cost!.matN || Number(res.sh || 0) < cost!.sh) fail("clan_no_res");
      const { data: left, error } = await SB.rpc("clan_build2", { p_clan: me!.clan_id, p_key: k, p_cost: cost!.gold, p_lvl: lvl, p_mat: cost!.mat, p_matn: cost!.matN, p_sh: cost!.sh }); if (error) throw error;
      if (left === null) fail("busy");
      await clog(me!.clan_id, user, "build", { k, l: lvl + 1, gold: cost!.gold });
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanUnapply": {
      await SB.from("clan_apps").delete().eq("player_id", user.id).eq("clan_id", Number(args.id));
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanApp": {
      if (!me || !canLead(me.role)) fail("clan_rights");
      const { data: ap } = await SB.from("clan_apps").select("id,player_id,clan_id").eq("id", Number(args.id)).maybeSingle();
      if (!ap || ap.clan_id !== me!.clan_id) fail("clan_app_none");
      const who = await nameOf(ap!.player_id as number);
      if (args.ok) {
        const { data: cv } = await SB.from("clan_view").select("members,bld").eq("id", me!.clan_id).single();
        if (cv!.members >= L.clanMax(cv!.bld)) fail("clan_full");
        const { error } = await SB.from("clan_members").insert({ player_id: ap!.player_id, clan_id: me!.clan_id, role: "member" });
        await SB.from("clan_apps").delete().eq("player_id", ap!.player_id);
        if (error) fail("clan_app_taken"); // гравець уже вступив в інший клан
        await clog(me!.clan_id, user, "accept", { who });
      } else {
        await SB.from("clan_apps").delete().eq("id", ap!.id);
        await clog(me!.clan_id, user, "reject", { who });
      }
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanSettings": {
      if (!me || me.role !== "leader") fail("clan_rights");
      const mode = String(args.mode);
      if (!(L.CLAN_MODES as readonly string[]).includes(mode)) fail("bad_role");
      const minStage = Math.max(0, Math.min(80, Math.floor(Number(args.minStage) || 0)));
      const minPower = Math.max(0, Math.min(1e12, Math.floor(Number(args.minPower) || 0)));
      await SB.from("clans").update({ join_mode: mode, min_stage: minStage, min_power: minPower }).eq("id", me!.clan_id);
      await clog(me!.clan_id, user, "settings", { mode, minStage, minPower });
      return { out: await clanInfo(user.id, G, now) };
    }
    case "market": {
      const { data: col, error } = await SB.rpc("market_collect2", { p_seller: user.id }); if (error) throw error;
      const n = Number(col?.[0]?.n || 0), ash = L.marketNet(Number(col?.[0]?.ash || 0)), gold = L.marketNet(Number(col?.[0]?.gold || 0));
      const out = await marketInfo(user.id, args);
      return { out: { ...out, got: { n, ash, gold, net: ash } }, fx: n ? (S) => { S.ash += ash; S.gold += gold; } : undefined };
    }
    case "marketBuy": {
      const { data: lot } = await SB.from("market_lots").select("id,price,seller,buyer,cur,slot").eq("id", Number(args.lot)).maybeSingle();
      if (!lot || lot.buyer) fail("market_gone");
      if (lot!.seller === user.id) fail("market_own");
      const gold = lot!.cur === "gold", lp = Number(lot!.price);
      if ((gold ? G.gold : G.ash) < lp) fail(gold ? "no_gold" : "no_ash");
      if (lot!.slot !== "mat" && G.inv.length >= L.invMax(G)) fail("bag_full");
      const { data: r, error } = await SB.rpc("market_claim", { p_lot: lot!.id, p_buyer: user.id }); if (error) throw error;
      if (!r || !r.id) fail("market_gone");
      const price = Number(r.price), it = r.item as L.Item & Partial<L.MatLot>;
      return { out: { ...(await marketInfo(user.id, args)), bought: it }, fx: (S) => {
        if (gold) S.gold = Math.max(0, S.gold - price); else S.ash = Math.max(0, S.ash - price);
        if (it.kind === "mat") S.mats[it.m!] = (S.mats[it.m!] || 0) + it.n!; else { it.id = S.nid++; it.nw = 1; S.inv.unshift(it); }
      } };
    }
    case "marketCancel": {
      const { data: r, error } = await SB.rpc("market_cancel", { p_lot: Number(args.lot), p_seller: user.id }); if (error) throw error;
      if (!r || !r.id) fail("market_gone");
      const item = r.item as L.Item & Partial<L.MatLot>;
      return { out: await marketInfo(user.id, args), fx: (S) => { if (item.kind === "mat") S.mats[item.m!] = (S.mats[item.m!] || 0) + item.n!; else { item.id = S.nid++; S.inv.unshift(item); } } };
    }
    case "clanCraft": {
      if (!me || !canLead(me.role)) fail("clan_rights");
      const t = Math.floor(Number(args.t)), n = Math.max(1, Math.min(10, Math.floor(Number(args.n) || 1)));
      if (!(t >= 1 && t <= L.DNG_TIERS) || (G.dng?.max || 0) < t) fail("dng_locked");
      // ключі крафтяться за золото з казни клану, не з кишені крафтера
      const { data: cv } = await SB.from("clan_view").select("ash,bld").eq("id", me!.clan_id).single();
      const cost = L.clanKeyCost(t, n, Number((cv!.bld || {}).forge || 0)); // Попіл з казни клану
      if (Number(cv!.ash || 0) < cost) fail("clan_no_ash");
      const { data: left, error } = await SB.rpc("clan_craft_ash", { p_clan: me!.clan_id, p_tier: t, p_n: n, p_cost: cost }); if (error) throw error;
      if (left === null) fail("busy"); // хтось скрафтив одночасно — ціна змінилась
      await clog(me!.clan_id, user, "craft", { t, n, ash: cost });
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanTake": {
      if (!me) fail("clan_none");
      const t = Math.floor(Number(args.t));
      const { data: left, error } = await SB.rpc("clan_keys_add", { p_clan: me!.clan_id, p_tier: t, p_n: -1 }); if (error) throw error;
      if (left === null) fail("clan_no_keys");
      await clog(me!.clan_id, user, "take", { t });
      return { fx: (S) => { S.keys[String(t)] = (S.keys[String(t)] || 0) + 1; }, out: await clanInfo(user.id, G, now) };
    }
  }
  return {};
}

async function handle(user: TgUser, start: string | undefined, action: string, args: Record<string, unknown>) {
  const pre: Pre | null = PRE.has(action) ? await preAction(user, start, action, args) : null;
  const giveTo = action === "clanGive" || action === "clanGiveRes" || action === "clanGiveAsh" ? await clanOf(user.id) : null;
  await settleWeek(Date.now());
  // нагороди тижневих рейтингів забираємо лише на sync: він не кидає ігрових помилок, тож нагорода не загубиться
  const reward = action === "sync" ? Number((await SB.rpc("reward_claim", { p_player: user.id })).data || 0) : 0;
  const cb = await clanBonusOf(user.id); // бонуси будівель клану (0, якщо гравець не в клані)
  for (let attempt = 0; attempt < 4; attempt++) {
    const now = Date.now();
    const { version, state, isNew } = await loadOrCreate(user, start, now);
    const G = state;
    G.cb = cb;
    const prog = L.progress(G, now);
    let out: unknown = null;
    let pvp: { def: number | null; oppRating: number; win: boolean } | null = null;
    let give = 0, giveAsh = 0;
    let sellLot: { it?: L.Item; mat?: L.MatLot; price: number; cur: L.MCur } | null = null;
    let giveRes: { k: string; n: number } | null = null;
    const before = { gold: G.gold, souls: G.souls, ash: G.ash, shards: G.shards, cat: G.cat, ess: G.ess };
    if (reward) { G.ash += reward; G.log.unshift({ t: now, k: "reward", a: [reward] }); if (G.log.length > 40) G.log.length = 40; }
    if (pre) { pre.fx?.(G, now); out = pre.out; }
    else switch (action) {
      case "sync": break;
      case "upgrade": out = L.actUpgrade(G, String(args.k), Number(args.n ?? 1)); break;
      case "equip": out = L.actEquip(G, Number(args.id)); break;
      case "equipBest": out = L.actEquipBest(G); break;
      case "sell": out = L.actSell(G, args.ids as number[]); break;
      case "stage": out = L.actStage(G, Number(args.s)); break;
      case "boss": out = L.actBoss(G); break;
      case "settings": out = L.actSettings(G, args as { autoBoss?: boolean; autoSell?: boolean }); break;
      case "seen": out = L.actSeen(G); break;
      case "daily": out = L.actDaily(G, now); break;
      case "dismantle": out = L.actDismantle(G, args.ids as number[], String(args.mode)); break;
      case "dismantleJunk": out = L.actDismantleJunk(G, String(args.mode)); break;
      case "enchant": out = L.actEnchant(G, args.id as number | undefined); break;
      case "mythic": out = L.actMythic(G, args.ids as number[]); break;
      case "dungeon": out = Number(args.n) > 1 ? L.actDungeonBatch(G, Number(args.t), now, Number(args.d) || 1, Number(args.n)) : L.actDungeon(G, Number(args.t), now, Number(args.d) || 1); break;
      case "smelt": out = L.actSmelt(G, Number(args.n ?? 1)); break;
      case "bag": out = L.actBag(G); break;
      case "vault": out = L.actVault(G); break;
      case "ovfSeen": out = L.actOvfSeen(G); break;
      case "openChests": out = L.actOpenChests(G); break;
      case "astral": out = L.actAstral(G, Number(args.id)); break;
      case "arena": case "arenaRefresh": {
        if (G.maxStage < L.ARENA.stage) throw new L.GameError("arena_locked");
        L.arenaDay(G, now); G.arena.rating = await myRating(user.id);
        if (action === "arenaRefresh" || G.arena.opps.length < 3) G.arena.opps = await pickOpps(G, user.id);
        out = await arenaDivision(G.arena.rating);
        break;
      }
      case "arenaFight": {
        if (G.maxStage < L.ARENA.stage) throw new L.GameError("arena_locked");
        L.arenaDay(G, now);
        if (G.arena.used >= L.ARENA.daily) throw new L.GameError("arena_limit");
        const o = G.arena.opps[Number(args.i)]; if (!o) throw new L.GameError("bad_opp");
        G.arena.rating = await myRating(user.id);
        const f = L.pvpFight(L.heroSnap(G), o.st);
        const e = 1 / (1 + Math.pow(10, (o.rating - G.arena.rating) / 400)), d = Math.round(32 * ((f.win ? 1 : 0) - e));
        G.arena.used++; G.arena.pts += f.win ? L.ARENA.win : L.ARENA.lose;
        if (f.win) G.arena.w++; else G.arena.l++;
        G.arena.rating = Math.max(0, G.arena.rating + d);
        pvp = { def: o.id, oppRating: o.rating, win: f.win };
        G.log.unshift({ t: now, k: "arena", a: [f.win ? 1 : 0, o.name, d] }); if (G.log.length > 40) G.log.length = 40;
        out = { ...f, opp: { name: o.name, lvl: o.lvl, power: o.power, st: o.st }, me: L.heroSnap(G), delta: d, pts: f.win ? L.ARENA.win : L.ARENA.lose };
        G.arena.opps = await pickOpps(G, user.id);
        break;
      }
      case "clanGive": {
        // внесок у казну: золото списується зі стану під оптимістичним блокуванням, у казну — лише після успішного запису
        if (!giveTo) throw new L.GameError("clan_none");
        const amt = Math.floor(Number(args.amt));
        if (!(amt >= 1) || amt > G.gold) throw new L.GameError("no_gold");
        G.gold -= amt; give = amt;
        break;
      }
      case "clanGiveAsh": {
        if (!giveTo) throw new L.GameError("clan_none");
        const amt = Math.floor(Number(args.amt));
        if (!(amt >= 1) || amt > G.ash) throw new L.GameError("no_ash");
        G.ash -= amt; giveAsh = amt;
        break;
      }
      case "clanGiveRes": {
        if (!giveTo) throw new L.GameError("clan_none");
        giveRes = L.clanResTake(G, String(args.k), Number(args.n));
        break;
      }
      case "marketSell": {
        const { count } = await SB.from("market_lots").select("id", { count: "exact", head: true }).eq("seller", user.id).is("buyer", null);
        if ((count || 0) >= L.MARKET.maxLots) throw new L.GameError("market_max");
        sellLot = args.kind === "mat" ? L.marketTakeMat(G, Number(args.m), Number(args.n), Number(args.price), args.cur) : L.marketTake(G, Number(args.id), Number(args.price), args.cur);
        break;
      }
      case "arenaShop": out = L.actArenaShop(G, String(args.item)); break;
      case "top": out = await topList(String(args.kind), user.id); break;
      default: throw new L.GameError("bad_action");
    }
    const { data, error } = await SB.from("game_state")
      .update({ state: G, version: version + 1, updated_at: new Date(now).toISOString() })
      .eq("player_id", user.id).eq("version", version).select("version");
    if (error) throw error;
    if (!data || !data.length) continue; // хтось записав раніше — повторюємо
    // бій на арені: рейтинг рахує база атомарно
    if (pvp) {
      const { data: rr, error: re } = await SB.rpc("arena_result", { p_att: user.id, p_def: pvp.def, p_win: pvp.win, p_opp_rating: pvp.oppRating });
      if (re) console.error(re); else if (rr && rr[0]) { (out as Record<string, unknown>).delta = rr[0].delta; (out as Record<string, unknown>).rating = rr[0].new_rating; }
    }
    if (give && giveTo) {
      const { error: ge } = await SB.rpc("clan_bank_give", { p_clan: giveTo.clan_id, p_player: user.id, p_amt: give }); if (ge) console.error(ge);
      await clog(giveTo.clan_id, user, "give", { gold: give });
      out = await clanInfo(user.id, G, now);
    }
    if (giveAsh && giveTo) {
      const { error: ge } = await SB.rpc("clan_ash_give", { p_clan: giveTo.clan_id, p_player: user.id, p_amt: giveAsh }); if (ge) console.error(ge);
      await clog(giveTo.clan_id, user, "giveash", { ash: giveAsh });
      out = await clanInfo(user.id, G, now);
    }
    if (giveRes && giveTo) {
      const { error: ge } = await SB.rpc("clan_res_give", { p_clan: giveTo.clan_id, p_k: giveRes.k, p_n: giveRes.n }); if (ge) console.error(ge);
      await clog(giveTo.clan_id, user, "giveres", { k: giveRes.k, n: giveRes.n });
      out = await clanInfo(user.id, G, now);
    }
    if (sellLot) {
      const it = sellLot.it, mt = sellLot.mat;
      const row = it ? { item: it, slot: it.slot, rarity: it.r, ilvl: it.il } : { item: mt, slot: "mat", rarity: mt!.m, ilvl: mt!.n };
      const { error: me2 } = await SB.from("market_lots").insert({ seller: user.id, seller_name: uname(user), ...row, price: sellLot.price, cur: sellLot.cur });
      if (me2) console.error("market insert", me2, JSON.stringify(row));
      out = await marketInfo(user.id, args);
    }
    // публічні показники для рейтингів
    if (action !== "sync" || prog.lvlUps || prog.boss?.win || isNew) {
      const H = L.hero(G);
      await SB.from("stats").upsert({ player_id: user.id, name: (user.first_name || user.username || "Hero").slice(0, 24), lvl: G.lvl, max_stage: G.maxStage, power: L.power(H), snap: L.heroSnap(G), updated_at: new Date(now).toISOString() }, { onConflict: "player_id" });
    }
    // журнал: не пишемо кожну синхронізацію, лише дії та помітні події
    const notable = action !== "sync" || prog.offline || prog.boss || isNew;
    if (notable) {
      await SB.from("ledger").insert({
        player_id: user.id, reason: isNew ? "new_player" : action,
        delta: {
          gold: Math.round(G.gold - before.gold + prog.gold), souls: G.souls - before.souls + (prog.souls || 0), ash: G.ash - before.ash,
          shards: G.shards - before.shards, cat: G.cat - before.cat, ess: G.ess - before.ess,
          prog: { sec: Math.round(prog.sec), kills: prog.kills, items: prog.items, boss: prog.boss?.win }, stage: G.stage,
          ...(action === "mythic" || action === "enchant" || action === "astral" ? { out } : {}),
          ...(action === "dungeon" ? { dng: { t: (out as { t: number }).t, d: (out as { d: number }).d, full: (out as { full?: boolean }).full, runs: (out as { runs?: number }).runs, wins: (out as { wins?: number }).wins } } : {}),
        },
      });
    }
    return { ok: true, isNew, prog, out, reward, view: view(G, now, user.id) };
  }
  throw new Error("busy");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, err: "method" }, 405);
  let body: { initData?: string; action?: string; args?: Record<string, unknown>; dev?: TgUser };
  try { body = await req.json(); } catch { return json({ ok: false, err: "bad_json" }, 400); }
  let auth = await verify(body.initData || "");
  if (!auth && DEV_KEY && req.headers.get("x-dev-key") === DEV_KEY && body.dev?.id) auth = { user: body.dev };
  if (!auth || !auth.user?.id) { console.log("auth fail", lastAuthErr); return json({ ok: false, err: "auth", why: lastAuthErr }, 401); }
  try {
    const { data: pl } = await SB.from("players").select("banned").eq("tg_id", auth.user.id).maybeSingle();
    if (pl?.banned) return json({ ok: false, err: "banned" }, 403);
    return json(await handle(auth.user, auth.start, body.action || "sync", body.args || {}));
  } catch (e) {
    if (e instanceof L.GameError) return json({ ok: false, err: e.message }, 400);
    console.error(e);
    return json({ ok: false, err: "server" }, 500);
  }
});
