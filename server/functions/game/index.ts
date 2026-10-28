// Grimtale: сервер гри. Один ендпоінт POST { initData, action, args }.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as L from "./logic.ts";

const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const DEV_KEY = Deno.env.get("DEV_KEY") ?? ""; // лише для тестів; на проді секрет не задано
const MAX_AGE = 24 * 3600; // initData дійсні добу

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

function view(G: L.State, now: number) {
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
    payout: { lvl: L.PAYOUT.lvl, days: L.PAYOUT.days, myDays: G.act.days, ok: G.lvl >= L.PAYOUT.lvl && G.act.days >= L.PAYOUT.days },
    smelt: L.SMELT,
    train: { gateStep: L.GATE_STEP, gate: Object.fromEntries(Object.keys(L.UPG).map((k) => [k, L.gateCost(k, G.up[k as keyof L.State["up"]])])) },
    dng: {
      unlockStage: L.DNG_UNLOCK_STAGE, rooms: L.DNG_ROOMS, daily: L.DNG_DAILY, left: L.dngLeft(G, now),
      tiers: Array.from({ length: L.DNG_TIERS }, (_, i) => {
        const t = i + 1, open = L.dngOpen(G, t);
        return { t, open, loc: L.dngLoc(t), stage: L.dngStage(t), price: L.keyPrice(t), keys: G.keys[String(t)] || 0, rw: L.dngRewards(t), est: open ? L.dngEstimate(G, t) : null };
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

async function handle(user: TgUser, start: string | undefined, action: string, args: Record<string, unknown>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const now = Date.now();
    const { version, state, isNew } = await loadOrCreate(user, start, now);
    const G = state;
    const prog = L.progress(G, now);
    let out: unknown = null;
    let pvp: { def: number | null; oppRating: number; win: boolean } | null = null;
    const before = { gold: G.gold, souls: G.souls, ash: G.ash, shards: G.shards, cat: G.cat, ess: G.ess };
    switch (action) {
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
    return { ok: true, isNew, prog, out, view: view(G, now) };
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
