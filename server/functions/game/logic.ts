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
  { m: 9, w: 0 }, // міфічний (прадавній) — лише крафт; було 7,5 (рішення Влада 30.10: прадавня завжди сильніша за свіжі легендарки)
  { m: 14, w: 0 }, // астральний (вічний) — лише крафт з міфічного; було 11
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
export const INV_MAX = 200; // базова сумка; розширення за Іскри — BAG
export const BAG = { step: 25, max: 4, base: 500 }; // +25 місць; ціна 500 × 2^k Іскор; до 300 місць
// повна сумка: епічні й кращі — у сховище (до VAULT_MAX), решта автоматично розбирається на уламки з втратою 50%
export const VAULT_MAX = 100, OVF_RATE = 0.5;
export const invMax = (G: State) => INV_MAX + BAG.step * (G.bag || 0);
export const bagCost = (G: State) => ((G.bag || 0) >= BAG.max ? null : BAG.base * Math.pow(2, G.bag || 0));
export const DROP = 0.12;
export const REGIONS = 8;
export const ENCH_STEP = 0.08, ENCH_MAX = 25;
export const MYTH = { base: 30, extra: 10, fail: 5, cap: 80, need: 3 };
// Душі: лише за рівень і час гри, донат на них не впливає
export const soulsPerHour = (G: State) => (10 + 2 * G.lvl) * (1 + setInfo(G).souls / 100) * (1 + petB(G, "souls") / 100);
// сети (рішення Влада 30.10): кожна надіта прадавня +6% Іскор/год, вічна +16%; усі 6 слотів прадавні або кращі — ще +40% Іскор і +15% сили,
// усі 6 вічні — замість цього +60% Іскор і +30% сили (атака, здоров'я, захист)
export const SET = { anc: { each: 6, souls: 40, pow: 15 }, eter: { each: 16, souls: 60, pow: 30 } };
export function setInfo(G: State) {
  const a = SLOTS.filter((s) => G.eq[s]?.r === 5).length, e = SLOTS.filter((s) => (G.eq[s]?.r ?? 0) >= 6).length;
  const fullE = e === SLOTS.length, fullA = a + e === SLOTS.length;
  const full = fullE ? SET.eter : fullA ? SET.anc : null;
  return { a, e, n: SLOTS.length, fullA, fullE, souls: SET.anc.each * a + SET.eter.each * e + (full ? full.souls : 0), pow: full ? full.pow : 0 };
}
export const mythicCount = (G: State) => SLOTS.filter((s) => (G.eq[s]?.r ?? 0) >= 5).length + SLOTS.filter((s) => (G.eq[s]?.r ?? 0) >= 6).length;
export const catChance = (s: number) => (s % 10 === 0 ? 1 : 0.2); // каталізатор з боса; регіональний бос — завжди
export const disXp = (it: Item) => Math.round(mobXp(it.il) * 3 * RAR[it.r].m);
export const disShards = (it: Item) => Math.round((it.r + 1) * (it.r + 1) * (1 + it.il / 10));
export const enchCost = (G: State) => ({ shards: 40 * (G.ench + 1), gold: Math.round(mobGold(G.maxStage) * 40 * (G.ench + 1)), legendary: 1 });
export const mythSouls = (il: number) => Math.round(150 + il * 5);
export function mythChance(G: State, n: number) {
  return Math.min(MYTH.cap, MYTH.base + MYTH.extra * Math.max(0, n - MYTH.need) + MYTH.fail * (G.mythFails || 0));
}

export const mobHp = (s: number) => 25 * Math.pow(1.25, s - 1);
// атака ворогів ×1,22 за етап (було 1,19) і м'який захист: урон = атака² / (атака + захист), без «мінімуму 20%».
// Рішення Влада 30.10 після симуляції: раніше бос не міг убити героя (знімав ≤33% HP за бій), здоров'я й захист не грали ролі.
export const mobAtk = (s: number) => 4 * Math.pow(1.22, s - 1);
export const dmgTaken = (atk: number, def: number) => atk * atk / (atk + Math.max(0, def));
export const mobGold = (s: number) => 4 * Math.pow(1.17, s - 1);
// крива досвіду: параметри винесено, щоб їх можна було підбирати симуляцією
export const XPC = { mob: 1.07, need: 1.27, base: 25 }; // симуляція 28.10: 50 рівень за ~9–16 днів
export const mobXp = (s: number) => 6 * Math.pow(XPC.mob, s - 1);
export const xpNeed = (l: number) => Math.floor(XPC.base * Math.pow(XPC.need, l - 1));
export const gearScale = (il: number) => Math.pow(1.16, il - 1);

export type Item = { id: number; slot: Slot; r: number; il: number; nm: number; st: Stats; nw?: number; gm?: string[] }; // gm — камені в гніздах, коди "a3"
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
  // данжі
  mats: number[]; ess: number; astFails: number;
  chests: Record<string, number>; // "рівень" або "рівень:вид" -> кількість скринь; вид 1 звичайна, 2 рідкісна, 3 епічна
  keys: Record<string, number>;   // тир -> ключі (кланові, з нагород)
  dng: { max: number; runs: number };
  arena: ArenaState;
  act: { last: string; days: number };       // дні активності (допуск до виводу)
  dngDay: { day: string; used: number; paid?: number }; // заходи в підземелля сьогодні: безкоштовні й платні
  bag?: number;                              // скільки разів розширено сумку
  vault?: Item[];                            // сховище для речей, що не вмістились у сумку
  ovf?: { v: number; d: number; sh: number }; // що сталося з речами при повній сумці (для повідомлення)
  ckey: { day: string; n: number };          // застаріле: ключі, скрафчені гравцем за день (тепер лічильник у клані)
  dngd?: Record<string, number>;             // тир -> найвища пройдена складність
  cb?: { atk: number; gold: number; xp?: number };        // бонуси будівель клану, % (ставить сервер з даних клану)
  gems?: Record<string, number>;                          // камені в сумці: "a1" -> кількість (тип a/h/d/c, рівень 1–5)
  pet?: PetState;                                         // пітомці: колекція, активний, яйця, інкубатор, знахідки
  rv?: number;                                            // версія множників рідкості (1 — прадавні ×9, вічні ×14; старі речі перераховано)
  tut?: string[];                                         // навчання: ключі пройдених кроків ("old" — гравець до навчання, "off" — вимкнув)
  nws?: number;                                           // остання побачена новина (id з таблиці news)
};
export type ArenaOpp = { id: number | null; name: string; lvl: number; power: number; rating: number; st: { atk: number; hp: number; def: number; crit: number } };
export type ArenaState = { day: string; used: number; pts: number; rating: number; w: number; l: number; opps: ArenaOpp[] };

export function fresh(now: number): State {
  return {
    v: 2, lvl: 1, xp: 0, gold: 0, stage: 1, maxStage: 1, kills: 0, frac: 0,
    autoBoss: false, autoSell: false, up: { atk: 0, hp: 0, def: 0, crit: 0 },
    eq: {}, inv: [], nid: 1, tick: now, daily: { date: "", streak: 0 },
    tot: { kills: 0, bosses: 0, deaths: 0 }, log: [{ t: now, k: "start" }],
    souls: 0, ash: 0, shards: 0, cat: 0, soulFrac: 0, ench: 0, mythFails: 0, dismode: "shards",
    mats: [0, 0, 0, 0], ess: 0, astFails: 0, chests: {}, keys: {}, dng: { max: 0, runs: 0 },
    arena: { day: "", used: 0, pts: 0, rating: 1000, w: 0, l: 0, opps: [] },
    act: { last: "", days: 0 }, dngDay: { day: "", used: 0, paid: 0 }, ckey: { day: "", n: 0 },
  };
}
// дописує нові поля до старих збережень
export function migrate(G: State): State {
  const d = fresh(G.tick || Date.now()) as unknown as Record<string, unknown>;
  const g = G as unknown as Record<string, unknown>;
  if (!G.dngd && G.dng) { G.dngd = {}; for (let t = 1; t <= (G.dng.max || 0); t++) G.dngd[String(t)] = 1; }
  if (!G.tut) G.tut = G.maxStage > 5 ? ["old"] : [];
  if ((G.rv || 0) < 1) { // 30.10: прадавні ×7,5→×9, вічні ×11→×14 — перераховуємо вже скуті речі
    const k: Record<number, number> = { 5: 9 / 7.5, 6: 14 / 11 };
    for (const it of [...Object.values(G.eq || {}), ...(G.inv || []), ...(G.vault || [])]) if (it && k[it.r]) for (const s of ["atk", "hp", "def"] as const) if (it.st[s]) it.st[s] = Math.round(it.st[s]! * k[it.r]);
    G.rv = 1;
  }
  if (!G.pet && G.maxStage > 10) { const n = Math.floor((G.maxStage - 1) / 10), r = Math.floor((G.maxStage - 1) / 40); G.pet = { list: {}, act: null, eggs: { c: n - r, r }, inc: null, ft: 0, fn: 0 }; } // яйця за вже пройдених регіональних босів (30.10)
  for (const k of ["souls", "ash", "shards", "cat", "soulFrac", "ench", "mythFails", "dismode", "mats", "ess", "astFails", "chests", "keys", "dng", "arena", "act", "dngDay", "ckey"]) if (g[k] === undefined) g[k] = d[k];
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
    if (it) { a += (it.st.atk || 0) * em; h += (it.st.hp || 0) * em; d += (it.st.def || 0) * em; c += it.st.crit || 0; const g = gemStats(it); a += g.atk; h += g.hp; d += g.def; c += g.crit; }
  }
  const cm = 1 + (G.cb?.atk || 0) / 100; // Казарма клану
  const sp = 1 + setInfo(G).pow / 100; // повний сет прадавніх / вічних
  a *= 1 + petB(G, "atk") / 100; d *= 1 + petB(G, "def") / 100; // Вовк і Голем
  return { atk: a * cm * sp, hp: h * cm * sp, def: d * sp, crit: Math.min(60, c) };
}
export const power = (h: ReturnType<typeof hero>) => Math.round(h.atk * (1 + h.crit / 100) * 2 + h.hp * 0.25 + h.def * 1.5);
export function itemScore(G: State, it: Item) {
  const g = gemStats(it);
  return ((it.st.atk || 0) + g.atk) * 2 + ((it.st.hp || 0) + g.hp) * 0.25 + ((it.st.def || 0) + g.def) * 1.5 + ((it.st.crit || 0) + g.crit) * 0.03 * hero(G).atk;
}
export const sellPrice = (it: Item) => Math.max(1, Math.round(mobGold(it.il) * 2 * Math.pow(RAR[it.r].m, 1.5)));

function log(G: State, k: string, a?: (string | number)[]) {
  G.log.unshift({ t: Date.now(), k, a });
  if (G.log.length > 40) G.log.length = 40;
}

export function makeItem(G: State, ilvl: number, minR: number, lw = 1): Item {
  let r = minR;
  const w = (i: number) => RAR[i].w * (i === 4 ? lw : 1); // lw — множник ваги легендарки (скрині вищого виду)
  const tot = RAR.reduce((s, x, i) => s + (i >= minR && i < DROP_RAR ? w(i) : 0), 0);
  let roll = Math.random() * tot;
  for (let i = minR; i < DROP_RAR; i++) { roll -= w(i); r = i; if (roll <= 0) break; }
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
  if (G.inv.length >= invMax(G)) {
    G.ovf = G.ovf || { v: 0, d: 0, sh: 0 }; G.vault = G.vault || [];
    if (it.r >= 3 && G.vault.length < VAULT_MAX) { G.vault.unshift(it); G.ovf.v++; }
    else { const sh = Math.max(1, Math.round(disShards(it) * OVF_RATE)); G.shards += sh; G.ovf.d++; G.ovf.sh += sh; }
    return 0;
  }
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
  const taken = dmgTaken(mobAtk(s), H.def) / 1.4 * kt;
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
  const today = new Date(now).toISOString().slice(0, 10);
  if (G.act.last !== today) { G.act.last = today; G.act.days++; }
  const offline = sec > ONLINE_WINDOW;
  const res: Progress = { sec, offline, stage: G.stage, kills: 0, gold: 0, xp: 0, items: 0, lvlUps: 0, souls: 0 };
  if (sec < 0.5) return res;
  petTick(G, now);
  const eff = Math.min(sec, ONLINE_WINDOW) + Math.max(0, sec - ONLINE_WINDOW) * OFFLINE_RATE * (1 + petB(G, "off") / 100); // Привид
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
  const gold = kills * mobGold(s) * (1 + ((G.cb?.gold || 0) + petB(G, "gold")) / 100), xp = kills * mobXp(s) * (1 + ((G.cb?.xp || 0) + petB(G, "xp")) / 100); // Скарбниця й Бібліотека клану
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
export type BossResult = { win: boolean; ev: BossEv[]; hp: number; bossHp: number; gold: number; xp: number; item?: Item; stage: number; timeout?: boolean; souls?: number; cat?: number; ash?: number; gems?: string[]; egg?: string };

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
      const d = dmgTaken(batk, H.def) * rnd(0.9, 1.1);
      hp -= d; ev.push([r2(t), 1, Math.round(d), 0]);
      if (hp <= 0) break;
    }
  }
  const res: BossResult = { win, ev, hp: H.hp, bossHp: Math.round(max), gold: 0, xp: 0, stage: s, timeout };
  if (win) {
    res.gold = mobGold(s) * 8; res.xp = mobXp(s) * 6 * (1 + (G.cb?.xp || 0) / 100);
    G.gold += res.gold; gainXp(G, res.xp); G.tot.kills++; G.tot.bosses++;
    const it = makeItem(G, s, 1); res.item = it; res.gold += addItem(G, it, true);
    const first = s === G.maxStage;
    if (first) { res.souls = 5 + s; G.souls += res.souls; }
    if (Math.random() < catChance(s)) { res.cat = 1; G.cat += 1; }
    if (first && s % 10 === 0) { res.ash = ASH.region * (s / 10); G.ash += res.ash; } // перший прохід регіонального боса: 50 × номер регіону
    if (first) { const n = s % 10 === 0 ? GEM_DROP.region : Math.random() < GEM_DROP.boss ? 1 : 0; if (n) res.gems = randGem(G, n); } // камені: регіональний бос 2, звичайний 15%
    if (first && s % 10 === 0) { res.egg = s % 40 === 0 ? "r" : "c"; addEgg(G, res.egg); } // яйце пітомця: регіональний бос (40 і 80 — рідкісне)
    log(G, "boss", [s, Math.round(res.gold)]);
    G.stage++; if (G.stage > G.maxStage) G.maxStage = G.stage;
    G.kills = 0; G.frac = 0;
  } else {
    G.tot.deaths++; G.kills = 0; G.autoBoss = false; // після поразки авто-бос вимикається (рішення 29.10); клієнт показує чому
    log(G, timeout ? "bossTimeout" : "bossDeath", [s]);
  }
  return res;
}

// ---------- дії гравця ----------
export class GameError extends Error {}
const fail = (m: string) => { throw new GameError(m); };

// Прорив: кожні 25 рівнів тренування потрібні ресурси (уламки, далі матеріали й самоцвіти)
export const GATE_STEP = 25;
export function gateCost(k: string, l: number) {
  if (l <= 0 || l % GATE_STEP !== 0) return null;
  const g = l / GATE_STEP;
  return { shards: 60 * g * g, mat: g >= 2 ? Math.min(3, g - 2) : -1, matN: g >= 2 ? 5 * g : 0, cat: g >= 3 ? g - 2 : 0 };
}
// матеріал для прориву: потрібного тиру або будь-якого вищого
export const matsFrom = (G: State, t: number) => G.mats.slice(t).reduce((a, b) => a + (b || 0), 0);
function gateOk(G: State, c: NonNullable<ReturnType<typeof gateCost>>) {
  return G.shards >= c.shards && (c.mat < 0 || matsFrom(G, c.mat) >= c.matN) && G.cat >= c.cat;
}
function takeMats(G: State, t: number, n: number) {
  for (let i = t; i < G.mats.length && n > 0; i++) { const k = Math.min(n, G.mats[i] || 0); G.mats[i] -= k; n -= k; }
}
// n: 1, 10 або 0 = «на всі гроші». Масове тренування зупиняється перед проривом;
// прорив проходиться лише окремою дією (n = 1).
export function actUpgrade(G: State, k: string, n = 1) {
  const u = UPG[k]; if (!u) fail("bad_upgrade");
  const key = k as keyof State["up"];
  const want = n === 0 ? 10000 : Math.max(1, Math.min(100, Math.floor(Number(n) || 1)));
  let done = 0, spent = 0, gate: ReturnType<typeof gateCost> = null;
  while (done < want) {
    const l = G.up[key];
    if (u.max && l >= u.max) { if (!done) fail("max"); break; }
    const gc = gateCost(k, l);
    if (gc && (done > 0 || want > 1)) { if (!done) fail("gate"); break; }
    const c = u.cost(l);
    if (G.gold < c) { if (!done) fail("no_gold"); break; }
    if (gc) {
      if (!gateOk(G, gc)) fail("gate_res");
      G.shards -= gc.shards; if (gc.mat >= 0) takeMats(G, gc.mat, gc.matN); G.cat -= gc.cat; gate = gc;
    }
    G.gold -= c; G.up[key]++; spent += c; done++;
    if (gc) break;
  }
  if (gate) log(G, "gate", [k, G.up[key]]);
  return { n: done, cost: spent, gate };
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
  if (!Array.isArray(ids) || ids.length > invMax(G)) fail("bad_ids");
  const ok = noGems(G, ids); if (ids.length && !ok.length) fail("has_gems");
  const set = new Set(ok); let g = 0, n = 0;
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
// навчання: позначити крок пройденим, вимкнути або почати заново
export function actTut(G: State, k: string, reset?: boolean) {
  if (reset) { G.tut = []; return {}; }
  if (!/^[a-z0-9_]{1,16}$/.test(k)) fail("bad_tut");
  const t = G.tut || (G.tut = []);
  if (!t.includes(k)) { t.push(k); if (t.length > 60) t.splice(0, t.length - 60); }
  return {};
}
export function actNewsSeen(G: State, id: number) { if (id > (G.nws || 0) && id < 1e9) G.nws = Math.floor(id); return {}; }
export function actSeen(G: State) { for (const i of G.inv) delete i.nw; return {}; }

const dayStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export function dailyInfo(G: State, now: number) {
  const t = dayStr(now), y = dayStr(now - 864e5);
  if (G.daily.date === t) return null;
  const streak = G.daily.date === y ? (G.daily.streak % 7) + 1 : 1;
  return { streak, gold: Math.round(mobGold(G.maxStage) * 15 * streak), ash: ASH.daily[streak - 1], epic: streak === 7 };
}
export function actDaily(G: State, now: number) {
  const d = dailyInfo(G, now); if (!d) fail("daily_taken");
  G.gold += d!.gold; G.ash += d!.ash; G.daily = { date: dayStr(now), streak: d!.streak };
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
  if (!Array.isArray(ids) || !ids.length || ids.length > invMax(G)) fail("bad_ids");
  const m = mode === "xp" ? "xp" : "shards"; G.dismode = m;
  ids = noGems(G, ids); if (!ids.length) fail("has_gems");
  let xp = 0, shards = 0;
  for (const it of takeItems(G, ids)) { const r = disOne(G, it, m); xp += r.xp; shards += r.shards; }
  if (shards || xp) log(G, "dis", [ids.length, m === "xp" ? xp : shards, m]);
  return { n: ids.length, xp, shards };
}
// предмети, які гра вважає непотрібними: гірші за надіте, не легендарні й не міфічні
export function junkIds(G: State) {
  return G.inv.filter((i) => i.r < 4 && !i.gm?.length && G.eq[i.slot] && itemScore(G, i) <= itemScore(G, G.eq[i.slot]!)).map((i) => i.id);
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
  let leg = id ? G.inv.find((i) => i.id === Number(id) && i.r === 4 && !i.gm?.length) : undefined;
  if (!leg) leg = G.inv.filter((i) => i.r === 4 && !i.gm?.length).sort((a, b) => itemScore(G, a) - itemScore(G, b))[0];
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
  if (items.some((i) => i.gm?.length)) fail("has_gems");
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

// ---------- данжі ----------
export const DNG_TIERS = 10, DNG_ROOMS = 5, DNG_TIME = 75;
export const DNG_UNLOCK_STAGE = 5;
export const DNG_DAILY = 5; // безкоштовні заходи на день; далі — лише за ключі
export function dngLeft(G: State, now: number) { return G.dngDay.day === dayStr(now) ? Math.max(0, DNG_DAILY - G.dngDay.used) : DNG_DAILY; }
// платний вхід після безкоштовних: ціна ключа × 1,25^(платних заходів сьогодні)
export const DNG_PAY_MUL = 1.25;
export function dngPrice(G: State, t: number, now: number) { const n = G.dngDay.day === dayStr(now) ? (G.dngDay.paid || 0) : 0; return Math.round(keyPrice(t) * Math.pow(DNG_PAY_MUL, n)); } // у Попелі
// складність кожного підземелля: 1 Звичайна, 2 Героїчна, 3 Кошмар. Вороги сильніші на 3 етапи за крок,
// нагорода: скрині вищого рівня і більше скринь та матеріалів. Наступна складність — після повного проходження попередньої.
export const DNG_DIFF = 3, DIFF_STEP = 3, DIFF_MUL = [1, 1.3, 1.6];
export const dngStage = (t: number, d = 1) => 5 + 7 * (t - 1) + DIFF_STEP * (d - 1); // сила ворогів як на етапі
export const dngDiffMax = (G: State, t: number) => (G.dngd?.[String(t)] || 0); // найвища пройдена складність тиру
// Економіка Попелу (рішення 29.10): ключі й платний вхід — за Попіл. Попіл видається безкоштовно (щоденна нагорода,
// перший прохід підземель і регіональних босів, рейтинги), продається за гроші і зникає через комісію ринку та ключі.
// Симуляція 29.10 (45 днів): соло ~300 походів, клан ~450, клан+VIP ~600; рівні й етапи не прискорюються.
export const ASH = { key: [10, 10, 15, 15, 20, 25, 30, 35, 40, 50], daily: [10, 10, 15, 15, 20, 20, 50], first: 15, region: 50, clanMul: 0.7 };
export const keyPrice = (t: number) => ASH.key[Math.max(0, Math.min(ASH.key.length - 1, t - 1))]; // базова ціна входу/ключа тиру, Попіл
export const dngLoc = (t: number) => (t - 1) % REGIONS; // фон/локація
// скрині трьох видів: вид = мінімальна рідкість речі (1 незвичайна, 2 рідкісна, 3 епічна). Ключ "рівень" — звичайна (старі збереження)
// шанс легендарки: звичайна ~1,3%, рідкісна 2%, епічна ~5,7% (рішення 29.10, було 3,8% і 14%)
export const CHEST_LW: Record<number, number> = { 1: 1, 2: 0.5, 3: 0.36 };
export const chestKey = (il: number, g = 1) => (g > 1 ? `${il}:${g}` : String(il));
export const chestParse = (k: string) => { const [a, b] = k.split(":"); return { il: Number(a), g: Math.max(1, Math.min(3, Number(b) || 1)) }; };
export function addChests(G: State, il: number, n: number, g = 1) { const k = chestKey(il, g); G.chests[k] = (G.chests[k] || 0) + n; }
export function dngOpen(G: State, t: number, d = 1) {
  if (t < 1 || t > DNG_TIERS || d < 1 || d > DNG_DIFF) return false;
  if (G.maxStage < DNG_UNLOCK_STAGE) return false;
  if (d > 1) return dngDiffMax(G, t) >= d - 1;
  return t <= (G.dng?.max || 0) + 1;
}
export function dngRewards(t: number, d = 1) {
  const m = DIFF_MUL[d - 1] || 1;
  return {
    chests: Math.round((1 + t) * m), chestIl: dngStage(t, d), chestG: d, mat: Math.min(3, Math.floor((t - 1) / 2.5)), matN: Math.round((3 + t) * m),
    souls: 2 * t * d, gemChance: Math.min(1, 0.2 + 0.04 * t + 0.15 * (d - 1)), gem2: d === 3 && t >= 5 ? 0.3 : 0, catChance: Math.min(1, (t >= 8 ? 1 : t >= 4 ? 0.5 : 0) + 0.15 * (d - 1)), essChance: t >= 8 ? 0.15 + 0.1 * (d - 1) : t >= 6 && d === 3 ? 0.05 : 0,
  };
}
type Foe = { hp: number; atk: number; boss: boolean };
export type DngRoom = { boss: boolean; win: boolean; hpLeft: number; ev?: BossEv[]; hp0?: number; foeHp?: number };
// бій з кімнатами поспіль: здоров'я героя не відновлюється між кімнатами (лише +10%)
export function simDungeon(G: State, t: number, rec = false, d = 1) {
  const s = dngStage(t, d), H = hero(G);
  const foes: Foe[] = [];
  for (let i = 0; i < DNG_ROOMS; i++) foes.push({ hp: mobHp(s) * 3, atk: mobAtk(s) * 1.2, boss: false });
  foes.push({ hp: mobHp(s) * 12, atk: mobAtk(s) * 1.5, boss: true });
  let hp = H.hp, total = 0; // загальний час забігу, с
  const rooms: DngRoom[] = [];
  for (const f of foes) {
    let fh = f.hp, ht = 0, mt = 0.6, t = 0, win = false;
    const ev: BossEv[] = [], hp0 = hp; // події бою для показу в клієнті
    while (total + t < DNG_TIME) {
      const nh = ht + 1, nm = mt + 1.4;
      if (nh <= nm) {
        ht = nh; t = nh;
        const cr = Math.random() * 100 < H.crit;
        const dd = H.atk * rnd(0.92, 1.08) * (cr ? 2 : 1);
        fh -= dd; if (rec) ev.push([r2(t), 0, Math.round(dd), cr ? 1 : 0]);
        if (fh <= 0) { win = true; break; }
        hp = Math.min(H.hp, hp + H.hp * 0.02);
      } else {
        mt = nm; t = nm;
        const dd = dmgTaken(f.atk, H.def) * rnd(0.9, 1.1);
        hp -= dd; if (rec) ev.push([r2(t), 1, Math.round(dd), 0]);
        if (hp <= 0) break;
      }
    }
    total += t;
    rooms.push({ boss: f.boss, win, hpLeft: Math.max(0, Math.round(hp / H.hp * 100)), ...(rec ? { ev, hp0: Math.round(hp0), foeHp: Math.round(f.hp) } : {}) });
    if (!win) break;
    hp = Math.min(H.hp, hp + H.hp * 0.1);
  }
  return rooms;
}
// мінімальна сила для проходження: середній (без випадковості) бій з героєм гравця, масштабованим k разів;
// шукаємо найменший k, за якого герой проходить усі кімнати й боса, і беремо +10% запасу
type HStat = { atk: number; hp: number; def: number; crit: number };
function dngWinAvg(H: HStat, t: number, d: number) {
  const s = dngStage(t, d), dmg = H.atk * (1 + H.crit / 100);
  let hp = H.hp, total = 0;
  for (let i = 0; i <= DNG_ROOMS; i++) {
    const boss = i === DNG_ROOMS, fhp = mobHp(s) * (boss ? 12 : 3), fat = mobAtk(s) * (boss ? 1.5 : 1.2);
    let fh = fhp, ht = 0, mt = 0.6, tt = 0, win = false;
    const hit = dmgTaken(fat, H.def);
    while (total + tt < DNG_TIME) {
      const nh = ht + 1, nm = mt + 1.4;
      if (nh <= nm) { ht = nh; tt = nh; fh -= dmg; if (fh <= 0) { win = true; break; } hp = Math.min(H.hp, hp + H.hp * 0.02); }
      else { mt = nm; tt = nm; hp -= hit; if (hp <= 0) break; }
    }
    total += tt;
    if (!win) return false;
    hp = Math.min(H.hp, hp + H.hp * 0.1);
  }
  return true;
}
export function dngNeedPower(G: State, t: number, d = 1) {
  const H = hero(G);
  const sc = (k: number): HStat => ({ atk: H.atk * k, hp: H.hp * k, def: H.def * k, crit: H.crit });
  let lo = 0, hi = 1;
  while (!dngWinAvg(sc(hi), t, d) && hi < 1e7) { lo = hi; hi *= 2; }
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (dngWinAvg(sc(m), t, d)) hi = m; else lo = m; }
  const p = power(sc(hi)) * 1.1, f = Math.pow(10, Math.max(0, Math.floor(Math.log10(p)) - 1));
  return Math.ceil(p / f) * f; // округлення вгору до 2 значущих цифр
}
export function dngEstimate(G: State, t: number, n = 24, d = 1) {
  let w = 0;
  for (let i = 0; i < n; i++) { const r = simDungeon(G, t, false, d); if (r.length === DNG_ROOMS + 1 && r[DNG_ROOMS].win) w++; }
  return Math.round(w / n * 100);
}
export function actDungeon(G: State, t: number, now = Date.now(), d = 1) {
  t = Math.floor(Number(t)); d = Math.floor(Number(d)) || 1;
  if (!dngOpen(G, t, d)) fail("dng_locked");
  const key = String(t);
  let paid = 0, usedKey = false;
  const day = dayStr(now); if (G.dngDay.day !== day) G.dngDay = { day, used: 0, paid: 0 };
  if (G.dngDay.used < DNG_DAILY) G.dngDay.used++;
  else if ((G.keys[key] || 0) > 0) { G.keys[key]--; usedKey = true; }
  else { paid = dngPrice(G, t, now); if (G.ash < paid) fail("no_ash"); G.ash -= paid; G.dngDay.paid = (G.dngDay.paid || 0) + 1; }
  const rooms = simDungeon(G, t, true, d);
  const cleared = rooms.filter((r) => r.win && !r.boss).length;
  const full = rooms.length === DNG_ROOMS + 1 && rooms[DNG_ROOMS].win;
  const R = dngRewards(t, d);
  // скрині й матеріали — пропорційно пройденим кімнатам; бос дає решту
  const chests = full ? R.chests : Math.floor(R.chests * cleared / (DNG_ROOMS + 1));
  const matN = full ? R.matN : Math.floor(R.matN * cleared / (DNG_ROOMS + 1));
  const gain = { chests, chestIl: R.chestIl, chestG: R.chestG, mat: R.mat, matN, souls: 0, cat: 0, ess: 0, key: 0, ash: 0, gems: 0, egg: "" };
  if (chests) addChests(G, R.chestIl, chests, R.chestG);
  if (matN) G.mats[R.mat] += matN;
  if (full) {
    gain.souls = R.souls; G.souls += R.souls;
    if (Math.random() < R.catChance) { gain.cat = 1; G.cat++; }
    if (Math.random() < R.essChance) { gain.ess = 1; G.ess++; }
    if (Math.random() < R.gemChance) { randGem(G); gain.gems++; if (Math.random() < R.gem2) { randGem(G); gain.gems++; } }
    if (d === 3 && Math.random() < PET.nightEgg) { gain.egg = Math.random() < PET.nightRare ? "r" : "c"; addEgg(G, gain.egg); }
    if (t > G.dng.max) G.dng.max = t;
    G.dngd = G.dngd || {}; if (d > dngDiffMax(G, t)) { G.dngd[String(t)] = d; gain.ash = ASH.first * t * d; G.ash += gain.ash; } // перший прохід складності
  }
  G.dng.runs++;
  log(G, "dng", [t, full ? 1 : 0, chests, d]);
  return { t, d, rooms, full, paid, usedKey, gain, heroHp: Math.round(hero(G).hp), loc: dngLoc(t) };
}
// серія заходів (до 10) без показу бою: лише безкоштовні заходи й ключі, за Золото не платить
export function actDungeonBatch(G: State, t: number, now: number, d = 1, n = 10) {
  n = Math.max(1, Math.min(10, Math.floor(Number(n) || 1)));
  const sum = { chests: 0, matN: 0, souls: 0, cat: 0, ess: 0, ash: 0, gems: 0, eggs: 0 };
  let runs = 0, wins = 0, keys = 0, mat = 0, chestIl = 0, chestG = 1;
  for (let i = 0; i < n; i++) {
    const day = dayStr(now); if (G.dngDay.day !== day) G.dngDay = { day, used: 0, paid: 0 };
    if (G.dngDay.used >= DNG_DAILY && !((G.keys[String(t)] || 0) > 0)) break;
    const r = actDungeon(G, t, now, d);
    runs++; if (r.full) wins++; if (r.usedKey) keys++;
    sum.chests += r.gain.chests; sum.matN += r.gain.matN; sum.souls += r.gain.souls; sum.cat += r.gain.cat; sum.ess += r.gain.ess; sum.ash += r.gain.ash; sum.gems += r.gain.gems; if (r.gain.egg) sum.eggs++;
    mat = r.gain.mat; chestIl = r.gain.chestIl; chestG = r.gain.chestG;
  }
  if (!runs) fail("no_keys");
  return { t, d, batch: true, runs, wins, keys, gain: { ...sum, mat, chestIl, chestG } };
}
// рівень речі зі скрині = рівень героя; з шансом 50% — вище на 1–3 (рішення Влада 30.10). Тир підземелля на рівень речі не впливає
export const CHEST_LVL = { up: 0.5, max: 3 };
export const chestItemLvl = (G: State) => Math.max(1, G.lvl) + (Math.random() < CHEST_LVL.up ? 1 + Math.floor(Math.random() * CHEST_LVL.max) : 0);
export function actOpenChests(G: State, max = 100) {
  const free = Math.max(0, invMax(G) - G.inv.length);
  if (!free) fail("bag_full");
  let n = 0; const got: Item[] = [];
  // спершу кращі скрині: вищий вид (рівень речі — від героя, див. chestItemLvl)
  const ks = Object.keys(G.chests).sort((a, b) => { const x = chestParse(a), y = chestParse(b); return y.g - x.g || y.il - x.il; });
  for (const il of ks) {
    const c = chestParse(il);
    while (G.chests[il] > 0 && n < free && n < max) {
      G.chests[il]--; const it = makeItem(G, chestItemLvl(G), c.g, CHEST_LW[c.g] ?? 1); G.inv.unshift(it); got.push(it); n++;
      if (it.r >= 3) log(G, "loot", [it.r, it.slot, it.nm, it.il]);
    }
    if (!G.chests[il]) delete G.chests[il];
  }
  if (!n) fail("no_chests");
  return { n, best: Math.max(...got.map((i) => i.r)) };
}
// ---------- астрал ----------
export const AST = { base: 30, fail: 5, cap: 80, cat: 2, ess: 1 };
export const astSouls = (il: number) => Math.round(400 + il * 12);
export const astChance = (G: State) => Math.min(AST.cap, AST.base + AST.fail * (G.astFails || 0));
export function actAstral(G: State, id: number) {
  const it = G.inv.find((i) => i.id === Number(id)) || SLOTS.map((s) => G.eq[s]).find((i) => i && i.id === Number(id));
  if (!it) fail("no_item");
  if (it!.r !== 5) fail("not_mythic");
  const souls = astSouls(it!.il);
  if (G.cat < AST.cat) fail("no_catalyst");
  if (G.ess < AST.ess) fail("no_essence");
  if (G.souls < souls) fail("no_souls");
  const chance = astChance(G);
  G.cat -= AST.cat; G.ess -= AST.ess; G.souls -= souls;
  const win = Math.random() * 100 < chance;
  if (win) {
    const nw = buildItem(G, it!.il, 6, it!.slot);
    nw.id = it!.id; delete nw.nw; G.nid--; // той самий предмет стає астральним
    it!.r = 6; it!.st = nw.st;
    G.astFails = 0; log(G, "astral", [1, it!.slot]);
  } else { G.astFails++; log(G, "astral", [0, it!.slot, chance]); }
  return { win, chance, souls };
}

// ---------- арена ----------
export const ARENA = { stage: 10, daily: 5, win: 10, lose: 3, time: 30 };
export const ARENA_SHOP: Record<string, { pts: number }> = { chest: { pts: 60 }, gem: { pts: 150 }, stone: { pts: 40 }, egg: { pts: 200 } }; // stone — випадковий камінь 1 рівня, egg — звичайне яйце пітомця
const BOT_NAMES = ["Morwen", "Kairos", "Valdis", "Ingrid", "Torvald", "Seraphine", "Bram", "Elric", "Isolde", "Ragnar", "Vesna", "Dorian"];
export function arenaDay(G: State, now: number) {
  const d = dayStr(now);
  if (G.arena.day !== d) { G.arena.day = d; G.arena.used = 0; }
}
export const heroSnap = (G: State) => { const H = hero(G); return { atk: Math.round(H.atk), hp: Math.round(H.hp), def: Math.round(H.def), crit: Math.round(H.crit * 10) / 10 }; };
// суперник-бот: сила близька до гравця, коли живих суперників замало
export function botOpp(G: State, k: number): ArenaOpp {
  const H = hero(G), m = rnd(0.82, 1.12);
  const st = { atk: Math.round(H.atk * m), hp: Math.round(H.hp * m), def: Math.round(H.def * m), crit: Math.round(H.crit * 10) / 10 };
  return { id: null, name: BOT_NAMES[(G.nid + k * 5 + Math.floor(Math.random() * 12)) % BOT_NAMES.length], lvl: Math.max(1, G.lvl + Math.round(rnd(-3, 3))), power: power(st), rating: Math.max(0, G.arena.rating + Math.round(rnd(-60, 60))), st };
}
export type PvpEv = [number, 0 | 1, number, 0 | 1];
// бій двох героїв: удар кожну секунду (захисник — зі зсувом 0,25 с); за 30 с перемагає той, у кого більше % здоров'я
export function pvpFight(A: ArenaOpp["st"], D: ArenaOpp["st"]) {
  // на арені здоров'я ×4, щоб бій тривав ~20 ударів і перший удар не вирішував усе
  const PH = 4, mA = A.hp * PH, mD = D.hp * PH;
  let ha = mA, hd = mD, ta = 1, td = 1.25;
  const ev: PvpEv[] = [];
  const hit = (x: ArenaOpp["st"], y: ArenaOpp["st"]) => { const cr = Math.random() * 100 < x.crit; return { d: Math.round(Math.max(x.atk * 0.25, x.atk - y.def * 0.6) * rnd(0.9, 1.1) * (cr ? 2 : 1)), cr }; };
  while (Math.min(ta, td) <= ARENA.time && ha > 0 && hd > 0) {
    if (ta <= td) { const h = hit(A, D); hd -= h.d; ev.push([r2(ta), 0, h.d, h.cr ? 1 : 0]); ta += 1; }
    else { const h = hit(D, A); ha -= h.d; ev.push([r2(td), 1, h.d, h.cr ? 1 : 0]); td += 1; }
  }
  const win = hd <= 0 ? true : ha <= 0 ? false : ha / mA >= hd / mD;
  return { win, ev, hpA: mA, hpD: mD };
}
export function actArenaShop(G: State, item: string) {
  const it = ARENA_SHOP[item]; if (!it) fail("bad_item");
  if (G.arena.pts < it.pts) fail("no_pts");
  G.arena.pts -= it.pts;
  if (item === "chest") addChests(G, G.maxStage, 1);
  if (item === "gem") G.cat += 1;
  if (item === "egg") addEgg(G, "c");
  const got = item === "stone" ? randGem(G) : undefined;
  return { item, got };
}

// ---------- переплавка: уламки → скриня рівня макс. етапу ----------
export const SMELT = 400;
export function actSmelt(G: State, n = 1) {
  n = Math.max(1, Math.min(20, Math.floor(Number(n) || 1)));
  n = Math.min(n, Math.floor(G.shards / SMELT)); if (!n) fail("no_shards");
  G.shards -= SMELT * n; addChests(G, G.maxStage, n);
  return { n };
}
export const PAYOUT = { lvl: 30, days: 14 }; // допуск до виводу: рівень і стаж (дні активності)

// ---------- клани ----------
export const CLAN = { max: 20, createStage: 10, joinStage: 5 };
export const clanCreateCost = (_G?: State) => 50000; // фіксована ціна: інакше росте разом з етапом і «тікає» від гравця
// клан крафтить ключі з казни Попелу без ліміту й без зростання ціни (рішення 29.10, див. ASH).
export const ckeyCrafted = (G: State, now: number) => (G.ckey.day === dayStr(now) ? G.ckey.n : 0);
export function clanKeyCost(t: number, n = 1, forge = 0) { // у Попелі з казни клану: 70% ціни соло-входу, не дорожчає, Ковальня −5%/рів.
  const k = 1 - BUILD.forge.step / 100 * Math.min(BUILD.forge.max, forge || 0);
  return Math.max(1, Math.round(keyPrice(t) * ASH.clanMul * k)) * n;
}
// будівлі клану: прокачка з казни (золото + матеріал + уламки), бонуси всім учасникам. step — бонус за рівень
export type BldKey = "citadel" | "forge" | "vault" | "barracks" | "library";
export const BUILD: Record<BldKey, { max: number; base: number; mul: number; step: number }> = {
  citadel: { max: 5, base: 200000, mul: 3, step: 2 },    // +2 місця в клані
  forge: { max: 5, base: 100000, mul: 2.5, step: 5 },    // −5% ціни ключів з казни
  vault: { max: 5, base: 150000, mul: 2.5, step: 3 },    // +3% золота з ворогів
  barracks: { max: 5, base: 150000, mul: 2.5, step: 2 }, // +2% атаки й здоров'я
  library: { max: 5, base: 150000, mul: 2.5, step: 3 },  // +3% досвіду
};
// ресурси на рівень: матеріал (тир за рівнем будівлі) і уламки
const BLD_MAT = [0, 0, 1, 2, 2], BLD_MATN = [30, 80, 150, 250, 400];
export function bldCost(k: BldKey, lvl: number) {
  if (lvl >= BUILD[k].max) return null;
  return { gold: Math.round(BUILD[k].base * Math.pow(BUILD[k].mul, lvl)), mat: BLD_MAT[lvl], matN: BLD_MATN[lvl], sh: 200 * (lvl + 1) * (lvl + 1) };
}
export const clanMax = (bld?: Record<string, number> | null) => CLAN.max + BUILD.citadel.step * Math.min(BUILD.citadel.max, Number(bld?.citadel || 0));
export const clanBonus = (bld?: Record<string, number> | null) => ({ atk: BUILD.barracks.step * Number(bld?.barracks || 0), gold: BUILD.vault.step * Number(bld?.vault || 0), xp: BUILD.library.step * Number(bld?.library || 0) });
export function ckeyAdd(G: State, now: number, n: number) { const d = dayStr(now); if (G.ckey.day !== d) G.ckey = { day: d, n: 0 }; G.ckey.n += n; }
// внесок ресурсу в казну клану: k = m0..m3 (матеріали I–IV) або sh (уламки)
export function clanResTake(G: State, k: string, n: number) {
  n = Math.floor(Number(n));
  if (!(n >= 1)) fail("bad_ids");
  if (k === "sh") { if (G.shards < n) fail("no_shards"); G.shards -= n; return { k, n }; }
  const m = /^m([0-3])$/.exec(k); if (!m) fail("bad_ids");
  const i = Number(m![1]); if ((G.mats[i] || 0) < n) fail("no_mats");
  G.mats[i] -= n; return { k, n };
}
export const clanNameOk = (n: string) => /^[\p{L}\p{N} _'-]{3,20}$/u.test(n) && n.trim().length >= 3;

// розширення сумки за Іскри
export function actBag(G: State) {
  const c = bagCost(G); if (c === null) fail("max");
  if (G.souls < c!) fail("no_souls");
  G.souls -= c!; G.bag = (G.bag || 0) + 1;
  return { bag: G.bag, max: invMax(G) };
}

// сховище: забрати речі в сумку, скільки влізе; скинути повідомлення про переповнення
export function actVault(G: State) {
  G.vault = G.vault || [];
  const free = Math.max(0, invMax(G) - G.inv.length);
  if (!G.vault.length) { G.ovf = { v: 0, d: 0, sh: 0 }; return { n: 0 }; }
  if (!free) fail("bag_full");
  const take = G.vault.splice(0, free); G.inv.unshift(...take);
  return { n: take.length, left: G.vault.length };
}
export function actOvfSeen(G: State) { G.ovf = { v: 0, d: 0, sh: 0 }; return {}; }

// ---------- камені в спорядженні (рішення 30.10) ----------
// 4 типи: a Рубін (атака), h Сапфір (здоров'я), d Аметист (захист), c Смарагд (крит). Рівні 1–5, 3 однакові → 1 рівнем вище.
// Гнізда за рідкістю речі: епічна 1, легендарна 2, прадавня й вічна 3. Сила каменя росте з рівнем речі, тож камінь варто
// переносити в нові речі. Вставка безкоштовна, вилучення — за Попіл. Річ з каменями не продається торговцю й не розбирається.
export const GEM_TYPES = ["a", "h", "d", "c"] as const;
export const GEM_MAX = 5;
export const SOCKETS = [0, 0, 0, 1, 2, 3, 3];
export const GEM_M = [0.5, 1.2, 2.5, 5, 9];        // множник сили каменя за рівнем
export const GEM_CRIT = [0.5, 1, 2, 3.5, 5];       // Смарагд: +крит, %
export const GEM_OUT = [2, 5, 12, 25, 50];         // ціна вилучення, Попіл
export const GEM_DROP = { boss: 0.15, region: 2 }; // магазин арени: камінь за 40 очок (ARENA_SHOP.stone)
export const gemKey = (t: string, l: number) => `${t}${l}`;
export const gemParse = (k: string) => { const m = /^([ahdc])([1-5])$/.exec(String(k)); return m ? { t: m[1], l: Number(m[2]) } : null; };
export const sockets = (it: Item) => SOCKETS[it.r] || 0;
export function gemStat(k: string, il: number) {
  const g = gemParse(k), o = { atk: 0, hp: 0, def: 0, crit: 0 }; if (!g) return o;
  const v = gearScale(il) * GEM_M[g.l - 1];
  if (g.t === "a") o.atk = 3 * v; else if (g.t === "h") o.hp = 14 * v; else if (g.t === "d") o.def = 2 * v; else o.crit = GEM_CRIT[g.l - 1];
  return o;
}
export function gemStats(it: Item) {
  const o = { atk: 0, hp: 0, def: 0, crit: 0 };
  for (const k of it.gm || []) { const s = gemStat(k, it.il); o.atk += s.atk; o.hp += s.hp; o.def += s.def; o.crit += s.crit; }
  return o;
}
export function addGem(G: State, k: string, n = 1) { G.gems = G.gems || {}; G.gems[k] = (G.gems[k] || 0) + n; }
export function randGem(G: State, n = 1) { const got: string[] = []; for (let i = 0; i < n; i++) { const k = gemKey(pick(GEM_TYPES), 1); addGem(G, k); got.push(k); } return got; }
const findItem = (G: State, id: number) => G.inv.find((i) => i.id === Number(id)) || SLOTS.map((s) => G.eq[s]).find((i) => i && i.id === Number(id));
export function actGemInsert(G: State, id: number, k: string) {
  const it = findItem(G, id); if (!it) fail("no_item");
  if (!gemParse(k)) fail("bad_gem");
  if ((it!.gm?.length || 0) >= sockets(it!)) fail("no_socket");
  if (!((G.gems?.[k] || 0) > 0)) fail("no_gem");
  G.gems![k]--; if (!G.gems![k]) delete G.gems![k];
  it!.gm = [...(it!.gm || []), k];
  return { id: it!.id, k };
}
export function actGemRemove(G: State, id: number, i: number) {
  const it = findItem(G, id); if (!it) fail("no_item");
  i = Math.floor(Number(i)); const k = it!.gm?.[i]; if (!k) fail("no_gem");
  const cost = GEM_OUT[gemParse(k!)!.l - 1];
  if (G.ash < cost) fail("no_ash");
  G.ash -= cost; it!.gm!.splice(i, 1); if (!it!.gm!.length) delete it!.gm;
  addGem(G, k!);
  return { id: it!.id, k, cost };
}
// злиття: 3 камені рівня l → 1 рівня l+1; n = 0 — скільки вистачить
export function actGemMerge(G: State, k: string, n = 1) {
  const g = gemParse(k); if (!g) fail("bad_gem");
  if (g!.l >= GEM_MAX) fail("max");
  const have = G.gems?.[k] || 0, can = Math.floor(have / 3);
  n = Math.floor(Number(n)) || 0; n = n <= 0 ? can : Math.min(n, can);
  if (!n) fail("no_gem");
  G.gems![k] -= 3 * n; if (!G.gems![k]) delete G.gems![k];
  const up = gemKey(g!.t, g!.l + 1); addGem(G, up, n);
  return { k: up, n };
}
const noGems = (G: State, ids: number[]) => { const bad = new Set(G.inv.filter((i) => i.gm?.length).map((i) => i.id)); return ids.map(Number).filter((x) => !bad.has(x)); };

// ---------- пітомці (рішення 30.10) ----------
// Активний один пітомець: постійний бонус свого виду + знахідки кожні 8 год (зберігається до 3).
// Яйця: звичайне (Вовк/Голем/Ворон/Сова, 4 год), рідкісне (Привид, Фенікс або звичайний вид, 12 год).
// Ріст: годування матеріалами й уламками до 30 рівня; на 10 і 20 — еволюція за 1 Самоцвіт; дублікати: 2 копії → +1 зірка (до 5).
export type PetSp = "wolf" | "golem" | "raven" | "owl" | "ghost" | "phoenix";
export type PetBonus = "atk" | "def" | "gold" | "xp" | "off" | "souls";
export const PETS: Record<PetSp, { b: PetBonus; v: number; rare?: boolean }> = {
  wolf: { b: "atk", v: 3 }, golem: { b: "def", v: 4 }, raven: { b: "gold", v: 5 }, owl: { b: "xp", v: 4 },
  ghost: { b: "off", v: 10, rare: true }, phoenix: { b: "souls", v: 6, rare: true },
};
export const PET = { maxLvl: 30, maxStar: 5, dupStar: 2, evo: [10, 20], hatch: { c: 4 * 3600e3, r: 12 * 3600e3 }, findEvery: 8 * 3600e3, findMax: 3,
  nightEgg: 0.04, nightRare: 0.2, rareOdds: { ghost: 0.45, phoenix: 0.25 }, speedAsh: 5 };
export type Pet = { l: number; s: number; d: number };
export type PetState = { list: Partial<Record<PetSp, Pet>>; act: PetSp | null; eggs: { c: number; r: number }; inc: { e: "c" | "r"; at: number } | null; ft: number; fn: number };
export const petOf = (G: State): PetState => (G.pet = G.pet || { list: {}, act: null, eggs: { c: 0, r: 0 }, inc: null, ft: 0, fn: 0 });
export const petEvo = (l: number) => (l >= PET.evo[1] ? 2 : l >= PET.evo[0] ? 1 : 0);
export function petBonusOf(sp: PetSp, p: Pet) { return Math.round(PETS[sp].v * (1 + 0.06 * (p.l - 1)) * [1, 1.25, 1.5][petEvo(p.l)] * (1 + 0.5 * (p.s - 1)) * 10) / 10; }
export function petB(G: State, b: PetBonus) { const P = G.pet; if (!P || !P.act) return 0; const p = P.list[P.act]; return p && PETS[P.act].b === b ? petBonusOf(P.act, p) : 0; }
export function addEgg(G: State, e: string) { const P = petOf(G); if (e === "r") P.eggs.r++; else P.eggs.c++; }
// корм на рівень l → l+1: матеріал тиру за ступенем еволюції + уламки; на 10 і 20 ще Самоцвіт
export function petFeedCost(l: number) { if (l >= PET.maxLvl) return null; return { mat: Math.min(2, Math.floor(l / 10)), matN: 5 + l, shards: 15 * l, cat: PET.evo.includes(l) ? 1 : 0 }; }
// знахідки накопичуються, поки є активний пітомець
export function petTick(G: State, now: number) {
  const P = G.pet; if (!P || !P.act) return;
  if (!P.ft) P.ft = now;
  while (P.fn < PET.findMax && now - P.ft >= PET.findEvery) { P.fn++; P.ft += PET.findEvery; }
  if (P.fn >= PET.findMax) P.ft = now;
}
export function actPetSet(G: State, sp: string, now: number) {
  const P = petOf(G); if (!P.list[sp as PetSp]) fail("no_pet");
  petTick(G, now); if (!P.act) P.ft = now;
  P.act = sp as PetSp; return { act: sp };
}
export function actPetFeed(G: State, n = 1) {
  const P = petOf(G); if (!P.act) fail("no_pet");
  const act = P.act!, p = P.list[act]!; let done = 0; const want = Math.max(1, Math.min(30, Math.floor(Number(n) || 1)));
  while (done < want) {
    const c = petFeedCost(p.l); if (!c) { if (!done) fail("max"); break; }
    if (c.cat && done) break; // еволюція — окремою дією
    if (matsFrom(G, c.mat) < c.matN) { if (!done) fail("no_mats"); break; }
    if (G.shards < c.shards) { if (!done) fail("no_shards"); break; }
    if (G.cat < c.cat) { if (!done) fail("no_catalyst"); break; }
    takeMats(G, c.mat, c.matN); G.shards -= c.shards; G.cat -= c.cat; p.l++; done++;
    if (c.cat) { log(G, "petEvo", [act, petEvo(p.l)]); break; }
  }
  return { sp: act, l: p.l, n: done };
}
export function actPetHatch(G: State, e: string, now: number) {
  const P = petOf(G); if (P.inc) fail("pet_busy");
  const k = e === "r" ? "r" : "c"; if (!(P.eggs[k] > 0)) fail("no_egg");
  P.eggs[k]--; P.inc = { e: k, at: now + PET.hatch[k] }; return { inc: P.inc };
}
export const petSpeedCost = (G: State, now: number) => { const i = G.pet?.inc; return i ? Math.max(0, Math.ceil((i.at - now) / 3600e3)) * PET.speedAsh : 0; };
export function actPetSpeed(G: State, now: number) {
  const P = petOf(G); if (!P.inc) fail("no_egg");
  const c = petSpeedCost(G, now); if (G.ash < c) fail("no_ash");
  G.ash -= c; P.inc!.at = now; return { cost: c };
}
export function actPetClaim(G: State, now: number) {
  const P = petOf(G); if (!P.inc) fail("no_egg"); if (P.inc!.at > now) fail("pet_wait");
  let sp: PetSp;
  if (P.inc!.e === "r") { const r = Math.random(); sp = r < PET.rareOdds.ghost ? "ghost" : r < PET.rareOdds.ghost + PET.rareOdds.phoenix ? "phoenix" : pick(["wolf", "golem", "raven", "owl"] as PetSp[]); }
  else sp = pick(["wolf", "golem", "raven", "owl"] as PetSp[]);
  P.inc = null;
  const have = P.list[sp]; let isNew = false, star = 0;
  if (!have) { P.list[sp] = { l: 1, s: 1, d: 0 }; isNew = true; if (!P.act) { P.act = sp; P.ft = now; } }
  else { have.d++; if (have.s < PET.maxStar && have.d >= PET.dupStar) { have.d -= PET.dupStar; have.s++; star = have.s; } }
  log(G, "pet", [sp, isNew ? 1 : 0, star]);
  return { sp, isNew, star };
}
// знахідка: кидків 1 + (зірки−1)/2; скриня, камінь, матеріали, Попіл або уламки
export function actPetFind(G: State, now: number) {
  petTick(G, now); const P = petOf(G); if (!P.act || !P.fn) fail("no_find");
  const p = P.list[P.act!]!, rolls = 1 + Math.floor((p.s - 1) / 2), got: { k: string; n: number; x?: string }[] = [];
  for (let f = 0; f < P.fn; f++) for (let i = 0; i < rolls; i++) {
    const r = Math.random(), S = G.maxStage;
    if (r < 0.3) { addChests(G, S, 1); got.push({ k: "chest", n: 1 }); }
    else if (r < 0.5) { const x = randGem(G)[0]; got.push({ k: "gem", n: 1, x }); }
    else if (r < 0.75) { const m = Math.min(3, Math.floor(S / 20)), n = Math.round(5 + S / 4); G.mats[m] += n; got.push({ k: "mat", n, x: String(m) }); }
    else if (r < 0.9) { const n = 5 + Math.floor(Math.random() * 11); G.ash += n; got.push({ k: "ash", n }); }
    else { const n = 50 + S * 3; G.shards += n; got.push({ k: "shards", n }); }
  }
  P.fn = 0; P.ft = now;
  return { got };
}
export function petInfo(G: State, now: number) {
  const P = G.pet; if (!P) return null;
  petTick(G, now);
  const a = P.act ? P.list[P.act] : null;
  return { next: a ? petFeedCost(a.l) : null, incLeft: P.inc ? Math.max(0, P.inc.at - now) : 0, speed: petSpeedCost(G, now),
    findIn: P.act && P.fn < PET.findMax ? Math.max(0, P.ft + PET.findEvery - now) : 0,
    bonus: Object.fromEntries(Object.entries(P.list).map(([k, v]) => [k, petBonusOf(k as PetSp, v!)])) };
}

// ---------- ринок між гравцями: за Попіл або за Золото (рішення 29.10) ----------
// речі від рідкісних (r >= 2), легендарні й кращі — лише за Попіл; матеріали I–IV — будь-яка валюта.
// Продавець отримує ціну мінус комісія гри 10% (головний «злив» Попелу).
export type MCur = "ash" | "gold";
export const MARKET = { fee: 0.1, maxLots: 10, minR: 2, ashOnlyR: 4, maxPrice: { ash: 1000000, gold: 1e13 } as Record<MCur, number> };
export type MatLot = { kind: "mat"; m: number; n: number };
function mcur(c: unknown): MCur { return c === "gold" ? "gold" : "ash"; }
function mprice(p: unknown, cur: MCur) { const v = Math.floor(Number(p)); if (!(v >= 1 && v <= MARKET.maxPrice[cur])) fail("bad_price"); return v; }
export function marketTake(G: State, id: number, price: number, cur?: unknown) {
  const c = mcur(cur); price = mprice(price, c);
  const i = G.inv.findIndex((x) => x.id === Number(id)); if (i < 0) fail("no_item");
  const it = G.inv[i]; if (it.r < MARKET.minR) fail("market_rarity");
  if (it.r >= MARKET.ashOnlyR && c !== "ash") fail("market_ash_only");
  G.inv.splice(i, 1); delete it.nw;
  return { it, price, cur: c };
}
export function marketTakeMat(G: State, m: number, n: number, price: number, cur?: unknown) {
  const c = mcur(cur); price = mprice(price, c);
  m = Math.floor(Number(m)); n = Math.floor(Number(n));
  if (!(m >= 0 && m <= 3) || !(n >= 1)) fail("bad_ids");
  if ((G.mats[m] || 0) < n) fail("no_mats");
  G.mats[m] -= n;
  return { mat: { kind: "mat", m, n } as MatLot, price, cur: c };
}
export const marketNet = (gross: number) => Math.floor(gross * (1 - MARKET.fee));
// клан: умови вступу
export const CLAN_MODES = ["open", "apply", "closed"] as const;
export const CLAN_APPS_MAX = 5; // скільки заявок гравець може мати одночасно

