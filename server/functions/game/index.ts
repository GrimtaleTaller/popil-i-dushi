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
async function verify(initData: string): Promise<{ user: TgUser; start?: string } | null> {
  if (!initData || !BOT_TOKEN) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get("hash"); if (!hash) return null;
  p.delete("hash");
  const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const calc = hex(await hmac(secret, dcs));
  if (calc !== hash) return null;
  const ad = Number(p.get("auth_date") || 0);
  if (!ad || Date.now() / 1000 - ad > MAX_AGE) return null;
  try { return { user: JSON.parse(p.get("user") || "null"), start: p.get("start_param") || undefined }; } catch { return null; }
}

async function loadOrCreate(u: TgUser, start: string | undefined, now: number) {
  const { data: row, error } = await SB.from("game_state").select("version,state").eq("player_id", u.id).maybeSingle();
  if (error) throw error;
  const prof = { username: u.username ?? null, first_name: u.first_name ?? null, lang: u.language_code ?? null, is_premium: !!u.is_premium, last_seen: new Date(now).toISOString() };
  if (row) {
    await SB.from("players").update(prof).eq("tg_id", u.id);
    return { version: row.version as number, state: row.state as L.State, isNew: false };
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
  return { s: G, hero: { ...H, power: L.power(H) }, daily: L.dailyInfo(G, now), canFarm: L.canFarm(G, G.stage), kt: L.killTime(G, G.stage), now };
}

async function handle(user: TgUser, start: string | undefined, action: string, args: Record<string, unknown>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const now = Date.now();
    const { version, state, isNew } = await loadOrCreate(user, start, now);
    const G = state;
    const prog = L.progress(G, now);
    let out: unknown = null;
    const goldBefore = G.gold;
    switch (action) {
      case "sync": break;
      case "upgrade": out = L.actUpgrade(G, String(args.k)); break;
      case "equip": out = L.actEquip(G, Number(args.id)); break;
      case "equipBest": out = L.actEquipBest(G); break;
      case "sell": out = L.actSell(G, args.ids as number[]); break;
      case "stage": out = L.actStage(G, Number(args.s)); break;
      case "boss": out = L.actBoss(G); break;
      case "settings": out = L.actSettings(G, args as { autoBoss?: boolean; autoSell?: boolean }); break;
      case "seen": out = L.actSeen(G); break;
      case "daily": out = L.actDaily(G, now); break;
      default: throw new L.GameError("bad_action");
    }
    const { data, error } = await SB.from("game_state")
      .update({ state: G, version: version + 1, updated_at: new Date(now).toISOString() })
      .eq("player_id", user.id).eq("version", version).select("version");
    if (error) throw error;
    if (!data || !data.length) continue; // хтось записав раніше — повторюємо
    // журнал: не пишемо кожну синхронізацію, лише дії та помітні події
    const notable = action !== "sync" || prog.offline || prog.boss || isNew;
    if (notable) {
      await SB.from("ledger").insert({
        player_id: user.id, reason: isNew ? "new_player" : action,
        delta: { gold: Math.round(G.gold - goldBefore + prog.gold), prog: { sec: Math.round(prog.sec), kills: prog.kills, items: prog.items, boss: prog.boss?.win }, stage: G.stage },
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
  if (!auth || !auth.user?.id) return json({ ok: false, err: "auth" }, 401);
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
