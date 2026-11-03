// Grimtale: малюнки спорядження (03.11). Форма — за слотом і назвою речі (it.nm), колір і ефекти — за рідкістю (it.r).
// Стиль: «темна казка» — чіткий темний контур, двотонова заливка (тінь + світло), без фотореалізму.
(function () {
  const O = '#17181c'; // контур
  // палітри рідкостей: m1 метал (тінь), m2 метал, hi відблиск, tr шкіра/дерево, tr2 шкіра світла, ac акцент (камінь, світіння)
  const PAL = [
    { m1: '#6c727a', m2: '#a7aeb6', hi: '#d5dadf', tr: '#5e4127', tr2: '#80603f', ac: '#b9bec4' },
    { m1: '#6f7a84', m2: '#b4bec8', hi: '#e2e8ee', tr: '#4b6431', tr2: '#6b8b45', ac: '#5fd07c' },
    { m1: '#55708f', m2: '#a3bfdc', hi: '#e4f0fb', tr: '#27466a', tr2: '#3c6896', ac: '#4f93f2' },
    { m1: '#4a4263', m2: '#8b80b6', hi: '#d6ccf5', tr: '#2c2142', tr2: '#4b386f', ac: '#b46cff' },
    { m1: '#a2701c', m2: '#e6bf55', hi: '#fff0b5', tr: '#6a380d', tr2: '#985a1d', ac: '#ff9a2e' },
    { m1: '#3a2a2f', m2: '#6e4a52', hi: '#b07c84', tr: '#3a2622', tr2: '#5a3a30', ac: '#ff3b4e' },
    { m1: '#86b3bf', m2: '#dbf3f8', hi: '#ffffff', tr: '#1c5663', tr2: '#2b8295', ac: '#3fe8ec' },
  ];
  const IVORY = '#e9dfc4', IVORY2 = '#bfb08c';
  const st = (w = 2) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const gem = (x, y, r, c, P) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st(1.6)}/><circle cx="${x - r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff" opacity=".75"/>`;

  // ---------- форми ----------
  const W = [
    // 0 меч
    (P, r) => `<g transform="rotate(45 32 32)"><path d="M28.5 41V10L32 3.5 35.5 10V41z" fill="${P.m2}" ${st()}/><path d="M32 4.5V41h-3.5V10z" fill="${P.hi}"/><path d="M32 12v26" stroke="${P.m1}" stroke-width="1.6"/>
      ${r >= 3 ? `<path d="M19 41.5c0-2.5 2-3.5 4-2.5h18c2-1 4 0 4 2.5S43 45 41 44H23c-2 1-4 0-4-2.5z" fill="${P.tr2}" ${st()}/>${gem(32, 42, 2.6, P.ac)}` : `<rect x="21" y="40" width="22" height="4.5" rx="2" fill="${P.tr2}" ${st()}/>`}
      <rect x="29.6" y="44.5" width="4.8" height="11" fill="${P.tr}" ${st(1.8)}/><path d="M29.6 48h4.8M29.6 51.5h4.8" stroke="${O}" stroke-width="1" opacity=".6"/><circle cx="32" cy="58.5" r="3.4" fill="${P.m2}" ${st(1.8)}/></g>`,
    // 1 сокира
    (P, r) => `<g transform="rotate(30 32 32)"><rect x="29.5" y="9" width="5" height="50" rx="2" fill="${P.tr}" ${st()}/><path d="M29.5 50h5M29.5 54h5" stroke="${O}" stroke-width="1" opacity=".6"/>
      <path d="M34 12c11-3 20 4 20 16-6-4-13-4-20-1z" fill="${P.m2}" ${st()}/><path d="M37 12.5c8-1 14 3 16 10-5-2.5-10-3-16-1z" fill="${P.hi}" opacity=".9"/><path d="M53.5 27.5c-1-6-4-11-9-13.5" stroke="${P.hi}" stroke-width="1.6" fill="none"/>
      ${r >= 3 ? `<path d="M30 12c-9-2-16 4-16 13 5-3 10-3 16-1z" fill="${P.m2}" ${st()}/>` : `<path d="M30 14l-7 2 1 6 6-1z" fill="${P.m1}" ${st(1.8)}/>`}
      <rect x="28.5" y="11" width="7" height="16" rx="2" fill="${P.m1}" ${st(1.8)}/>${r >= 3 ? gem(32, 19, 2.3, P.ac) : ''}</g>`,
    // 2 чорний клинок (вигнутий)
    (P, r) => `<g transform="rotate(40 32 32)"><path d="M29 42C27 28 28 16 33 4c3 12 4 26 2.5 38z" fill="${P.m1}" ${st()}/><path d="M33 5c2.5 12 3.3 25 2.3 37H32C31 29 31 17 33 5z" fill="${P.m2}"/><path d="M33.5 9c1.5 10 2 21 1.2 31" stroke="${P.hi}" stroke-width="1.3" fill="none"/>
      <ellipse cx="32" cy="43.5" rx="8.5" ry="3" fill="${P.tr2}" ${st()}/>${r >= 3 ? gem(32, 43.5, 2.2, P.ac) : ''}
      <rect x="29.8" y="46" width="4.4" height="11" rx="1.5" fill="${P.tr}" ${st(1.8)}/><path d="M29.8 49l4.4 2.5M29.8 53l4.4 2.5" stroke="${P.tr2}" stroke-width="1.2"/><path d="M28.5 57.5h7l-3.5 4z" fill="${P.m1}" ${st(1.6)}/></g>`,
    // 3 булава
    (P, r) => `<g transform="rotate(35 32 32)"><rect x="29.5" y="26" width="5" height="33" rx="2" fill="${P.tr}" ${st()}/><path d="M29.5 50h5M29.5 54h5" stroke="${O}" stroke-width="1" opacity=".6"/>
      <g fill="${P.m1}" ${st(1.6)}><path d="M32 2l3 8h-6z"/><path d="M45 9l-3 8-5-4z"/><path d="M19 9l3 8 5-4z"/><path d="M50 21l-8 2 1-6z"/><path d="M14 21l8 2-1-6z"/>${r >= 3 ? '<path d="M32 33l-3-6h6z"/>' : ''}</g>
      <circle cx="32" cy="18" r="10.5" fill="${P.m2}" ${st()}/><path d="M25 13a9 9 0 0 1 9-4" stroke="${P.hi}" stroke-width="2.2" fill="none"/><path d="M22.5 22h19" stroke="${P.m1}" stroke-width="1.4"/>${r >= 3 ? gem(32, 18, 3, P.ac) : ''}</g>`,
    // 4 серп жнеця (коса)
    (P, r) => `<g transform="rotate(-10 32 32)"><rect x="35" y="8" width="4.6" height="52" rx="2" fill="${P.tr}" transform="rotate(12 37 34)" ${st()}/>
      <path d="M39 10C27 5 12 9 6 22c8-6 18-8 30-3z" fill="${P.m2}" ${st()}/><path d="M36 13.5C26 10 15 12 9 19.5c9-4.5 17-5 27-2.5z" fill="${P.hi}" opacity=".85"/><path d="M8 20c7-7 16-9 27-7" stroke="${P.m1}" stroke-width="1.2" fill="none"/>
      <rect x="34" y="9" width="8" height="7" rx="2" fill="${P.m1}" ${st(1.8)}/>${r >= 3 ? gem(38, 12.5, 2, P.ac) : ''}</g>`,
  ];
  const H = [
    // 0 шолом вартового (з наносником)
    (P, r) => `<path d="M32 6C19 6 11 15 11 28v14c0 2 1.5 3.5 3.5 3.5H24V30h16v15.5h9.5c2 0 3.5-1.5 3.5-3.5V28C53 15 45 6 32 6z" fill="${P.m2}" ${st()}/><path d="M32 7C21 7 13.5 15 13 27l3 3 8-.5V12c3-3 5-4 8-5z" fill="${P.hi}" opacity=".7"/>
      <path d="M29 28h6v22l-3 4-3-4z" fill="${P.m1}" ${st(1.8)}/><path d="M11 30h18M35 30h18" stroke="${O}" stroke-width="1.8"/><path d="M11 36h13M40 36h13" stroke="${P.m1}" stroke-width="1.6"/>
      ${r >= 3 ? `<path d="M32 6c-3 0-4-4 0-8 4 4 3 8 0 8z" fill="${P.ac}" ${st(1.6)}/>` : ''}<g fill="${P.tr2}" ${st(1)}><circle cx="16" cy="40" r="1.5"/><circle cx="48" cy="40" r="1.5"/></g>`,
    // 1 залізний капюшон (кольчужний)
    (P, r) => `<path d="M32 5C18 5 10 16 10 30v20c5 6 13 9 22 9s17-3 22-9V30C54 16 46 5 32 5z" fill="${P.m2}" ${st()}/><path d="M32 18c-7 0-12 5-12 12v12c3 3 7 5 12 5s9-2 12-5V30c0-7-5-12-12-12z" fill="#16161b" ${st()}/>
      <g fill="${P.m1}">${Array.from({ length: 22 }, (_, i) => { const a = i * 0.45, rr = 17 + (i % 3) * 3.3; return `<circle cx="${(32 + Math.cos(a) * rr).toFixed(1)}" cy="${(33 + Math.sin(a) * rr * 0.95).toFixed(1)}" r="1.3"/>`; }).join('')}</g>
      <path d="M17 13c4-4 9-6 15-6" stroke="${P.hi}" stroke-width="2.4" fill="none"/><g fill="${P.ac}" opacity="${r >= 2 ? 1 : .0}"><circle cx="27" cy="31" r="2"/><circle cx="37" cy="31" r="2"/></g>`,
    // 2 рогатий шолом
    (P, r) => { const hc = r >= 4 ? P.ac : IVORY, hc2 = r >= 4 ? P.m1 : IVORY2; return `<path d="M15 26C8 22 4 13 6 4c3 7 8 11 14 13z" fill="${hc}" ${st()}/><path d="M49 26c7-4 11-13 9-22-3 7-8 11-14 13z" fill="${hc}" ${st()}/><path d="M8 9c2 5 5 8 10 10M56 9c-2 5-5 8-10 10" stroke="${hc2}" stroke-width="1.4" fill="none"/>
      <path d="M32 10c-12 0-19 9-19 20v16c0 2 1.5 3 3 3h32c1.5 0 3-1 3-3V30c0-11-7-20-19-20z" fill="${P.m2}" ${st()}/><path d="M32 11c-10 0-16.5 8-17 18l17-2z" fill="${P.hi}" opacity=".6"/>
      <path d="M17 31h30v6H36l-4 10-4-10H17z" fill="#16161b" ${st(1.8)}/><path d="M13 44h38" stroke="${P.m1}" stroke-width="2"/>${r >= 3 ? gem(32, 22, 2.6, P.ac) : ''}`; },
    // 3 корона з кісток
    (P, r) => `<path d="M8 50l2-26 9 9 6-18 7 14 7-14 6 18 9-9 2 26z" fill="${r >= 4 ? P.m2 : IVORY}" ${st()}/><path d="M10 33l9 9 6-18 7 14" stroke="${r >= 4 ? P.hi : '#fff8e6'}" stroke-width="1.8" fill="none" opacity=".8"/>
      <rect x="7" y="44" width="50" height="9" rx="2" fill="${r >= 4 ? P.m1 : IVORY2}" ${st()}/><g fill="${O}" opacity=".55"><circle cx="14" cy="48.5" r="1.3"/><circle cx="50" cy="48.5" r="1.3"/></g>
      ${gem(32, 48.5, 3.2, r >= 2 ? P.ac : '#c24c4c')}${gem(21, 48.5, 2, r >= 2 ? P.ac : '#c24c4c')}${gem(43, 48.5, 2, r >= 2 ? P.ac : '#c24c4c')}<g fill="${O}"><circle cx="19" cy="24" r="1.2"/><circle cx="45" cy="24" r="1.2"/><circle cx="32" cy="18" r="1.4"/></g>`,
  ];
  const A = [
    // 0 шкіряна куртка
    (P, r) => `<path d="M21 6l-10 5-6 14 7 3 3-6v35h34V22l3 6 7-3-6-14-10-5c-2 4-6 6-11 6s-9-2-11-6z" fill="${P.tr2}" ${st()}/><path d="M21 7c2 4 6 6 11 6v44H15V22l-3 6-6-2 5-13z" fill="${P.tr}" opacity=".55"/>
      <path d="M32 13v44" stroke="${O}" stroke-width="1.6"/><rect x="15" y="40" width="34" height="5" fill="${P.tr}" ${st(1.6)}/><rect x="29" y="39.5" width="6" height="6" rx="1" fill="${P.m2}" ${st(1.4)}/>
      <path d="M19 20v16M45 20v16" stroke="${O}" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>${r >= 3 ? gem(32, 26, 2.6, P.ac) : ''}`,
    // 1 кольчуга
    (P, r) => `<path d="M21 6l-10 5-6 16 7 2 3-6v34h34V23l3 6 7-2-6-16-10-5c-2 4-6 6-11 6s-9-2-11-6z" fill="${P.m2}" ${st()}/>
      <g fill="none" stroke="${P.m1}" stroke-width="1.3">${Array.from({ length: 6 }, (_, y) => Array.from({ length: 7 }, (_, x) => `<circle cx="${17 + x * 5 + (y % 2) * 2.5}" cy="${22 + y * 5.6}" r="2.2"/>`).join('')).join('')}</g>
      <path d="M21 7c2 4 6 6 11 6" stroke="${P.hi}" stroke-width="2.2" fill="none"/><rect x="15" y="51" width="34" height="5" fill="${P.tr}" ${st(1.6)}/>${r >= 3 ? gem(32, 18, 2.4, P.ac) : ''}`,
    // 2 латний нагрудник
    (P, r) => `<path d="M6 16c4-6 9-8 14-8l3 12-8 6-9-2z" fill="${P.m1}" ${st()}/><path d="M58 16c-4-6-9-8-14-8l-3 12 8 6 9-2z" fill="${P.m1}" ${st()}/>
      <path d="M20 8h24l5 14v22c0 7-8 13-17 15-9-2-17-8-17-15V22z" fill="${P.m2}" ${st()}/><path d="M32 8v51c-9-2-17-8-17-15V22l5-14z" fill="${P.hi}" opacity=".55"/><path d="M32 9v49" stroke="${P.m1}" stroke-width="1.8"/>
      <path d="M21 30c6 2 16 2 22 0M21 40c6 2 16 2 22 0" stroke="${O}" stroke-width="1.4" fill="none" opacity=".7"/><g fill="${P.tr2}" ${st(1)}><circle cx="11" cy="15" r="1.5"/><circle cx="53" cy="15" r="1.5"/></g>${r >= 3 ? gem(32, 22, 3.2, P.ac) : ''}`,
    // 3 мантія попелу (плащ з каптуром)
    (P, r) => `<path d="M32 4c-9 0-15 7-15 16l-8 38c8 3 15 4 23 4s15-1 23-4l-8-38c0-9-6-16-15-16z" fill="${P.tr2}" ${st()}/><path d="M32 4c-9 0-15 7-15 16l-8 38c8 3 15 4 23 4z" fill="${P.tr}" opacity=".5"/>
      <path d="M32 10c-6 0-10 5-10 11 0 4 2 7 4 9h12c2-2 4-5 4-9 0-6-4-11-10-11z" fill="#141317" ${st(1.8)}/><g fill="${r >= 2 ? P.ac : '#d9d2c0'}"><circle cx="28.5" cy="22" r="1.6"/><circle cx="35.5" cy="22" r="1.6"/></g>
      <path d="M26 30l-4 30M38 30l4 30" stroke="${O}" stroke-width="1.4" opacity=".6"/><path d="M9 58c8 3 15 4 23 4s15-1 23-4" stroke="${r >= 3 ? P.ac : P.m2}" stroke-width="2.4" fill="none"/>${r >= 3 ? `<path d="M26 32h12l-6 6z" fill="${P.m2}" ${st(1.4)}/>` : ''}`,
  ];
  const B = [
    // 0 стоптані чоботи
    (P, r) => `<path d="M17 6h16v28l13 8c4 2 6 6 6 10v4H12V36c0-3 2-5 5-6z" fill="${P.tr2}" ${st()}/><path d="M17 6h7v50H12V36c0-3 2-5 5-6z" fill="${P.tr}" opacity=".55"/>
      <path d="M17 12h16" stroke="${O}" stroke-width="1.6"/><path d="M33 34c-4 3-9 4-14 4" stroke="${O}" stroke-width="1.2" fill="none" opacity=".6"/><rect x="11" y="54" width="42" height="5" rx="1.5" fill="${P.tr}" ${st(1.6)}/>${r >= 3 ? gem(25, 22, 2.4, P.ac) : ''}`,
    // 1 поножі мисливця (шкіра + пластина на гомілці)
    (P, r) => `<path d="M17 6h16v28l13 8c4 2 6 6 6 10v4H12V36c0-3 2-5 5-6z" fill="${P.tr2}" ${st()}/><path d="M15 8h20l-1 24c-5 3-12 3-17 0z" fill="${P.m2}" ${st()}/><path d="M25 8v26" stroke="${P.m1}" stroke-width="1.6"/><path d="M17 9h7v22l-6-1z" fill="${P.hi}" opacity=".6"/>
      <path d="M33 40l6 3M35 37l6 3" stroke="${O}" stroke-width="1.4"/><rect x="11" y="54" width="42" height="5" rx="1.5" fill="${P.tr}" ${st(1.6)}/>${r >= 3 ? gem(25, 20, 2.4, P.ac) : ''}`,
    // 2 сталеві чоботи
    (P, r) => `<path d="M16 5h18v28l12 7c5 3 7 7 7 11v5H11V36c0-3 2-5 5-6z" fill="${P.m2}" ${st()}/><path d="M16 5h8v51H11V36c0-3 2-5 5-6z" fill="${P.hi}" opacity=".55"/>
      <path d="M16 13h18M16 21h18M16 29h18" stroke="${P.m1}" stroke-width="1.6"/><path d="M34 40c-6 2-12 2-17 0" stroke="${O}" stroke-width="1.6" fill="none"/><path d="M38 45c4 1 8 3 10 6" stroke="${P.m1}" stroke-width="1.6" fill="none"/>
      <rect x="10" y="54" width="44" height="5" rx="1.5" fill="${P.m1}" ${st(1.6)}/>${r >= 3 ? `<path d="M34 8l9-5-2 9z" fill="${P.ac}" ${st(1.4)}/>` : ''}`,
    // 3 чоботи тіні (з крилом)
    (P, r) => `<path d="M33 10c8-6 16-6 24-3-6 1-10 4-12 8 5-2 9-1 12 1-6 0-10 2-14 6z" fill="${r >= 3 ? P.ac : P.m1}" ${st(1.6)} opacity=".95"/>
      <path d="M17 6h16v28l13 8c4 2 6 6 6 10v4H12V36c0-3 2-5 5-6z" fill="${P.m1}" ${st()}/><path d="M17 6h7v50H12V36c0-3 2-5 5-6z" fill="${P.m2}" opacity=".5"/>
      <path d="M17 14h16M17 22h16" stroke="${O}" stroke-width="1.4" opacity=".7"/><rect x="11" y="54" width="42" height="5" rx="1.5" fill="#141317" ${st(1.6)}/>${r >= 2 ? gem(25, 30, 2.4, P.ac) : ''}`,
  ];
  const RG = [
    // 0 мідний перстень
    (P, r) => ringBase(P, r, `<path d="M25 12h14l-3 9h-8z" fill="${r >= 2 ? P.ac : '#c98a52'}" ${st(1.8)}/><path d="M27 13h5l-1.5 6H29z" fill="#fff" opacity=".55"/>`),
    // 1 перстень крові
    (P, r) => ringBase(P, r, `<path d="M32 2c-3 5-8 9-8 14a8 8 0 0 0 16 0c0-5-5-9-8-14z" fill="${r >= 5 ? P.ac : '#d22f45'}" ${st(1.8)}/><path d="M28.5 13c0-2.5 1.5-5 3-7" stroke="#fff" stroke-width="1.8" opacity=".7" fill="none"/>`),
    // 2 перстень вовка (емблема голови)
    (P, r) => ringBase(P, r, `<path d="M22 6l4 4h12l4-4 1 9-4 6-7 4-7-4-4-6z" fill="${P.m1}" ${st(1.8)}/><path d="M26 13l3 2M38 13l-3 2" stroke="${r >= 2 ? P.ac : '#f2c14e'}" stroke-width="2.2"/><path d="M30 20l2 2 2-2" stroke="${O}" stroke-width="1.4" fill="none"/>`),
    // 3 печатка мертвих (печатка з черепом)
    (P, r) => ringBase(P, r, `<rect x="21" y="3" width="22" height="18" rx="4" fill="${P.m1}" ${st(1.8)}/><path d="M32 6c-4 0-6 3-6 6 0 2 1 3 2 4v2h8v-2c1-1 2-2 2-4 0-3-2-6-6-6z" fill="${IVORY}" ${st(1.2)}/><g fill="${r >= 2 ? P.ac : O}"><circle cx="29.5" cy="12" r="1.4"/><circle cx="34.5" cy="12" r="1.4"/></g>`),
  ];
  function ringBase(P, r, top) {
    return `<circle cx="32" cy="38" r="16" fill="none" stroke="${O}" stroke-width="9"/><circle cx="32" cy="38" r="16" fill="none" stroke="${P.m2}" stroke-width="5.5"/><path d="M20 34a13 13 0 0 1 8-10" stroke="${P.hi}" stroke-width="2" fill="none"/>
      <path d="M45 46a14 14 0 0 1-8 6" stroke="${P.m1}" stroke-width="2" fill="none"/>${r >= 3 ? `<g fill="${P.ac}">${[[17, 44], [47, 44], [32, 54]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')}</g>` : ''}${top}`;
  }
  const AM = [
    // 0 амулет з ікла
    (P, r) => amBase(P, r, `<path d="M28 34c0 10 2 18 5 24 2-7 3-15 2-24z" fill="${IVORY}" ${st(1.8)}/><path d="M30 36c0 7 1 13 3 18" stroke="#fff" stroke-width="1.4" opacity=".7" fill="none"/><rect x="26" y="30" width="11" height="6" rx="2" fill="${P.tr}" ${st(1.6)}/>`),
    // 1 оберіг відьми (листок із руною)
    (P, r) => amBase(P, r, `<path d="M32 30c-9 6-12 15-8 25 2 2 5 3 8 3s6-1 8-3c4-10 1-19-8-25z" fill="${r >= 2 ? P.m1 : '#5c7a3c'}" ${st(1.8)}/><path d="M32 33v22M32 42l-5-4M32 48l5-4" stroke="${r >= 2 ? P.ac : '#c7e08a'}" stroke-width="1.8" fill="none"/>`),
    // 2 око безодні
    (P, r) => amBase(P, r, `<circle cx="32" cy="44" r="12" fill="${P.m2}" ${st(1.8)}/><path d="M22 44c3-5 6-7 10-7s7 2 10 7c-3 5-6 7-10 7s-7-2-10-7z" fill="#f4efe6" ${st(1.4)}/><circle cx="32" cy="44" r="4.2" fill="${r >= 2 ? P.ac : '#7a3fb0'}" ${st(1.2)}/><circle cx="32" cy="44" r="1.6" fill="${O}"/><circle cx="30.8" cy="42.8" r=".9" fill="#fff"/>`),
    // 3 серце попелу
    (P, r) => amBase(P, r, `<path d="M32 58c-9-6-15-12-15-19 0-5 3-8 7-8 3 0 6 2 8 5 2-3 5-5 8-5 4 0 7 3 7 8 0 7-6 13-15 19z" fill="${r >= 2 ? P.ac : '#b8442c'}" ${st(1.8)}/><path d="M23 38c0-3 2-4 4-4" stroke="#fff" stroke-width="2" opacity=".7" fill="none"/><path d="M28 44l4 4 3-6" stroke="${O}" stroke-width="1.4" opacity=".55" fill="none"/>`),
  ];
  function amBase(P, r, pend) {
    return `<path d="M12 4c1 12 9 22 20 26 11-4 19-14 20-26" fill="none" stroke="${O}" stroke-width="4.5" stroke-linecap="round"/><path d="M12 4c1 12 9 22 20 26 11-4 19-14 20-26" fill="none" stroke="${P.m2}" stroke-width="2.2" stroke-dasharray="3 2" stroke-linecap="round"/>
      ${r >= 3 ? `<path d="M22 32c3-3 7-4 10-4s7 1 10 4l-3 4H25z" fill="${P.m2}" ${st(1.6)}/>` : ''}${pend}`;
  }
  const SH = { weapon: W, helmet: H, armor: A, boots: B, ring: RG, amulet: AM };

  // ---------- ефекти рідкості ----------
  function back(P, r, id) {
    if (r < 4) return '';
    return `<defs><radialGradient id="g${id}"><stop offset="0" stop-color="${P.ac}" stop-opacity="${r >= 5 ? .55 : .4}"/><stop offset="1" stop-color="${P.ac}" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#g${id})"/>`;
  }
  function front(P, r, img) {
    if (r === 5) return `<g fill="${P.ac}">${[[8, 50, 1.6], [56, 14, 1.3], [52, 54, 1.8], [10, 16, 1.2]].map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="${s}"/>`).join('')}</g>${img ? '' : `<path d="M20 30l4 3-2 4 4 3" stroke="${P.ac}" stroke-width="1.4" fill="none" opacity=".9"/>`}`;
    if (r === 6) { const star = (x, y, s) => `<path d="M${x} ${y - s}L${x + s * .3} ${y - s * .3}L${x + s} ${y}L${x + s * .3} ${y + s * .3}L${x} ${y + s}L${x - s * .3} ${y + s * .3}L${x - s} ${y}L${x - s * .3} ${y - s * .3}z" fill="#fff"/>`; return star(9, 12, 4) + star(55, 50, 3.5) + star(54, 10, 2.5) + star(10, 52, 2.2); }
    return '';
  }
  let uid = 0;
  window.gearSvg = function (slot, r, nm) {
    const P = PAL[Math.max(0, Math.min(6, r || 0))], sh = SH[slot] || W, f = sh[(nm || 0) % sh.length], id = ++uid;
    return `<svg class="gsv" viewBox="0 0 64 64">${back(P, r, id)}${f(P, r)}${front(P, r)}</svg>`;
  };
  // намальовані картинки (03.11, Higgsfield): assets/items/<слот><назва>_<рідкість>.webp; поверх — світіння й іскри рідкості з SVG
  const CNT = { weapon: 5, helmet: 4, armor: 4, boots: 4, ring: 4, amulet: 4 };
  window.gearArt = function (slot, r, nm) {
    r = Math.max(0, Math.min(6, r || 0)); const P = PAL[r], id = ++uid, n = (nm || 0) % (CNT[slot] || 4);
    const b = back(P, r, id), f = front(P, r, 1);
    return `<span class="gart">${b ? `<svg class="gfx gb" viewBox="0 0 64 64">${b}</svg>` : ''}<img src="assets/items/${slot}${n}_${r}.webp" alt="" loading="lazy" onerror="this.outerHTML=gearSvg('${slot}',${r},${n})">${f ? `<svg class="gfx gf" viewBox="0 0 64 64">${f}</svg>` : ''}</span>`;
  };
  // значок речі в рамці кольору рідкості
  window.gearIc = function (it, big) { return `<span class="gic r${it.r}${big ? ' big' : ''}">${window.gearArt(it.slot, it.r, it.nm)}</span>`; };
})();
