// Ігрова логіка Grimtale. Сервер — єдине джерело правди: клієнт лише показує.

export const SLOTS = ["weapon", "helmet", "armor", "boots", "ring", "amulet"] as const;
export type Slot = typeof SLOTS[number];
type Stats = { atk?: number; hp?: number; def?: number; crit?: number };

export const SLOT: Record<Slot, { st: Stats; names: number }> = {
  weapon: { st: { atk: 5 }, names: 5 },
  helmet: { st: { hp: 22 }, names: 4 },
  armor: { st: { hp: 14, def: 2 }, names: 4 },
  boots: { st: { def: 3 }, names: 4 },
  ring: { st: { atk: 2, crit: 1 }, names: 4 },
  amulet: { st: { atk: 2, hp: 10 }, names: 4 },
};
// рідкість: множник і вага випадіння
export const RAR = [
  { m: 1, w: 62 },
  { m: 1.5, w: 25 },
  { m: 2.2, w: 9.5 },
  { m: 3.2, w: 3 },
  { m: 5, w: 0.5 },
  { m: 7.5, w: 0 }, // міфічний — лише крафт
];
export const DROP_RAR = 5; // скільки рідкостей може випасти
export const UPG: Record<string, { val: (l: number) => number; cost: (l: number) => number; max?: number }> = {
  atk: { val: (l) => 3 * l * Math.pow(1.06, l), cost: (l) => 15 * Math.pow(1.15, l) },
  hp: { val: (l) => 15 * l * Math.pow(1.06, l), cost: (l) => 15 * Math.pow(1.15, l) },
  def: { val: (l) => 1.2 * l * Math.pow(1.06, l), cost: (l) => 25 * Math.pow(1.16, l) },
  crit: { val: (l) => 0.5 * Math.min(l, 50), cost: (l) => 40 * Math.pow(1.22, l), max: 50 },
};
export const WAVES = 10;
export const BOSS_TIME = 30;
export const OFFLINE_MAX = 8 * 3600;
export const ONLINE_WINDOW = 90; // секунд між синхронізаціями, що рахуються як «онлайн»
export const OFFLINE_RATE = 0.5; // офлайн герой фармить удвічі повільніше
export const INV_MAX = 40;
export const DROP = 0.12;
export const REGIONS = 8;
export const ENCH_STEP = 0.08, ENCH_MAX = 25;
export const MYTH = { base: 30, extra: 10, fail: 5, cap: 80, need: 3 };
// Душі: лише за рівень і час гри, донат на них не впливає
export const soulsPerHour = (G: State) => (10 + 2 * G.lvl) * (1 + 0.06 * mythicCount(G));
export const mythicCount = (G: State) => SLOTS.filter((s) => (G.eq[s]?.r ?? 0) >= 5).length;
export const catChance = (s: number) => (s % 10 === 0 ? 1 : 0.2); // каталізатор з боса; регіональний бос — завжди
export const disXp = (it: Item) => Math.round(mobXp(it.il) * 3 * RAR[it.r].m);
export const disShards = (it: Item) => Math.round((it.r + 1) * (it.r + 1) * (1 + it.il / 10));
export const enchCost = (G: State) => ({ shards: 40 * (G.ench + 1), gold: Math.round(mobGold(G.maxStage) * 40 * (G.ench + 1)), legendary: 1 });
export const mythSouls = (il: number) => Math.round(150 + il * 5);
export function mythChance(G: State, n: number) {
  return Math.min(MYTH.cap, MYTH.base + MYTH.extra * Math.max(0, n - MYTH.need) + MYTH.fail * (G.mythFails || 0));
}

export const mobHp = (s: number) => 25 * Math.pow(1.25, s - 1);
export const mobAtk = (s: number) => 4 * Math.pow(1.19, s - 1);
export const mobGold = (s: number) => 4 * Math.pow(1.17, s - 1);
export const mobXp = (s: number) => 6 * Math.pow(1.14, s - 1);
export const xpNeed = (l: number) => Math.floor(25 * Math.pow(1.2, l - 1));
export const gearScale = (il: number) => Math.pow(1.16, il - 1);

export type Item = { id: number; slot: Slot; r: number; il: number; nm: number; st: Stats; nw?: number };
export type LogE = { t: number; k: string; a?: (string | number)[] };
export type State = {
  v: 2;
  lvl: number; xp: number; gold: number;
  stage: number; maxStage: number; kills: number; frac: number;
  autoBoss: boolean; autoSell: boolean;
  up: { atk: number; hp: number; def: number; crit: number };
  eq: Partial<Record<Slot, Item>>; inv: Item[]; nid: number;
  tick: number; // мс, коли востаннє рахували прогрес
  daily: { date: string; streak: number };
  tot: { kills: number; bosses: number; deaths: number };
  log: LogE[];
  // валюти й ресурси
  souls: number; ash: number; shards: number; cat: number;
  soulFrac: number;
  ench: number; mythFails: number; dismode: "xp" | "shards";
};

export function fresh(now: number): State {
  return {
    v: 2, lvl: 1, xp: 0, gold: 0, stage: 1, maxStage: 1, kills: 0, frac: 0,
    autoBoss: false, autoSell: false, up: { atk: 0, hp: 0, def: 0, crit: 0 },
    eq: {}, inv: [], nid: 1, tick: now, daily: { date: "", streak: 0 },
    tot: { kills: 0, bosses: 0, deaths: 0 }, log: [{ t: now, k: "start" }],
    souls: 0, ash: 0, shards: 0, cat: 0, soulFrac: 0, ench: 0, mythFails: 0, dismode: "shards",
  };
}
// дописує нові поля до старих збережень
export function migrate(G: State): State {
  const d = fresh(G.tick || Date.now()) as unknown as Record<string, unknown>;
  const g = G as unknown as Record<string, unknown>;
  for (const k of ["souls", "ash", "shards", "cat", "soulFrac", "ench", "mythFails", "dismode"]) if (g[k] === undefined) g[k] = d[k];
  return G;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function hero(G: State) {
  let a = 8 + UPG.atk.val(G.up.atk) + 2 * (G.lvl - 1);
  let h = 60 + UPG.hp.val(G.up.hp) + 10 * (G.lvl - 1);
  let d = UPG.def.val(G.up.def);
  let c = 5 + UPG.crit.val(G.up.crit);
  const em = 1 + ENCH_STEP * (G.ench || 0);
  for (const s of SLOTS) {
    const it = G.eq[s];
    if (it) { a += (it.st.atk || 0) * em; h += (it.st.hp || 0) * em; d += (it.st.def || 0) * em; c += it.st.crit || 0; }
  }
  return { atk: a, hp: h, def: d, crit: Math.min(60, c) };
}
export const power = (h: ReturnType<typeof hero>) => Math.round(h.atk * (1 + h.crit / 100) * 2 + h.hp * 0.25 + h.def * 1.5);
export function itemScore(G: State, it: Item) {
  return (it.st.atk || 0) * 2 + (it.st.hp || 0) * 0.25 + (it.st.def || 0) * 1.5 + (it.st.crit || 0) * 0.03 * hero(G).atk;
}
export const sellPrice = (it: Item) => Math.max(1, Math.round(mobGold(it.il) * 2 * Math.pow(RAR[it.r].m, 1.5)));

function log(G: State, k: string, a?: (string | number)[]) {
  G.log.unshift({ t: Date.now(), k, a });
  if (G.log.length > 40) G.log.length = 40;
}

export function makeItem(G: State, ilvl: number, minR: number): Item {
  let r = minR;
  const tot = RAR.reduce((s, x, i) => s + (i >= minR && i < DROP_RAR ? x.w : 0), 0);
  let roll = Math.random() * tot;
  for (let i = minR; i < DROP_RAR; i++) { roll -= RAR[i].w; r = i; if (roll <= 0) break; }
  return buildItem(G, ilvl, r, pick(SLOTS));
}
export function buildItem(G: State, ilvl: number, r: number, slot: Slot): Item {
  const def = SLOT[slot], sc = gearScale(ilvl) * RAR[r].m * rnd(0.9, 1.1), st: Stats = {};
  for (const k in def.st) {
    const key = k as keyof Stats, base = def.st[key]!;
    st[key] = key === "crit" ? Math.round(base * RAR[r].m * 10) / 10 : Math.max(1, Math.round(base * sc));
  }
  if (r >= 2) {
    const pool = (["atk", "hp", "def"] as const).filter((k) => !(k in st));
    const k = pick(pool), base = { atk: 3, hp: 14, def: 2 }[k];
    st[k] = Math.max(1, Math.round(base * sc * 0.5));
  }
  if (r >= 3) st.crit = Math.round(((st.crit || 0) + rnd(1, 2.5) * (r - 1)) * 10) / 10;
  return { id: G.nid++, slot, r, il: ilvl, nm: Math.floor(Math.random() * def.names), st, nw: 1 };
}

// додає предмет; повертає золото, якщо предмет продано автоматично
function addItem(G: State, it: Item, fromBoss: boolean): number {
  if (G.autoSell && it.r === 0 && !fromBoss) { const g = sellPrice(it); G.gold += g; return g; }
  if (G.inv.length >= INV_MAX) { const g = sellPrice(it); G.gold += g; log(G, "bagfull"); return g; }
  G.inv.unshift(it);
  if (it.r >= 2) log(G, "loot", [it.r, it.slot, it.nm, it.il]);
  return 0;
}

function gainXp(G: State, x: number): number {
  G.xp += x; let ups = 0;
  while (G.xp >= xpNeed(G.lvl)) { G.xp -= xpNeed(G.lvl); G.lvl++; ups++; }
  if (ups) log(G, "lvl", [G.lvl]);
  return ups;
}

// Чи витримує герой звичайних ворогів етапу s
export function canFarm(G: State, s: number) {
  const H = hero(G);
  const dmg = H.atk * (1 + H.crit / 100);
  const kt = Math.ceil(mobHp(s) / dmg) + 0.45;
  const taken = Math.max(mobAtk(s) * 0.2, mobAtk(s) - H.def) / 1.4 * kt;
  return taken < H.hp * 0.8 + H.hp * 0.02 * kt;
}
export function killTime(G: State, s: number) {
  const H = hero(G);
  return Math.ceil(mobHp(s) / (H.atk * (1 + H.crit / 100))) + 0.45;
}

export type Progress = { sec: number; offline: boolean; stage: number; kills: number; gold: number; xp: number; items: number; lvlUps: number; souls?: number; boss?: BossResult };

// Нараховує прогрес за час, що минув з G.tick.
export function progress(G: State, now: number): Progress {
  const sec = Math.max(0, Math.min(OFFLINE_MAX, (now - G.tick) / 1000));
  G.tick = now;
  const offline = sec > ONLINE_WINDOW;
  const res: Progress = { sec, offline, stage: G.stage, kills: 0, gold: 0, xp: 0, items: 0, lvlUps: 0, souls: 0 };
  if (sec < 0.5) return res;
  const eff = Math.min(sec, ONLINE_WINDOW) + Math.max(0, sec - ONLINE_WINDOW) * OFFLINE_RATE;
  const sf = eff / 3600 * soulsPerHour(G) + (G.soulFrac || 0);
  const souls = Math.floor(sf); G.soulFrac = sf - souls; G.souls += souls; res.souls = souls;
  // офлайн герой сам відступає на етап, який тягне
  if (offline) { while (G.stage > 1 && !canFarm(G, G.stage)) G.stage--; res.stage = G.stage; }
  if (!canFarm(G, G.stage)) { G.frac = 0; return res; }
  const s = G.stage;
  const k = eff / killTime(G, s) + G.frac;
  const kills = Math.floor(k);
  G.frac = k - kills;
  if (!kills) return res;
  const gold = kills * mobGold(s), xp = kills * mobXp(s);
  G.gold += gold; res.gold = gold; res.xp = xp;
  res.lvlUps = gainXp(G, xp);
  G.tot.kills += kills; res.kills = kills;
  if (G.stage === G.maxStage) G.kills = Math.min(WAVES, G.kills + kills);
  // лут: очікувана кількість + випадковість; офлайн не більше 15 предметів
  let drops = 0;
  const exp = kills * DROP;
  drops = Math.floor(exp) + (Math.random() < exp - Math.floor(exp) ? 1 : 0);
  if (offline) drops = Math.min(15, drops);
  for (let i = 0; i < drops; i++) { res.gold += addItem(G, makeItem(G, s, 0), false); res.items++; }
  if (offline && sec >= 60) log(G, "offline", [Math.round(sec), Math.round(res.gold), res.items, res.souls || 0]);
  // авто-бос
  if (G.autoBoss && G.kills >= WAVES && G.stage === G.maxStage) res.boss = fightBoss(G);
  return res;
}

export type BossEv = [number, 0 | 1, number, 0 | 1]; // [час, хто б'є: 0 герой / 1 бос, шкода, крит]
export type BossResult = { win: boolean; ev: BossEv[]; hp: number; bossHp: number; gold: number; xp: number; item?: Item; stage: number; timeout?: boolean; souls?: number; cat?: number; ash?: number };

export function fightBoss(G: State): BossResult {
  const s = G.stage, H = hero(G);
  let hp = H.hp, bhp = mobHp(s) * 8;
  const batk = mobAtk(s) * 1.4, max = bhp;
  const ev: BossEv[] = [];
  let t = 0, ht = 0, mt = 0.6; // бос атакує вперше через 0,6 с (як у клієнті)
  let win = false, timeout = false;
  while (true) {
    const nh = ht + 1, nm = mt + 1.4;
    const next = Math.min(nh, nm);
    if (next > BOSS_TIME) { timeout = true; break; }
    t = next;
    if (nh <= nm) {
      ht = nh;
      const cr = Math.random() * 100 < H.crit;
      const d = H.atk * rnd(0.92, 1.08) * (cr ? 2 : 1);
      bhp -= d; ev.push([r2(t), 0, Math.round(d), cr ? 1 : 0]);
      if (bhp <= 0) { win = true; break; }
      hp = Math.min(H.hp, hp + H.hp * 0.02);
    } else {
      mt = nm;
      const d = Math.max(batk * 0.2, batk - H.def) * rnd(0.9, 1.1);
      hp -= d; ev.push([r2(t), 1, Math.round(d), 0]);
      if (hp <= 0) break;
    }
  }
  const res: BossResult = { win, ev, hp: H.hp, bossHp: Math.round(max), gold: 0, xp: 0, stage: s, timeout };
  if (win) {
    res.gold = mobGold(s) * 8; res.xp = mobXp(s) * 6;
    G.gold += res.gold; gainXp(G, res.xp); G.tot.kills++; G.tot.bosses++;
    const it = makeItem(G, s, 1); res.item = it; res.gold += addItem(G, it, true);
    const first = s === G.maxStage;
    if (first) { res.souls = 5 + s; G.souls += res.souls; }
    if (Math.random() < catChance(s)) { res.cat = 1; G.cat += 1; }
    if (first && s % 10 === 0) { res.ash = 10; G.ash += 10; } // перший прохід регіонального боса
    log(G, "boss", [s, Math.round(res.gold)]);
    G.stage++; if (G.stage > G.maxStage) G.maxStage = G.stage;
    G.kills = 0; G.frac = 0;
  } else {
    G.tot.deaths++; G.kills = 0; G.autoBoss = false;
    log(G, timeout ? "bossTimeout" : "bossDeath", [s]);
  }
  return res;
}

// ---------- дії гравця ----------
export class GameError extends Error {}
const fail = (m: string) => { throw new GameError(m); };

export function actUpgrade(G: State, k: string) {
  const u = UPG[k]; if (!u) fail("bad_upgrade");
  const key = k as keyof State["up"], l = G.up[key];
  if (u.max && l >= u.max) fail("max");
  const c = u.cost(l); if (G.gold < c) fail("no_gold");
  G.gold -= c; G.up[key]++;
  return { cost: c };
}
export function actEquip(G: State, id: number) {
  const i = G.inv.findIndex((x) => x.id === id); if (i < 0) fail("no_item");
  const it = G.inv[i]; G.inv.splice(i, 1);
  const old = G.eq[it.slot]; if (old) G.inv.unshift(old);
  delete it.nw; G.eq[it.slot] = it;
  return {};
}
export function actEquipBest(G: State) {
  let n = 0;
  for (const s of SLOTS) {
    let best = G.eq[s], bi = -1;
    G.inv.forEach((it, i) => { if (it.slot === s && (!best || itemScore(G, it) > itemScore(G, best))) { best = it; bi = i; } });
    if (bi >= 0) { G.inv.splice(bi, 1); const o = G.eq[s]; if (o) G.inv.unshift(o); G.eq[s] = best; n++; }
  }
  return { n };
}
export function actSell(G: State, ids: number[]) {
  if (!Array.isArray(ids) || ids.length > INV_MAX) fail("bad_ids");
  const set = new Set(ids.map(Number)); let g = 0, n = 0;
  G.inv = G.inv.filter((i) => { if (set.has(i.id)) { g += sellPrice(i); n++; return false; } return true; });
  G.gold += g;
  return { gold: g, n };
}
export function actStage(G: State, s: number) {
  s = Math.floor(Number(s));
  if (!(s >= 1 && s <= G.maxStage)) fail("bad_stage");
  if (s !== G.stage) { G.stage = s; G.kills = 0; G.frac = 0; }
  return {};
}
export function actBoss(G: State) {
  if (G.stage !== G.maxStage || G.kills < WAVES) fail("boss_locked");
  return fightBoss(G);
}
export function actSettings(G: State, a: { autoBoss?: boolean; autoSell?: boolean }) {
  if (typeof a.autoBoss === "boolean") G.autoBoss = a.autoBoss;
  if (typeof a.autoSell === "boolean") G.autoSell = a.autoSell;
  return {};
}
export function actSeen(G: State) { for (const i of G.inv) delete i.nw; return {}; }

const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export function dailyInfo(G: State, now: number) {
  const t = dayStr(now), y = dayStr(now - 864e5);
  if (G.daily.date === t) return null;
  const streak = G.daily.date === y ? (G.daily.streak % 7) + 1 : 1;
  return { streak, gold: Math.round(mobGold(G.maxStage) * 15 * streak), epic: streak === 7 };
}
export function actDaily(G: State, now: number) {
  const d = dailyInfo(G, now); if (!d) fail("daily_taken");
  G.gold += d!.gold; G.daily = { date: dayStr(now), streak: d!.streak };
  let item: Item | undefined;
  if (d!.epic) { item = makeItem(G, G.maxStage, 3); addItem(G, item, true); }
  log(G, "daily", [d!.streak]);
  return { ...d!, item };
}

// ---------- кузня ----------
function takeItems(G: State, ids: number[]) {
  const set = new Set(ids.map(Number));
  const got = G.inv.filter((i) => set.has(i.id));
  if (got.length !== set.size) fail("no_item");
  G.inv = G.inv.filter((i) => !set.has(i.id));
  return got;
}
function disOne(G: State, it: Item, mode: "xp" | "shards") {
  if (mode === "xp") { const x = disXp(it); gainXp(G, x); return { xp: x, shards: 0 }; }
  const sh = disShards(it); G.shards += sh; return { xp: 0, shards: sh };
}
export function actDismantle(G: State, ids: number[], mode: string) {
  if (!Array.isArray(ids) || !ids.length || ids.length > INV_MAX) fail("bad_ids");
  const m = mode === "xp" ? "xp" : "shards"; G.dismode = m;
  let xp = 0, shards = 0;
  for (const it of takeItems(G, ids)) { const r = disOne(G, it, m); xp += r.xp; shards += r.shards; }
  if (shards || xp) log(G, "dis", [ids.length, m === "xp" ? xp : shards, m]);
  return { n: ids.length, xp, shards };
}
// предмети, які гра вважає непотрібними: гірші за надіте, не легендарні й не міфічні
export function junkIds(G: State) {
  return G.inv.filter((i) => i.r < 4 && G.eq[i.slot] && itemScore(G, i) <= itemScore(G, G.eq[i.slot]!)).map((i) => i.id);
}
export function actDismantleJunk(G: State, mode: string) {
  const ids = junkIds(G); if (!ids.length) fail("no_junk");
  return actDismantle(G, ids, mode);
}
export function actEnchant(G: State, id?: number) {
  if (G.ench >= ENCH_MAX) fail("max");
  const c = enchCost(G);
  if (G.shards < c.shards) fail("no_shards");
  if (G.gold < c.gold) fail("no_gold");
  // легендарка: вказана або найслабша в сумці
  let leg = id ? G.inv.find((i) => i.id === Number(id) && i.r === 4) : undefined;
  if (!leg) leg = G.inv.filter((i) => i.r === 4).sort((a, b) => itemScore(G, a) - itemScore(G, b))[0];
  if (!leg) fail("no_legendary");
  takeItems(G, [leg!.id]);
  G.shards -= c.shards; G.gold -= c.gold; G.ench++;
  log(G, "ench", [G.ench]);
  return { ench: G.ench, cost: c };
}
export function actMythic(G: State, ids: number[]) {
  if (!Array.isArray(ids) || ids.length < MYTH.need || ids.length > 12) fail("bad_ids");
  const set = new Set(ids.map(Number));
  const items = G.inv.filter((i) => set.has(i.id));
  if (items.length !== set.size) fail("no_item");
  if (items.some((i) => i.r !== 4)) fail("not_legendary");
  const slot = items[0].slot;
  if (items.some((i) => i.slot !== slot)) fail("mixed_slots");
  const il = Math.max(...items.map((i) => i.il));
  const souls = mythSouls(il);
  if (G.cat < 1) fail("no_catalyst");
  if (G.souls < souls) fail("no_souls");
  const chance = mythChance(G, items.length);
  G.cat -= 1; G.souls -= souls;
  const win = Math.random() * 100 < chance;
  // основні три (найкращі) лишаються при невдачі, згорають лише додаткові
  const sorted = [...items].sort((a, b) => itemScore(G, b) - itemScore(G, a));
  const burn = win ? items : sorted.slice(MYTH.need);
  takeItems(G, burn.map((i) => i.id));
  let item: Item | undefined;
  if (win) {
    item = buildItem(G, il, 5, slot); G.inv.unshift(item); G.mythFails = 0;
    log(G, "myth", [1, slot, il]);
  } else {
    G.mythFails++;
    log(G, "myth", [0, slot, chance]);
  }
  return { win, chance, item, burned: burn.length, souls };
}
