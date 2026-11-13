// 13.11 (Влад): вимпел клану біля ніку. Малюється з назви клану: слова-ключі дають знак і колір,
// решта (форма, візерунок, колір без ключів) — з «відбитка» назви; ступінь рамки (0–3) рахує сервер за будівлями.
(function(){
const PAL={crimson:['#9a1d2b','#3d0910'],ember:['#b4481c','#471606'],purple:['#55248a','#1f0b36'],night:['#232a63','#0b0e28'],ice:['#2c74a8','#0e2d47'],forest:['#28632e','#0d2711'],ochre:['#a0700f','#3e2a04'],teal:['#177a73','#07302c'],ash:['#6e655c','#29241f'],black:['#2a2632','#0c0b10']};
const PKEYS=Object.keys(PAL);
const KW=[ // символ, корені (uk/ru/en), колір-підказка
 ['crown',['royal','king','lord','корол','цар','лорд','імпер','импер','empire','crown','корон'],'purple'],
 ['flame',['hell','пекл','fire','вогн','вогон','огон','полум','пламя','flame','burn','інферн','inferno'],'crimson'],
 ['wolf',['wolf','wolves','вовк','вовч','волк','волч','зграя','стая','pack'],null],
 ['skull',['death','dead','skull','смерт','мерт','череп','кіст','кост','grim','попіл','пепел','bone'],'ash'],
 ['swords',['war','sword','blade','меч','війн','войн','воїн','воин','клинк','legion','легіон'],null],
 ['moon',['night','moon','shadow','dark','ніч','ноч','місяц','луна','тін','тен','темр','тьм'],'night'],
 ['wheat',['farm','harvest','ферм','урож','хліб','зерн','нив'],'ochre'],
 ['bow',['hunt','archer','мислив','охот','лучн','стріл','стрел','ranger'],'forest'],
 ['snow',['frost','snow','winter','крижа','мороз','зим','сніг','снег','ледян','glacier'],'ice'],
 ['eye',['eye','watch','очі','глаз','варт','страж','oracle'],null],
 ['tower',['tower','fort','castle','citadel','guard','вежа','веж','башн','замок','фортец','бастіон'],null],
 ['tree',['forest','tree','root','oak','ліс','лес','дуб','корін','друїд','druid'],'forest'],
 ['axe',['axe','viking','berserk','сокир','топор','вікінг','викинг','берсерк'],null],
];
const SYMS=KW.map(k=>k[0]);
function fnv(s){let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h}
function tagOf(name){
  const ws=name.replace(/([a-zа-яіїєґ])([A-ZА-ЯІЇЄҐ])/g,'$1 $2').split(/[\s_\-.]+/).map(w=>w.replace(/[^A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/g,'')).filter(w=>w&&!/^(і|й|та|и|and|of|the)$/i.test(w));
  if(ws.length>=2)return ws.slice(0,4).map(w=>w[0]).join('').toUpperCase();
  return (ws[0]||'КЛАН').slice(0,4).toUpperCase();
}
function gen(name){
  const low=name.toLowerCase(),h=fnv(low);const hits=[];
  for(const [sym,roots,col] of KW){let p=-1;for(const r of roots){const i=low.indexOf(r);if(i>=0&&(p<0||i<p))p=i}if(p>=0)hits.push({sym,col,p,r:roots.find(r=>low.includes(r))})}
  hits.sort((a,b)=>a.p-b.p);
  const sym=hits.length?hits[0].sym:SYMS[h%SYMS.length];
  const ch=[...hits].reverse().find(x=>x.col);
  const pal=ch?ch.col:PKEYS[(h>>>4)%PKEYS.length];
  return {name,tag:tagOf(name),sym,pal,shape:(h>>>8)%4,pat:(h>>>11)%6,hits,why:hits.length?hits.map(x=>x.r):null};
}
// ---------- символи (поле 100×100, L — світле, D — темне) ----------
function star(cx,cy,r){let d='';for(let i=0;i<8;i++){const a=Math.PI/4*i-Math.PI/2,rr=i%2?r*.35:r;d+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+' '+(cy+rr*Math.sin(a)).toFixed(1)}return d+'Z'}
function symbol(s,L,D){
 switch(s){
 case 'crown':return `<path d="M12 74 L17 32 L34 54 L50 20 L66 54 L83 32 L88 74 Z" fill="${L}"/><rect x="11" y="76" width="78" height="13" rx="3" fill="${L}"/><circle cx="17" cy="28" r="6" fill="${L}"/><circle cx="50" cy="15" r="7" fill="${L}"/><circle cx="83" cy="28" r="6" fill="${L}"/><circle cx="50" cy="62" r="6" fill="${D}"/><circle cx="31" cy="66" r="4" fill="${D}"/><circle cx="69" cy="66" r="4" fill="${D}"/><rect x="18" y="80" width="64" height="4" rx="2" fill="${D}" opacity=".6"/>`;
 case 'flame':return `<path d="M50 4 C59 25 81 36 79 62 C78 83 64 95 50 95 C35 95 21 84 21 63 C21 47 32 39 34 24 C40 37 44 43 48 45 C51 32 46 20 50 4 Z" fill="${L}"/><path d="M51 44 C57 57 67 64 65 78 C64 87 58 91 50 91 C42 91 36 86 36 78 C36 68 45 63 46 53 C48 58 50 60 51 62 C53 56 51 50 51 44 Z" fill="${D}"/><path d="M50 66 C54 73 58 76 57 83 C56 87 53 89 50 89 C47 89 44 87 44 83 C44 77 49 74 50 66 Z" fill="${L}" opacity=".85"/>`;
 case 'wolf':return `<path d="M50 94 L37 80 L27 62 L22 40 L17 6 L37 26 L50 22 L63 26 L83 6 L78 40 L73 62 L63 80 Z" fill="${L}"/><path d="M23 15 L34 28 L26 35 Z M77 15 L66 28 L74 35 Z" fill="${D}"/><path d="M31 45 L45 50 L34 55 Z M69 45 L55 50 L66 55 Z" fill="${D}"/><path d="M50 26 L47 40 L50 62 L53 40 Z" fill="${D}" opacity=".45"/><path d="M42 72 L58 72 L50 82 Z" fill="${D}"/><path d="M27 62 L36 66 M73 62 L64 66 M30 70 L38 72 M70 70 L62 72" stroke="${D}" stroke-width="2.5"/>`;
 case 'skull':return `<path d="M50 6 C25 6 13 25 13 45 C13 60 21 68 30 72 L30 88 L70 88 L70 72 C79 68 87 60 87 45 C87 25 75 6 50 6 Z" fill="${L}"/><ellipse cx="34" cy="47" rx="11" ry="12" fill="${D}"/><ellipse cx="66" cy="47" rx="11" ry="12" fill="${D}"/><path d="M50 57 L44 70 L56 70 Z" fill="${D}"/><path d="M40 76 V88 M50 76 V88 M60 76 V88" stroke="${D}" stroke-width="3"/><path d="M58 10 C70 14 78 22 81 32" stroke="${D}" stroke-width="2" fill="none" opacity=".5"/>`;
 case 'swords':{const sw=`<path d="M50 2 L56 13 L56 64 L44 64 L44 13 Z" fill="${L}"/><path d="M50 14 V60" stroke="${D}" stroke-width="2"/><rect x="29" y="63" width="42" height="8" rx="4" fill="${L}"/><rect x="46" y="71" width="8" height="15" fill="${L}"/><path d="M46 74 H54 M46 79 H54" stroke="${D}" stroke-width="1.6"/><circle cx="50" cy="91" r="6" fill="${L}"/><circle cx="50" cy="91" r="2.4" fill="${D}"/>`;return `<g transform="rotate(-38 50 50)">${sw}</g><g transform="rotate(38 50 50)">${sw}</g>`}
 case 'moon':return `<path d="M60 6 A44 44 0 1 0 94 74 A35 35 0 1 1 60 6 Z" fill="${L}"/><path d="${star(70,34,10)}" fill="${L}"/><path d="${star(84,55,6)}" fill="${L}"/><path d="${star(62,58,5)}" fill="${L}"/><path d="M26 30 A30 30 0 0 0 22 62" stroke="${D}" stroke-width="2.5" fill="none" opacity=".5"/>`;
 case 'wheat':{let g='';for(const a of [-26,0,26]){g+=`<g transform="rotate(${a} 50 92)"><path d="M50 92 V22" stroke="${L}" stroke-width="3.5"/>`;for(let y=24;y<=58;y+=11){g+=`<ellipse cx="44" cy="${y}" rx="4.5" ry="8" transform="rotate(-28 44 ${y})" fill="${L}"/><ellipse cx="56" cy="${y}" rx="4.5" ry="8" transform="rotate(28 56 ${y})" fill="${L}"/>`}g+=`<ellipse cx="50" cy="15" rx="4" ry="8" fill="${L}"/></g>`}return g+`<rect x="38" y="68" width="24" height="8" rx="3" fill="${D}"/><rect x="38" y="68" width="24" height="8" rx="3" fill="none" stroke="${L}" stroke-width="2"/>`}
 case 'bow':return `<path d="M30 6 Q82 50 30 94" stroke="${L}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M30 6 V94" stroke="${L}" stroke-width="1.8"/><path d="M8 50 H86" stroke="${L}" stroke-width="3.5"/><path d="M97 50 L82 41 L85 50 L82 59 Z" fill="${L}"/><path d="M8 50 L1 41 M8 50 L1 59 M15 50 L8 41 M15 50 L8 59" stroke="${L}" stroke-width="3"/><circle cx="52" cy="50" r="3" fill="${D}"/>`;
 case 'snow':{let g='';for(let i=0;i<6;i++)g+=`<g transform="rotate(${i*60} 50 50)"><path d="M50 50 V7 M50 22 L40 12 M50 22 L60 12 M50 35 L42 28 M50 35 L58 28" stroke="${L}" stroke-width="5" stroke-linecap="round"/></g>`;return g+`<circle cx="50" cy="50" r="9" fill="${L}"/><circle cx="50" cy="50" r="4" fill="${D}"/>`}
 case 'eye':return `<path d="M4 50 Q50 2 96 50 Q50 98 4 50 Z" fill="${L}"/><circle cx="50" cy="50" r="20" fill="${D}"/><ellipse cx="50" cy="50" rx="4.5" ry="15" fill="${L}"/><circle cx="57" cy="42" r="3" fill="${L}" opacity=".8"/><path d="M22 26 L16 16 M36 18 L33 7 M50 15 V4 M64 18 L67 7 M78 26 L84 16" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>`;
 case 'tower':return `<path d="M24 94 L29 36 L71 36 L76 94 Z" fill="${L}"/><path d="M20 18 H33 V26 H43 V18 H57 V26 H67 V18 H80 V38 H20 Z" fill="${L}"/><path d="M42 94 V74 A8 8 0 0 1 58 74 V94 Z" fill="${D}"/><rect x="46" y="48" width="8" height="13" rx="4" fill="${D}"/><path d="M28 56 H40 M60 66 H72 M30 80 H38" stroke="${D}" stroke-width="2" opacity=".6"/>`;
 case 'tree':return `<circle cx="50" cy="30" r="22" fill="${L}"/><circle cx="28" cy="44" r="17" fill="${L}"/><circle cx="72" cy="44" r="17" fill="${L}"/><circle cx="50" cy="50" r="19" fill="${L}"/><path d="M43 94 Q46 76 45 60 L55 60 Q54 76 57 94 Z M43 94 L32 96 M57 94 L68 96" fill="${L}" stroke="${L}" stroke-width="4"/><path d="M50 60 L40 50 M50 62 L61 50 M50 58 V44" stroke="${D}" stroke-width="3"/><circle cx="34" cy="38" r="2.5" fill="${D}"/><circle cx="66" cy="34" r="2.5" fill="${D}"/>`;
 case 'axe':return `<rect x="46" y="6" width="8" height="90" rx="3" fill="${L}"/><path d="M54 20 Q92 16 94 50 Q92 84 54 80 Q63 50 54 20 Z" fill="${L}"/><path d="M46 20 Q8 16 6 50 Q8 84 46 80 Q37 50 46 20 Z" fill="${L}"/><path d="M50 2 L56 12 L44 12 Z" fill="${L}"/><path d="M62 30 Q80 32 84 50 Q80 68 62 70 M38 30 Q20 32 16 50 Q20 68 38 70" stroke="${D}" stroke-width="2.5" fill="none"/><path d="M46 86 H54 M46 91 H54" stroke="${D}" stroke-width="1.8"/>`;
 }}
const SHAPES=[ 'M16 18 H104 V152 L60 128 L16 152 Z', 'M16 18 H104 V124 L60 162 L16 124 Z', 'M16 18 H104 V150 L89 136 L75 150 L60 136 L45 150 L31 136 L16 150 Z', 'M16 18 H104 V122 Q104 160 60 160 Q16 160 16 122 Z' ];
const TIPS=[[[16,152],[104,152]],[[60,162]],[[16,150],[45,150],[75,150],[104,150]],[[60,160]]];
const TIER=[{n:'Бронза',m:'#b9783a',m2:'#6e4319',pole:'#6b4a2b'},{n:'Срібло',m:'#d7dde4',m2:'#7d8792',pole:'#5d5f66'},{n:'Золото',m:'#f0c860',m2:'#8a6416',pole:'#8a6416'},{n:'Легенда',m:'#ffd970',m2:'#a0701a',pole:'#a0701a'}];
function banner(name,tier=0,w=120){
 const g=gen(name),u='pn'+(fnv(name+'|'+tier+'|'+w)>>>0).toString(36),sm=w<40,[F,A]=PAL[g.pal],T=TIER[tier],L='#f6e8c6',sh=SHAPES[g.shape];
 const pats=['',`<path d="M16 40 L82 18 H104 V40 L16 110 Z" fill="${A}" opacity=".75"/>`,`<path d="M16 96 L60 62 L104 96 V116 L60 82 L16 116 Z" fill="${A}" opacity=".75"/>`,`<rect x="44" y="18" width="32" height="150" fill="${A}" opacity=".6"/>`,`<rect x="16" y="18" width="44" height="52" fill="${A}" opacity=".6"/><rect x="60" y="70" width="44" height="100" fill="${A}" opacity=".6"/>`,`<path d="${sh}" fill="none" stroke="${A}" stroke-width="14" opacity=".8"/>`];
 const tass=tier>=2?TIPS[g.shape].map(([x,y])=>`<path d="M${x} ${y} v6" stroke="${T.m}" stroke-width="2"/><path d="M${x-3.5} ${y+6} h7 l-1.5 12 h-4 Z" fill="${T.m}"/><path d="M${x-2} ${y+9} v8 M${x} ${y+9} v9 M${x+2} ${y+9} v8" stroke="${T.m2}" stroke-width=".8"/>`).join(''):'';
 const stars=tier>=3?[[24,34],[96,34],[30,112],[90,112]].map(([x,y])=>`<path d="${star(x,y,4.5)}" fill="${T.m}"/>`).join(''):'';
 const fin=tier>=3?`<path d="M3 13 L-3 9 L3 5 Z" fill="${T.m}"/><path d="M117 13 L123 9 L117 5 Z" fill="${T.m}"/><path d="M60 -2 L66 8 L60 12 L54 8 Z" fill="${T.m}"/>`:`<circle cx="5" cy="10" r="4.5" fill="${T.m}"/><circle cx="115" cy="10" r="4.5" fill="${T.m}"/>`;
 return `<svg width="${w}" height="${w*1.55}" viewBox="-6 -6 132 186" style="overflow:visible">
 <defs><linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${F}" stop-opacity="1"/><stop offset="1" stop-color="${A}"/></linearGradient>
 <linearGradient id="${u}f" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".18" stop-color="#fff" stop-opacity=".07"/><stop offset=".36" stop-color="#000" stop-opacity=".18"/><stop offset=".55" stop-color="#fff" stop-opacity=".06"/><stop offset=".75" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
 <linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.m}"/><stop offset="1" stop-color="${T.pole}"/></linearGradient>
 <radialGradient id="${u}m"><stop offset="0" stop-color="${A}"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
 <clipPath id="${u}c"><path d="${sh}"/></clipPath>
 <filter id="${u}s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".6"/>${tier>=3?`<feDropShadow dx="0" dy="0" stdDeviation="${tier==3?3:6}" flood-color="${T.m}" flood-opacity="${tier==3?.25:.55}"/>`:''}</filter></defs>
 <g${sm?'':` filter="url(#${u}s)"`}>
 <g clip-path="url(#${u}c)"><rect x="0" y="0" width="120" height="180" fill="url(#${u}g)"/>${pats[g.pat]}<rect x="0" y="0" width="120" height="180" fill="url(#${u}f)"/></g>
 <path d="${sh}" fill="none" stroke="${T.m}" stroke-width="${tier>=2?3.2:2.4}"/>
 ${sm?'':`<path d="${sh}" fill="none" stroke="${T.m2}" stroke-width="1" stroke-dasharray="3 3" transform="translate(60 88) scale(.9) translate(-60 -88)" opacity=".9"/>`}
 <rect x="2" y="7" width="116" height="7" rx="3.5" fill="url(#${u}p)"/>${fin}
 <circle cx="60" cy="72" r="31" fill="url(#${u}m)" stroke="${T.m}" stroke-width="2.6"/>
 <circle cx="60" cy="72" r="27" fill="none" stroke="${T.m2}" stroke-width="1"/>
 <g transform="translate(39 51) scale(.42)">${symbol(g.sym,L,A)}</g>
 ${stars}${tass}</g></svg>`;
}
const CACHE=new Map();
window.penSvg=function(name,tier,w){name=String(name||'');if(!name)return '';tier=Math.max(0,Math.min(3,Number(tier)||0));const k=name+'|'+tier+'|'+w;let s=CACHE.get(k);if(!s){s=banner(name,tier,w).replace(/\n\s*/g,' ');if(CACHE.size>300)CACHE.clear();CACHE.set(k,s)}return s};
window.penSym=n=>gen(String(n||'')).sym;
})();
