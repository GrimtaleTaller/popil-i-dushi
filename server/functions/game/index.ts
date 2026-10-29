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
    isAdmin: ADMINS.includes(uid), clanStage: L.CLAN.joinStage,
    payout: { lvl: L.PAYOUT.lvl, days: L.PAYOUT.days, myDays: G.act.days, ok: G.lvl >= L.PAYOUT.lvl && G.act.days >= L.PAYOUT.days },
    smelt: L.SMELT,
    train: { gateStep: L.GATE_STEP, gate: Object.fromEntries(Object.keys(L.UPG).map((k) => [k, L.gateCost(k, G.up[k as keyof L.State["up"]])])) },
    dng: {
      unlockStage: L.DNG_UNLOCK_STAGE, rooms: L.DNG_ROOMS, daily: L.DNG_DAILY, left: L.dngLeft(G, now),
      tiers: Array.from({ length: L.DNG_TIERS }, (_, i) => {
        const t = i + 1, open = L.dngOpen(G, t);
        return { t, open, loc: L.dngLoc(t), stage: L.dngStage(t), price: L.keyPrice(t), keys: G.keys[String(t)] || 0, rw: L.dngRewards(t), pay: L.dngPrice(G, t, now), est: open ? L.dngEstimate(G, t) : null };
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
async function topList(kind: string, id: number) {
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
  return { kind, rows, me, total: total || 0 };
}
async function arenaDivision(rating: number) {
  const { count: total } = await SB.from("stats").select("player_id", { count: "exact", head: true }).or("wins.gt.0,losses.gt.0");
  const { count: above } = await SB.from("stats").select("player_id", { count: "exact", head: true }).gt("rating", rating).or("wins.gt.0,losses.gt.0");
  const t = total || 0, top = t ? (above || 0) / t : 1;
  return { top: Math.round(top * 1000) / 10, div: top <= 0.03 ? 4 : top <= 0.1 ? 3 : top <= 0.3 ? 2 : top <= 0.6 ? 1 : 0, total: t };
}

// ---------- профіль, клани, адмін: дії з базою, що виконуються один раз до запису стану ----------
type Pre = { out?: unknown; fx?: (G: L.State, now: number) => void };
const PRE = new Set(["profile", "admin", "clan", "clanCreate", "clanJoin", "clanLeave", "clanKick", "clanRole", "clanCraft", "clanTake"]);
const fail = (m: string): never => { throw new L.GameError(m); };
async function clanOf(id: number) {
  const { data } = await SB.from("clan_members").select("clan_id,role").eq("player_id", id).maybeSingle();
  return data as { clan_id: number; role: string } | null;
}
async function clanInfo(id: number, G: L.State, now: number) {
  const me = await clanOf(id);
  const base = { max: L.CLAN.max, createStage: L.CLAN.createStage, joinStage: L.CLAN.joinStage, createCost: L.clanCreateCost(G), take: L.CLAN.take, takeLeft: L.ckeyLeft(G, now) };
  if (!me) {
    const { data } = await SB.from("clan_view").select("id,name,members,power").order("power", { ascending: false }).limit(30);
    return { ...base, clan: null, list: (data || []).map((c) => ({ ...c, power: Number(c.power) })) };
  }
  const { data: c } = await SB.from("clan_view").select("id,name,members,power,keys").eq("id", me.clan_id).single();
  const { data: ms } = await SB.from("clan_members").select("player_id,role,joined_at").eq("clan_id", me.clan_id);
  const ids = (ms || []).map((m) => m.player_id as number);
  const { data: st } = await SB.from("stats").select("player_id,name,lvl,max_stage,power").in("player_id", ids);
  const { data: pl } = await SB.from("players").select("tg_id,last_seen,first_name").in("tg_id", ids);
  const ro: Record<string, number> = { leader: 0, officer: 1, member: 2 };
  const members = (ms || []).map((m) => {
    const x = (st || []).find((y) => y.player_id === m.player_id), p = (pl || []).find((y) => y.tg_id === m.player_id);
    return { id: m.player_id, name: String(x?.name || p?.first_name || "Hero").slice(0, 24), lvl: x?.lvl || 1, stage: x?.max_stage || 1, power: Number(x?.power || 0), role: m.role, seen: p?.last_seen || null, me: m.player_id === id };
  }).sort((a, b) => ro[a.role] - ro[b.role] || b.power - a.power);
  const craft = Array.from({ length: L.DNG_TIERS }, (_, i) => ({ t: i + 1, gold: L.clanKeyCost(i + 1), can: (G.dng?.max || 0) >= i + 1 }));
  return { ...base, clan: { id: c!.id, name: c!.name, members: c!.members, power: Number(c!.power), keys: c!.keys || {} }, role: me.role, members, craft };
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
    case "clan": return { out: await clanInfo(user.id, G, now) };
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
      return { fx: (S) => { S.gold = Math.max(0, S.gold - cost); }, out: await clanInfo(user.id, G, now) };
    }
    case "clanJoin": {
      if (me) fail("clan_already");
      if (G.maxStage < L.CLAN.joinStage) fail("clan_stage");
      const { data: c } = await SB.from("clan_view").select("id,members").eq("id", Number(args.id)).maybeSingle();
      if (!c) fail("clan_none");
      if (c!.members >= L.CLAN.max) fail("clan_full");
      const { error } = await SB.from("clan_members").insert({ player_id: user.id, clan_id: c!.id, role: "member" });
      if (error) fail("clan_already");
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
      } else {
        if (me!.role !== "leader") fail("clan_rights");
        const role = String(args.role);
        if (role === "leader") {
          await SB.from("clan_members").update({ role: "leader" }).eq("player_id", pid);
          await SB.from("clan_members").update({ role: "officer" }).eq("player_id", user.id);
          await SB.from("clans").update({ leader: pid }).eq("id", me!.clan_id);
        } else if (role === "officer" || role === "member") await SB.from("clan_members").update({ role }).eq("player_id", pid);
        else fail("bad_role");
      }
      return { out: await clanInfo(user.id, G, now) };
    }
    case "clanCraft": {
      if (!me || !canLead(me.role)) fail("clan_rights");
      const t = Math.floor(Number(args.t)), n = Math.max(1, Math.min(10, Math.floor(Number(args.n) || 1)));
      if (!(t >= 1 && t <= L.DNG_TIERS) || (G.dng?.max || 0) < t) fail("dng_locked");
      const cost = L.clanKeyCost(t) * n; if (G.gold < cost) fail("no_gold");
      const { error } = await SB.rpc("clan_keys_add", { p_clan: me!.clan_id, p_tier: t, p_n: n }); if (error) throw error;
      return { fx: (S) => { S.gold = Math.max(0, S.gold - cost); }, out: await clanInfo(user.id, G, now) };
    }
    case "clanTake": {
      if (!me) fail("clan_none");
      const t = Math.floor(Number(args.t));
      if (L.ckeyLeft(G, now) <= 0) fail("clan_take_limit");
      const { data: left, error } = await SB.rpc("clan_keys_add", { p_clan: me!.clan_id, p_tier: t, p_n: -1 }); if (error) throw error;
      if (left === null) fail("clan_no_keys");
      const info = await clanInfo(user.id, G, now);
      (info as { takeLeft: number }).takeLeft = Math.max(0, info.takeLeft - 1);
      return { fx: (S, nw) => { S.keys[String(t)] = (S.keys[String(t)] || 0) + 1; L.ckeyUse(S, nw); }, out: info };
    }
  }
  return {};
}

async function handle(user: TgUser, start: string | undefined, action: string, args: Record<string, unknown>) {
  const pre: Pre | null = PRE.has(action) ? await preAction(user, start, action, args) : null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const now = Date.now();
    const { version, state, isNew } = await loadOrCreate(user, start, now);
    const G = state;
    const prog = L.progress(G, now);
    let out: unknown = null;
    let pvp: { def: number | null; oppRating: number; win: boolean } | null = null;
    const before = { gold: G.gold, souls: G.souls, ash: G.ash, shards: G.shards, cat: G.cat, ess: G.ess };
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
      case "dungeon": out = L.actDungeon(G, Number(args.t), now); break;
      case "smelt": out = L.actSmelt(G, Number(args.n ?? 1)); break;
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
          ...(action === "dungeon" ? { dng: { t: (out as { t: number }).t, full: (out as { full: boolean }).full } } : {}),
        },
      });
    }
    return { ok: true, isNew, prog, out, view: view(G, now, user.id) };
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
