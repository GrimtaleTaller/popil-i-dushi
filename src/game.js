(function(){
'use strict';
// ---------- налаштування ----------
const API='https://fatpfzstkjtfcunlwnvx.supabase.co/functions/v1/game';
const SYNC_MS=10000;
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const DEV=Q.get('dev')?{key:Q.get('dev'),user:{id:Number(Q.get('uid')||1),first_name:'Tester'}}:null;
const tg=()=>window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData?window.Telegram.WebApp:null;

function fmt(n){n=Math.floor(n);if(n<1000)return String(n);const u=['','K','M','B','T','Qa','Qi','Sx'];let i=0,x=n;while(x>=999.5&&i<u.length-1){x/=1000;i++}return(x<10?x.toFixed(2):x<100?x.toFixed(1):x.toFixed(0))+u[i]}
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
// ---------- мова ----------
const LANGS=['uk','en','ru'];
function detectLang(){
 try{const v=localStorage.getItem('gt_lang');if(LANGS.includes(v))return v}catch(e){}
 const w=window.Telegram&&window.Telegram.WebApp,u=w&&w.initDataUnsafe&&w.initDataUnsafe.user;
 const c=String((u&&u.language_code)||navigator.language||'').slice(0,2).toLowerCase();
 return c==='uk'?'uk':['ru','be','kk','uz','ky','tg','hy','az'].includes(c)?'ru':'en';
}
let LANG=detectLang(),L=I18N[LANG];
function T(k,o){let s=L.t[k]!=null?L.t[k]:(I18N.uk.t[k]!=null?I18N.uk.t[k]:k);if(o)s=s.replace(/\{(\w+)\}/g,(m,x)=>o[x]!=null?o[x]:m);return s}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- дані (лише для показу) ----------
const REGIONS=[
 {n:'Гнилий ліс',img:'bg1',mobs:[['Щур-трупоїд','rat'],['Сірий вовк','wolf'],['Отруйний павук','spider'],['Лісовий упир','ghoul']],boss:['Старий Гнилокорінь','boss1']},
 {n:'Склепи забутих',img:'bg2',mobs:[['Кажан-кровопивця','bat'],['Скелет-вартовий','skel'],['Блукаючий дух','ghost'],['Гробокоп','digger']],boss:['Король кісток','boss2']},
 {n:'Багряні болота',img:'bg3',mobs:[['Болотяна гадюка','viper'],['Скорпіон трясовини','scorp'],['Багнистий троль','troll'],['Відьма боліт','witch']],boss:['Мати Трясовини','boss3']},
 {n:'Попелясті шпилі',img:'bg4',mobs:[['Вогняний біс','imp'],['Кам’яний голем','golem'],['Вампір-лорд','vamp'],['Демон-мисливець','dhunt']],boss:['Попелястий дракон','boss4']},
 {n:'Крижаний перевал',img:'bg5',mobs:[['Йєті-людожер','yeti'],['Крижана гарпія','harpy'],['Замерзлий лицар','fknight'],['Морозний дух','frost']],boss:['Королева Інею','boss5']},
 {n:'Потоплене місто',img:'bg6',mobs:[['Утопленик','drowned'],['Сирена','siren'],['Краб-велетень','crab'],['Рибоголовий жрець','fishpr']],boss:['Левіафан Глибин','boss6']},
 {n:'Палац Кривих Дзеркал',img:'bg7',mobs:[['Порцелянова лялька','doll'],['Дзеркальний двійник','mirror'],['Скажений блазень','jester'],['Кам’яна горгулья','garg']],boss:['Королева Дзеркал','boss7']},
 {n:'Безодня Душ',img:'bg8',mobs:[['Пожирач душ','devour'],['Тіньовий лицар','sknight'],['Безликий','faceless'],['Вартовий Безодні','warden']],boss:['Володар Попелу','boss8']}
];
const IMG=k=>'assets/'+k+'.webp';
const ROMAN=['','II','III','IV','V','VI','VII','VIII','IX','X'];
const SLOTS=['weapon','helmet','armor','boots','ring','amulet'];
const SVG_SWORD='<svg class="svi" viewBox="0 0 32 32"><g transform="rotate(45 16 16) translate(16 16) scale(1.22) translate(-16 -16)"><path d="M13.6 19V5.5L16 1.8l2.4 3.7V19z" fill="#9aa4b0" stroke="#2b2f36" stroke-width="1.2" stroke-linejoin="round"/><path d="M16 2.5V19h-2.4V5.5z" fill="#c9d0d8"/><rect x="9" y="19" width="14" height="3.2" rx="1.3" fill="#b98a3e" stroke="#2b2f36" stroke-width="1.1"/><rect x="14.6" y="22.2" width="2.8" height="5.3" fill="#6b4a2a" stroke="#2b2f36" stroke-width="1"/><circle cx="16" cy="29" r="1.9" fill="#b98a3e" stroke="#2b2f36" stroke-width="1"/></g></svg>',SVG_BOOTS='<svg class="svi" viewBox="0 0 32 32"><path d="M9 3.5h10V18l7.5 3.6c1.6.8 2.5 2.2 2.5 3.9V28.5H5.5V22L9 19z" fill="#9aa4b0" stroke="#2b2f36" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.6 4.2H14V27.8H6.2V22.3l3.4-2.9z" fill="#c9d0d8"/><path d="M9 9h10M9 14h10M5.5 25h23.5" stroke="#2b2f36" stroke-width="1.2" opacity=".6" fill="none"/></svg>',SVG_RING='<svg class="svi" viewBox="0 0 32 32"><circle cx="16" cy="19" r="9" fill="none" stroke="#2b2f36" stroke-width="6"/><circle cx="16" cy="19" r="9" fill="none" stroke="#b98a3e" stroke-width="3.6"/><path d="M11.5 18.5a5 5 0 0 1 3-4" fill="none" stroke="#f0d08a" stroke-width="1.4" stroke-linecap="round"/><path d="M16 2.5l4.5 4.5L16 11.5 11.5 7z" fill="#d4475a" stroke="#2b2f36" stroke-width="1.3" stroke-linejoin="round"/><path d="M16 3.5v7L12.5 7z" fill="#f08a98"/></svg>',SVG_AMULET='<svg class="svi" viewBox="0 0 32 32"><path d="M6 3.5c0 7 4 12 10 13.5C22 15.5 26 10.5 26 3.5" fill="none" stroke="#2b2f36" stroke-width="3.4" stroke-linecap="round"/><path d="M6 3.5c0 7 4 12 10 13.5C22 15.5 26 10.5 26 3.5" fill="none" stroke="#b98a3e" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 1.6"/><circle cx="16" cy="22.5" r="7" fill="#b98a3e" stroke="#2b2f36" stroke-width="1.4"/><circle cx="16" cy="22.5" r="4" fill="#3f8f8a" stroke="#2b2f36" stroke-width="1.1"/><circle cx="14.6" cy="21.1" r="1.3" fill="#a8e0d8"/></svg>';
const SVG_HELM='<svg class="svi" viewBox="0 0 32 32"><path d="M16 2.5c-6.8 0-11 5-11 11.5V27c0 1.3 1 2.3 2.3 2.3h17.4c1.3 0 2.3-1 2.3-2.3V14C27 7.5 22.8 2.5 16 2.5z" fill="#9aa4b0" stroke="#2b2f36" stroke-width="1.4"/><path d="M16 3.2C10 3.2 6.3 7.6 6.3 13.5V27c0 .7.6 1.2 1.2 1.2H16z" fill="#c9d0d8"/><path d="M16 3v26" stroke="#2b2f36" stroke-width="1.2" opacity=".55"/><rect x="7.5" y="13" width="17" height="3" rx="1" fill="#16181d"/><path d="M14.6 16v8.5h2.8V16" fill="#16181d"/><g fill="#16181d"><circle cx="10.5" cy="21" r=".9"/><circle cx="10.5" cy="24" r=".9"/><circle cx="21.5" cy="21" r=".9"/><circle cx="21.5" cy="24" r=".9"/></g></svg>',SVG_ARM='<svg class="svi" viewBox="0 0 32 32"><path d="M9.5 3 4 5.5 2.5 12l3.5 1.5V27c0 1.3 1 2.3 2.3 2.3h15.4c1.3 0 2.3-1 2.3-2.3V13.5l3.5-1.5L28 5.5 22.5 3c-1 2.6-3.6 4.2-6.5 4.2S10.5 5.6 9.5 3z" fill="#9aa4b0" stroke="#2b2f36" stroke-width="1.4" stroke-linejoin="round"/><path d="M16 7.6c-2.7 0-5.1-1.3-6.3-3.6L5 6.1 3.9 11.4l3.4 1.4V27c0 .7.5 1.2 1.2 1.2H16z" fill="#c9d0d8"/><path d="M16 7.5V29M7 15c3 1.6 6 2.3 9 2.3s6-.7 9-2.3M7 21.5c3 1.4 6 2 9 2s6-.6 9-2" fill="none" stroke="#2b2f36" stroke-width="1.2" opacity=".6"/></svg>';
const SLOT={
 weapon:{n:'Зброя',ic:SVG_SWORD,names:['Іржавий меч','Кістяна сокира','Чорний клинок','Булава ката','Серп жнеця']},
 helmet:{n:'Шолом',ic:SVG_HELM,names:['Шолом вартового','Залізний капюшон','Рогатий шолом','Корона з кісток']},
 armor:{n:'Обладунок',ic:SVG_ARM,names:['Шкіряна куртка','Кольчуга','Латний нагрудник','Мантія попелу']},
 boots:{n:'Чоботи',ic:SVG_BOOTS,names:['Стоптані чоботи','Поножі мисливця','Сталеві чоботи','Чоботи тіні']},
 ring:{n:'Перстень',ic:SVG_RING,names:['Мідний перстень','Перстень крові','Перстень вовка','Печатка мертвих']},
 amulet:{n:'Амулет',ic:SVG_AMULET,names:['Амулет з ікла','Оберіг відьми','Око безодні','Серце попелу']}
};
const RAR=[{n:'Звичайний',c:'#a3abb5',m:1},{n:'Незвичайний',c:'#56c271',m:1.5},{n:'Рідкісний',c:'#4f93f2',m:2.2},{n:'Епічний',c:'#ad66f5',m:3.2},{n:'Легендарний',c:'#f2a33a',m:5},{n:'Міфічний',c:'#e8455a',m:7.5},{n:'Астральний',c:'#3fd0d4',m:11}];
const STATN={atk:'Атака',hp:'Здоров’я',def:'Захист',crit:'Крит'};
const UPG=[
 {k:'atk',n:'Сила удару',ic:'⚔️',d:'+атака',val:l=>3*l*Math.pow(1.06,l),cost:l=>15*Math.pow(1.15,l)},
 {k:'hp',n:'Витривалість',ic:'❤️',d:'+здоров’я',val:l=>15*l*Math.pow(1.06,l),cost:l=>15*Math.pow(1.15,l)},
 {k:'def',n:'Загартування',ic:'🛡️',d:'+захист',val:l=>1.2*l*Math.pow(1.06,l),cost:l=>25*Math.pow(1.16,l)},
 {k:'crit',n:'Холодний розрахунок',ic:'🎯',d:'+0,5% шанс криту (макс. 25%)',val:l=>0.5*Math.min(l,50),cost:l=>40*Math.pow(1.22,l),max:50}
];
const WAVES=10,BOSS_TIME=30,INV_MAX=40;
const mobHp=s=>25*Math.pow(1.25,s-1),mobAtk=s=>4*Math.pow(1.19,s-1),mobGold=s=>4*Math.pow(1.17,s-1),mobXp=s=>V&&V.xp?V.xp.mob:6*Math.pow(1.07,s-1);
const xpNeed=l=>V&&V.xp?V.xp.need:Math.floor(25*Math.pow(1.27,l-1)); // точні значення дає сервер
function region(s){const i=Math.floor((s-1)/10);return{r:REGIONS[i%REGIONS.length],tier:Math.floor(i/REGIONS.length)}}
const itemName=it=>SLOT[it.slot].names[Math.min(it.nm,SLOT[it.slot].names.length-1)];
const sellPrice=it=>Math.max(1,Math.round(mobGold(it.il)*2*Math.pow(RAR[it.r].m,1.5)));

// ---------- стан ----------
let G=null,H=null,V=null;     // стан із сервера, характеристики героя, решта view
let pend={gold:0,xp:0,kills:0}; // візуальні нарахування між синхронізаціями (лише показ)
let busy=false;

// ---------- мережа ----------
async function api(action,args){
 const body={action,args:args||{}};const headers={'content-type':'application/json'};
 const w=tg();if(w)body.initData=w.initData;else if(DEV){body.dev=DEV.user;headers['x-dev-key']=DEV.key}
 let r;try{r=await fetch(API,{method:'POST',headers,body:JSON.stringify(body)})}catch(e){throw new Error('net')}
 const j=await r.json().catch(()=>({ok:false,err:'bad'}));
 if(!j.ok)throw new Error(j.err||'err');
 apply(j.view);
 return j;
}
function apply(v){
 V=v;G=v.s;H=v.hero;pend={gold:0,xp:0,kills:0};
 Object.keys(dirty).forEach(k=>dirty[k]=1);renderBoss();paintArena();petFighter();
}
const ERR={dng_locked:'Цей данж ще закритий',bag_full:'Сумка повна',no_chests:'Скринь немає',not_mythic:'Потрібен міфічний предмет',no_essence:'Потрібна Астральна есенція (з глибоких данжів)',no_shards:'Не вистачає уламків',no_legendary:'Потрібна легендарка в сумці',no_catalyst:'Потрібен каталізатор (падає з босів)',no_souls:'Не вистачає Душ',no_junk:'Нема непотрібних речей',not_legendary:'Потрібні лише легендарки',mixed_slots:'Легендарки мають бути одного слота',no_item:'Предмет не знайдено',no_gold:'Не вистачає золота',max:'Максимальний рівень',boss_locked:'Спершу переможи 10 ворогів',daily_taken:'Нагороду вже забрано',net:'Немає зв’язку з сервером',auth:'Відкрий гру через Telegram',server:'Помилка сервера, спробуй ще раз',busy:'Сервер зайнятий, спробуй ще раз'};
const errT=e=>ERR[e.message]||T('err',{e:e.message});

// ---------- бій (лише анімація) ----------
const B={hp:0,m:null,ht:0,mt:0,boss:false,bt:0,dead:0,resp:0,rep:null};
function spawn(){
 const s=G.stage,{r,tier}=region(s);
 const m=pick(r.mobs);
 B.m={n:m[0]+(tier?' '+ROMAN[tier]:''),sp:m[1],hp:mobHp(s)*rnd(0.9,1.1),max:0,atk:mobAtk(s),gold:mobGold(s),xp:mobXp(s),boss:false};
 B.m.max=B.m.hp;B.mt=0.6;B.ht=0;showMob();
}
function showMob(){
 const ms=$('ms');ms.className='sprite'+(B.m.boss?' big':'');ms.innerHTML=`<img alt="" src="${IMG(B.m.sp)}">`;void ms.offsetWidth;ms.classList.add('appear');setTimeout(()=>ms.classList.remove('appear'),360);
 $('mn').textContent=(B.m.boss?'👑 ':'')+B.m.n;
}
function paintArena(){
 if(!G)return;const st=B.rep?B.rep.res.stage:G.stage,{r,tier}=region(st);
 $('arena').style.backgroundImage=`url(${IMG(r.img)})`;
 $('stg').textContent=T('stage',{n:st});$('reg').textContent=r.n+(tier?' '+ROMAN[tier]:'');
 $('prev').disabled=G.stage<=1||busy;$('next').disabled=G.stage>=G.maxStage||busy;
}
function floatNum(txt,cls,side){
 const a=$('arena'),e=document.createElement('div');e.className='dmg '+cls;e.textContent=txt;
 e.style.left=(side==='m'?62+Math.random()*18:12+Math.random()*18)+'%';e.style.top=(95+Math.random()*30)+'px';
 a.appendChild(e);setTimeout(()=>e.remove(),800);
}
function anim(id,c){const e=$(id);e.classList.remove(c);void e.offsetWidth;e.classList.add(c);setTimeout(()=>e.classList.remove(c),c==='hit'?250:130)}
function haptic(t){const w=tg();try{w&&w.HapticFeedback&&(t==='heavy'?w.HapticFeedback.notificationOccurred('success'):w.HapticFeedback.impactOccurred(t))}catch(e){}}
function deathFx(){const ms=$('ms');ms.classList.remove('hit','lunge-l');ms.classList.add('die');$('mhp').style.width='0%';
 const a=$('arena');for(let i=0;i<14;i++){const e=document.createElement('div');e.className='ember';e.style.background=Math.random()<.5?'#f2a33a':'#a07bd0';e.style.left=(62+Math.random()*26)+'%';e.style.top=(120+Math.random()*90)+'px';e.style.setProperty('--dx',(Math.random()*40-20)+'px');e.style.animationDelay=(Math.random()*.2)+'s';a.appendChild(e);setTimeout(()=>e.remove(),1200)}}

function tick(dt){
 if(!G)return;
 if(B.rep){replayTick(dt);return}
 if(B.hp>H.hp)B.hp=H.hp;
 if(B.dead>0){B.dead-=dt;if(B.dead<=0){$('dead').style.display='none';B.hp=H.hp;spawn()}return}
 if(B.resp>0){B.hp=Math.min(H.hp,B.hp+H.hp*0.02*dt);B.resp-=dt;if(B.resp<=0)spawn();return}
 if(!B.m)spawn();
 B.hp=Math.min(H.hp,B.hp+H.hp*0.02*dt);
 B.ht+=dt;
 if(B.ht>=1){B.ht-=1;
  const cr=Math.random()*100<H.crit,d=H.atk*rnd(0.92,1.08)*(cr?2:1);B.m.hp-=d;
  anim('hs','lunge-r');anim('ms','hit');floatNum(fmt(d)+(cr?'!':''),cr?'crit':'','m');
  if(B.m.hp<=0){killFx();return}
 }
 B.mt+=dt;
 if(B.mt>=1.4){B.mt-=1.4;
  const d=Math.max(B.m.atk*0.2,B.m.atk-H.def)*rnd(0.9,1.1);B.hp-=d;anim('ms','lunge-l');anim('hs','hit');floatNum('-'+fmt(d),'taken','h');
  if(B.hp<=0){B.dead=2.5;$('dead').style.display='grid';haptic('medium')}
 }
}
function killFx(){
 // нагороду дає сервер; тут лише показ
 if(V.canFarm){pend.gold+=B.m.gold;pend.xp+=B.m.xp;pend.kills++}
 B.hp=Math.min(H.hp,B.hp+H.hp*0.15);B.m=null;deathFx();B.resp=0.45;renderBoss();
}

// ---------- бос: відтворення бою, порахованого сервером ----------
function startReplay(res,after){
 const {r,tier}=region(res.stage);
 B.m={n:r.boss[0]+(tier?' '+ROMAN[tier]:''),sp:r.boss[1],hp:res.bossHp,max:res.bossHp,boss:true};
 B.hp=res.hp;B.rep={res,i:0,t:0,after,maxHp:res.hp};B.boss=true;B.dead=0;B.resp=0;$('dead').style.display='none';
 showMob();renderBoss();paintArena();
}
function replayTick(dt){
 const R=B.rep;R.t+=dt;
 while(R.i<R.res.ev.length&&R.res.ev[R.i][0]<=R.t){
  const [,who,d,cr]=R.res.ev[R.i++];
  if(who===0){B.m.hp-=d;anim('hs','lunge-r');anim('ms','hit');floatNum(fmt(d)+(cr?'!':''),cr?'crit':'','m');B.hp=Math.min(R.maxHp,B.hp+R.maxHp*0.02)}
  else{B.hp-=d;anim('ms','lunge-l');anim('hs','hit');floatNum('-'+fmt(d),'taken','h')}
 }
 if(R.i>=R.res.ev.length&&R.t>=(R.res.ev.length?R.res.ev[R.res.ev.length-1][0]:0)+0.4){
  const res=R.res;B.rep=null;B.boss=false;
  if(res.win){deathFx();haptic('heavy');toast(T('boss_win')+' +💰'+fmt(res.gold)+(res.souls?' +🔥'+res.souls:'')+(res.cat?' +💎':'')+(res.ash?' +⚱️'+res.ash:'')+(res.gems?' '+res.gems.map(k=>gemIc(k)).join(''):'')+(res.egg?' +'+eggIc(res.egg):''));B.m=null;B.resp=0.8}
  else{B.dead=2.5;$('dead').style.display='grid';toast(T(res.timeout?'boss_timeout':'boss_lose')+(res.auto?' '+T('auto_off'):''));B.m=null}
  R.after&&R.after();renderBoss();paintArena();
 }
}

// ---------- UI ----------
const dirty={pet:1,hero:1,bag:1,forge:1,dng:1,train:1,log:1,arena:1,top:1,prof:1,clan:1,market:1};
let tab='hero';
let tt;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),1800)}
const power=h=>h.power;
// ---------- камені: a Рубін (атака), h Сапфір (здоров'я), d Аметист (захист), c Смарагд (крит) ----------
const GEMC={a:'#e0475a',h:'#3f86e8',d:'#a15be0',c:'#2fb36b'},GEMS=['a','h','d','c'],ROM=['I','II','III','IV','V'];
const gemP=k=>({t:k[0],l:+k[1]}),gemCfg=()=>V.gem||{sockets:[0,0,0,1,2,3,3],out:[2,5,12,25,50],m:[0.5,1.2,2.5,5,9],crit:[0.5,1,2,3.5,5],max:5,pts:40};
function gemStat(k,il){const g=gemP(k),C=gemCfg(),v=Math.pow(1.16,il-1)*C.m[g.l-1],o={};if(g.t==='a')o.atk=3*v;else if(g.t==='h')o.hp=14*v;else if(g.t==='d')o.def=2*v;else o.crit=C.crit[g.l-1];return o}
function gemSum(it){const o={atk:0,hp:0,def:0,crit:0};for(const k of it.gm||[]){const s=gemStat(k,it.il);for(const x in s)o[x]+=s[x]}return o}
const gemIc=(k,big)=>{const g=gemP(k);return `<span class="gem${big?' big':''}" style="--gc:${GEMC[g.t]}">◆<i>${ROM[g.l-1]}</i></span>`};
const gemName=k=>{const g=gemP(k);return T('gem_'+g.t)+' '+ROM[g.l-1]};
const gemTxt=(k,il)=>{const s=gemStat(k,il),x=Object.keys(s)[0];return '+'+(x==='crit'?s[x].toFixed(1)+'%':fmt(s[x]))+' '+STATN[x]};
const sockN=it=>gemCfg().sockets[it.r]||0;
function sockView(it){const n=sockN(it);if(!n)return '';const gm=it.gm||[];let h='';for(let i=0;i<n;i++)h+=gm[i]?gemIc(gm[i]):'<span class="gem empty">◇</span>';return `<span class="socks">${h}</span>`}
function itemScore(it){const g=gemSum(it);return((it.st.atk||0)+g.atk)*2+((it.st.hp||0)+g.hp)*0.25+((it.st.def||0)+g.def)*1.5+((it.st.crit||0)+g.crit)*0.03*H.atk}
function renderTop(){
 if(!G)return;
 const gold=G.gold+pend.gold;let xp=G.xp+pend.xp;
 $('lvl').textContent=G.lvl;$('gold').textContent=fmt(gold);$('souls').textContent=fmt(G.souls||0);$('ashv').textContent=fmt(G.ash||0);$('pw').textContent=T('power',{n:fmt(power(H))});
 $('xpt').textContent=fmt(xp)+'/'+fmt(xpNeed(G.lvl));$('xpb').style.width=Math.min(100,xp/xpNeed(G.lvl)*100)+'%';
 const mhp=B.rep?B.rep.maxHp:H.hp;
 $('hhp').style.width=Math.max(0,B.hp/mhp*100)+'%';$('hhpt').textContent=fmt(Math.max(0,B.hp))+' / '+fmt(mhp);
 if(B.m){$('mhp').style.width=Math.max(0,B.m.hp/B.m.max*100)+'%';$('mhpt').textContent=fmt(Math.max(0,B.m.hp))+' / '+fmt(B.m.max)}
 $('timer').style.display=B.rep?'block':'none';if(B.rep)$('timeri').style.width=Math.max(0,(BOSS_TIME-B.rep.t)/BOSS_TIME*100)+'%';
 const nw=G.inv.filter(i=>i.nw).length,nb=$('newb');nb.style.display=nw?'inline':'none';nb.textContent=nw;
 if(tab==='train')renderTrainBtns();
}
// поки сервер не підтвердив 10 перемог, показуємо не більше 9
const waveKills=()=>G.stage===G.maxStage?(G.kills>=WAVES?WAVES:Math.min(WAVES-1,G.kills+pend.kills)):0;
function renderBoss(){
 if(!G)return;const b=$('bossBtn'),atTop=G.stage===G.maxStage,k=waveKills();
 if(B.rep){b.textContent=T('boss_fight');b.disabled=true;b.classList.remove('ready')}
 else if(!atTop){b.textContent=T('stage_done');b.disabled=true;b.classList.remove('ready')}
 else if(G.kills>=WAVES){b.textContent=T('call_boss');b.disabled=busy;b.classList.add('ready')}
 else if(!V.canFarm){b.textContent=T('too_hard');b.disabled=true;b.classList.remove('ready')}
 else{b.textContent=T('boss_prog',{k,n:WAVES});b.disabled=true;b.classList.remove('ready')}
 const a=$('autoBtn');a.textContent=T('auto_boss',{s:T(G.autoBoss?'on':'off')});a.classList.toggle('on',G.autoBoss);
}
function statLine(st,cmp){
 return Object.keys(STATN).filter(k=>st[k]||(cmp&&cmp[k])).map(k=>{
  const v=st[k]||0,o=cmp?(cmp[k]||0):null,f=k==='crit'?v.toFixed(1)+'%':fmt(v);
  let dlt='';if(cmp){const df=v-o;if(Math.abs(df)>0.001)dlt=` <span class="${df>0?'up':'dn'}">${df>0?'▲':'▼'}${k==='crit'?Math.abs(df).toFixed(1):fmt(Math.abs(df))}</span>`}
  return `${STATN[k]} ${f}${dlt}`}).join(' · ')
}
const BOT='Grimtalebot';
function myId(){const w=tg();return w&&w.initDataUnsafe&&w.initDataUnsafe.user?w.initDataUnsafe.user.id:(DEV?DEV.user.id:0)}
function inviteLink(){return 'https://t.me/'+BOT+'?startapp=ref_'+myId()}
function invite(){
 const link=inviteLink(),text=T('invite_text');
 const w=tg();
 if(w&&w.openTelegramLink){w.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(text));return}
 try{navigator.clipboard.writeText(link);toast(T('link_copied'))}catch(e){toast(link)}
}
function renderHero(){
 let h=`<div class="row" style="margin:0 0 10px"><button class="btn pri" id="bestBtn">${T('equip_best')}</button><button class="btn" id="invBtn">${T('invite')}</button></div><div class="slots">`;
 for(const s of SLOTS){const it=G.eq[s];
  h+=`<div class="slot" ${it?`style="border-color:${RAR[it.r].c}66"`:''}><div class="ic">${SLOT[s].ic}</div><div class="sn">${SLOT[s].n}</div>`+
   (it?`<div class="it" style="color:${RAR[it.r].c}">${itemName(it)}</div><div class="sn">${T('lvl',{n:it.il})} ${sockView(it)}</div>`:`<div class="sn" style="margin-top:6px">${T('empty_slot')}</div>`)+'</div>'}
 h+=`</div><div class="stats">
  <div><span>${STATN.atk}</span><b>${fmt(H.atk)}</b></div><div><span>${STATN.hp}</span><b>${fmt(H.hp)}</b></div>
  <div><span>${STATN.def}</span><b>${fmt(H.def)}</b></div><div><span>${T('crit_chance')}</span><b>${H.crit.toFixed(1)}%</b></div>
  <div><span>${T('max_stage')}</span><b>${G.maxStage}</b></div><div><span>${T('kills')}</span><b>${fmt(G.tot.kills)}</b></div>
  <div><span>${T('bosses')}</span><b>${G.tot.bosses}</b></div><div><span>${T('deaths')}</span><b>${G.tot.deaths}</b></div>
  <div><span>${T('ench')}</span><b>+${Math.round((G.ench||0)*V.forge.enchStep*100)}%</b></div><div><span>${T('souls_h')}</span><b>${fmt(V.forge.soulsPerHour)}</b></div>
  <div><span>${T('act_days')}</span><b>${V.payout?V.payout.myDays:'—'}</b></div></div>
  <p class="hint">${T('hero_hint')}</p>
  <div class="card"><h4>🌐 ${T('lang')}</h4><div class="chips">${LANGS.map(l=>`<button data-lang="${l}" class="${l===LANG?'act':''}">${{uk:'Українська',en:'English',ru:'Русский'}[l]}</button>`).join('')}</div></div>`;
 $('p-hero').innerHTML=h;$('invBtn').onclick=invite;$('bestBtn').onclick=()=>act('equipBest',{},r=>toast(r.out.n?T('equipped_n',{n:r.out.n}):T('all_best')));
 $('p-hero').querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
}
let bagFilter='all';
function chestIc(g){const c=RAR[g||1].c;return `<svg class="svi" viewBox="0 0 32 32"><path d="M4 13.5C4 8 8 5 16 5s12 3 12 8.5z" fill="#8a5a2b" stroke="#2b2f36" stroke-width="1.4" stroke-linejoin="round"/><rect x="4" y="13.5" width="24" height="14" rx="1.5" fill="#6e4521" stroke="#2b2f36" stroke-width="1.4"/><path d="M4 13.5h24M9 5.9v21.6M23 5.9v21.6" stroke="${c}" stroke-width="2.4" fill="none"/><rect x="13.5" y="11.5" width="5" height="6" rx="1" fill="${c}" stroke="#2b2f36" stroke-width="1.1"/></svg>`}
function chestGroups(){const r={1:0,2:0,3:0};for(const[k,n]of Object.entries(G.chests||{})){const g=Math.max(1,Math.min(3,Number(k.split(':')[1])||1));r[g]+=n}return r}
function chestCount(){return Object.values(G.chests||{}).reduce((a,b)=>a+b,0)}
function renderBag(){
 const cc=chestCount(),vlt=(G.vault||[]).length,ov=G.ovf||{v:0,d:0,sh:0};
 let h=(ov.v||ov.d?`<div class="card ovf"><b>⚠️ ${T('bag_full_title')}</b><p class="hint">${T('ovf_txt',{v:ov.v,d:ov.d,s:fmt(ov.sh),p:Math.round((V.inv&&V.inv.rate||0.5)*100)})}</p><div class="row"><button class="btn" id="ovfOk">${T('ok')}</button></div></div>`:'')
 +(vlt?`<div class="chestbar vault">📦<span>${T('vault',{n:vlt,m:V.inv&&V.inv.vaultMax||100})}</span><button class="btn pri" id="vTake">${T('take')}</button></div>`:'')
 +(cc?`<div class="chestbar"><span>${(()=>{const cg=chestGroups();return [3,2,1].filter(g=>cg[g]).map(g=>`<span class="chg" style="color:${RAR[g].c}">${chestIc(g)} ${T('chest_'+g)} ×${cg[g]}</span>`).join('')})()}</span><button class="btn pri" id="openC">${T('open')}</button></div>`:'')+`<div class="filter">${['all',...SLOTS].map(f=>`<button data-f="${f}" class="${bagFilter===f?'act':''}">${f==='all'?T('all'):SLOT[f].ic+' '+SLOT[f].n}</button>`).join('')}</div>
 <div class="row" style="margin-top:0;margin-bottom:10px"><button class="btn" id="sellC">${T('sell_common')}</button><button class="btn" id="sellW">${T('sell_worse')}</button><button class="btn ${G.autoSell?'pri':''}" id="autoS">${T('autosell',{s:T(G.autoSell?'yes':'no')})}</button></div>
 <div class="row" style="margin:0 0 6px;align-items:center"><span class="hint" style="flex:2;margin:0">${T('items_n',{n:G.inv.length,m:V.inv?V.inv.max:INV_MAX})}</span>${V.inv&&V.inv.cost!=null?`<button class="btn" id="bagUp" ${G.souls>=V.inv.cost?'':'disabled'}>🎒 +${V.inv.step} · 🔥${fmt(V.inv.cost)}</button>`:''}</div>`;
 const list=G.inv.filter(i=>bagFilter==='all'||i.slot===bagFilter);
 if(!list.length)h+=`<div class="empty">${T('bag_empty')}</div>`;
 for(const it of list){const eq=G.eq[it.slot],better=!eq||itemScore(it)>itemScore(eq);
  h+=`<div class="item" style="border-left-color:${RAR[it.r].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info">
   <div class="nm" style="color:${RAR[it.r].c}">${it.nw?'🆕 ':''}${itemName(it)}</div><div class="sub">${RAR[it.r].n} · ${SLOT[it.slot].n} · ${T('lvl',{n:it.il})} ${sockView(it)}${better?` · <span class="up">${T('better')}</span>`:''}</div>
   <div class="st">${statLine(it.st,eq?eq.st:{})}</div>${it.gm&&it.gm.length?`<div class="st">${it.gm.map(k=>gemIc(k)+' '+gemTxt(k,it.il)).join(' · ')}</div>`:''}</div>
   <div class="acts"><button class="btn pri" data-eq="${it.id}">${T('equip')}</button>${it.gm&&it.gm.length?`<button class="btn" data-gsock="${it.id}">◆ ${T('gem_socks')}</button>`:`<button class="btn" data-sell="${it.id}">💰${fmt(sellPrice(it))}</button>`}${it.r<4&&!(it.gm&&it.gm.length)?`<button class="btn" data-dis="${it.id}">⚒️ ${T('btn_dis')} ${G.dismode==='xp'?'✨':'🔩'}</button>`:''}${it.r>=2?`<button class="btn" data-mk="${it.id}">⚱️ ${T('btn_mkt')}</button>`:''}</div></div>`}
 $('p-bag').innerHTML=h;
 if($('ovfOk'))$('ovfOk').onclick=()=>act('ovfSeen',{});
 if($('vTake'))$('vTake').onclick=()=>act('vault',{},r=>toast(T('vault_took',{n:r.out.n})));
 if($('bagUp'))$('bagUp').onclick=()=>act('bag',{},r=>{toast(T('bag_up',{n:r.out.max}));haptic('light')});
 if(cc)$('openC').onclick=()=>act('openChests',{},r=>{toast(T('opened',{n:r.out.n})+(r.out.best>=3?' · '+RAR[r.out.best].n+'!':''));if(r.out.best>=3)haptic('heavy')});
 if(G.inv.some(i=>i.nw)){G.inv.forEach(i=>delete i.nw);api('seen').catch(()=>{})}
 $('p-bag').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{bagFilter=b.dataset.f;renderBag()});
 $('p-bag').querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>act('equip',{id:+b.dataset.eq},()=>haptic('light')));
 $('p-bag').querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>sell([+b.dataset.sell]));
 $('p-bag').querySelectorAll('[data-dis]').forEach(b=>b.onclick=()=>dismantle([+b.dataset.dis]));
 $('p-bag').querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>marketSellDlg(+b.dataset.mk));
 $('p-bag').querySelectorAll('[data-gsock]').forEach(b=>b.onclick=()=>{fsub='gem';gemSel=+b.dataset.gsock;document.querySelector('.tabs button[data-t="forge"]').click()});
 $('sellC').onclick=()=>sell(G.inv.filter(i=>i.r===0).map(i=>i.id));
 $('sellW').onclick=()=>sell(G.inv.filter(i=>!(i.gm&&i.gm.length)&&G.eq[i.slot]&&itemScore(i)<=itemScore(G.eq[i.slot])).map(i=>i.id));
 $('autoS').onclick=()=>act('settings',{autoSell:!G.autoSell});
}
// ---------- ринок: за Попіл або Золото, речі й матеріали ----------
let mktData=null,mktBusy=false,mktMat=0,mktCur='ash';const mktF={slot:'',r:0,sort:'price',cur:''};
const curIc=c=>c==='gold'?'💰':'⚱️',curHave=c=>c==='gold'?G.gold:(G.ash||0);
function mktLoad(){if(mktBusy)return;mktBusy=true;act('market',{...mktF},r=>{mktData=r.out;const g=r.out.got;if(g&&g.n){const x=[g.ash?'⚱️'+fmt(g.ash):'',g.gold?'💰'+fmt(g.gold):''].filter(Boolean).join(' + ');modal(`<div class="big">⚱️</div><h3>${T('mkt_sold_t')}</h3><p>${T('mkt_sold',{n:g.n,x,p:Math.round(r.out.fee*100)})}</p>`,T('ok'))}dirty.market=1}).finally(()=>{mktBusy=false;if(!mktData)setTimeout(()=>{dirty.market=1;flush()},800)})}
function mktAct(a,args,cb){act(a,{...mktF,...args},r=>{if(r.out)mktData=r.out;dirty.market=1;cb&&cb(r)})}
function curChips(id,sel,lockAsh){return `<div class="chips" id="${id}">${['ash','gold'].map(c=>`<button data-cur="${c}" class="${sel===c?'act':''}" ${lockAsh&&c==='gold'?'disabled':''}>${T('cur_'+c)}</button>`).join('')}</div>`}
function bindCur(id,set){const w=$(id);if(!w)return;w.querySelectorAll('[data-cur]').forEach(b=>b.onclick=()=>{if(b.disabled)return;set(b.dataset.cur);w.querySelectorAll('[data-cur]').forEach(x=>x.classList.toggle('act',x===b))})}
function marketSellDlg(id){const it=G.inv.find(i=>i.id===id);if(!it)return;const lock=it.r>=((mktData&&mktData.ashOnlyR)||4);let cur='ash';
 modal(`<div class="big">⚱️</div><h3 style="color:${RAR[it.r].c}">${itemName(it)}</h3><p class="hint">${T('mkt_sell_hint',{p:10})}</p>${it.gm&&it.gm.length?`<p class="hint">${sockView(it)} ${T('gem_mkt_warn')}</p>`:''}${curChips('mCur','ash',lock)}${lock?`<p class="hint">${T('mkt_ash_only')}</p>`:''}<input id="mPrice" class="inp" type="number" min="1" inputmode="numeric" placeholder="${T('mkt_price')}" style="width:100%"><div class="row"><button class="btn" id="mNo">${T('cancel')}</button></div>`,T('mkt_put'),()=>{const p=Math.floor(+$('mPrice').value||0);if(p<1){toast(T('mkt_price_bad'));return}mktAct('marketSell',{id,price:p,cur},()=>toast(T('mkt_listed')))});
 setTimeout(()=>{bindCur('mCur',c=>cur=c);const n=$('mNo');if(n)n.onclick=()=>{queue.shift();showModal()};const i=$('mPrice');if(i)i.focus()},0)}
function lotView(l){const it=l.item||{};
 if(it.kind==='mat')return {c:'#8a7a5a',ic:'⛏️',nm:T('mat_w')+' '+MATN[it.m]+' ×'+fmt(it.n),sub:'',st:''};
 if(!SLOT[it.slot])return null;const eq=G.eq[it.slot];
 return {c:RAR[it.r].c,ic:SLOT[it.slot].ic,nm:`<span style="color:${RAR[it.r].c}">${itemName(it)}</span>`,sub:RAR[it.r].n+' · '+T('lvl',{n:it.il}),st:statLine(it.st,eq?eq.st:{})}}
function renderMarket(){
 const el=$('p-market');
 if(!mktData){el.innerHTML=`<div class="empty">${T('loading')}</div>`;mktLoad();return}
 const M=mktData;
 let h=`<div class="chestbar" style="background:var(--panel);border-color:var(--line)">⚱️<span>${fmt(G.ash||0)} · 💰${fmt(G.gold)}</span><button class="btn" id="mRef">🔄</button></div><p class="hint">${T('mkt_hint',{p:Math.round(M.fee*100),r:RAR[M.minR].n})}</p>`;
 if(M.mine.length)h+=`<div class="card"><h4>📦 ${T('mkt_mine',{n:M.mine.length,m:M.maxLots})}</h4>`+M.mine.map(l=>{const v=lotView(l);if(!v)return '';return `<div class="item" style="border-left-color:${v.c}"><div class="ic">${v.ic}</div><div class="info"><div class="nm">${v.nm}</div><div class="sub">${v.sub?v.sub+' · ':''}${curIc(l.cur)} ${fmt(l.price)}</div></div><div class="acts"><button class="btn" data-mc="${l.id}">${T('mkt_cancel')}</button></div></div>`}).join('')+'</div>';
 const have=(G.mats||[])[mktMat]||0;
 h+=`<div class="card"><h4>⛏️ ${T('mkt_sell_mats')}</h4><div class="chips">${[0,1,2,3].map(m=>`<button data-mm="${m}" class="${mktMat===m?'act':''}">${MATN[m]} · ${fmt((G.mats||[])[m]||0)}</button>`).join('')}</div>${curChips('mmCur',mktCur,false)}
  <div class="row" style="align-items:center"><input id="mmQty" class="inp" type="number" min="1" inputmode="numeric" placeholder="${T('mkt_qty')} (${fmt(have)})"><input id="mmPrice" class="inp" type="number" min="1" inputmode="numeric" placeholder="${T('mkt_price')}"><button class="btn pri" id="mmGo" ${have?'':'disabled'}>${T('mkt_put')}</button></div></div>`;
 h+=`<div class="filter">${['',...SLOTS,'mat'].map(f=>`<button data-ms="${f}" class="${mktF.slot===f?'act':''}">${f==='mat'?T('mkt_mats'):f?SLOT[f].ic+' '+SLOT[f].n:T('all')}</button>`).join('')}</div>
 ${mktF.slot==='mat'?'':`<div class="chips">${[0,2,3,4,5,6].map(r=>`<button data-mr="${r}" class="${mktF.r===r?'act':''}" ${r?`style="color:${RAR[r].c}"`:''}>${r?RAR[r].n:T('all')}</button>`).join('')}</div>`}
 <div class="chips">${['','ash','gold'].map(c=>`<button data-mf="${c}" class="${mktF.cur===c?'act':''}">${c?T('cur_'+c):T('all')}</button>`).join('')}${['price','lvl','new'].map(k=>`<button data-mo="${k}" class="${mktF.sort===k?'act':''}">${T('mkt_sort_'+k)}</button>`).join('')}</div>`;
 let n=0;
 for(const l of M.lots){const v=lotView(l);if(!v)continue;n++;
  h+=`<div class="item" style="border-left-color:${v.c}"><div class="ic">${v.ic}</div><div class="info"><div class="nm">${v.nm}</div><div class="sub">${v.sub?v.sub+' · ':''}${esc(l.seller||'')}</div>${v.st?`<div class="st">${v.st}</div>`:''}</div><div class="acts"><button class="btn pri" data-mb="${l.id}" ${curHave(l.cur)>=l.price?'':'disabled'}>${curIc(l.cur)} ${fmt(l.price)}</button></div></div>`}
 if(!n)h+=`<div class="empty">${T('mkt_empty')}</div>`;
 el.innerHTML=h;
 $('mRef').onclick=()=>{mktData=null;renderMarket()};
 el.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{mktF.slot=b.dataset.ms;mktData=null;renderMarket()});
 el.querySelectorAll('[data-mr]').forEach(b=>b.onclick=()=>{mktF.r=+b.dataset.mr;mktData=null;renderMarket()});
 el.querySelectorAll('[data-mf]').forEach(b=>b.onclick=()=>{mktF.cur=b.dataset.mf;mktData=null;renderMarket()});
 el.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{mktF.sort=b.dataset.mo;mktData=null;renderMarket()});
 el.querySelectorAll('[data-mm]').forEach(b=>b.onclick=()=>{mktMat=+b.dataset.mm;renderMarket()});
 bindCur('mmCur',c=>mktCur=c);
 $('mmGo').onclick=()=>{const q=Math.floor(+$('mmQty').value||0),p=Math.floor(+$('mmPrice').value||0);if(q<1||q>((G.mats||[])[mktMat]||0)){toast(ERR.no_mats);return}if(p<1){toast(T('mkt_price_bad'));return}mktAct('marketSell',{kind:'mat',m:mktMat,n:q,price:p,cur:mktCur},()=>toast(T('mkt_listed')))};
 el.querySelectorAll('[data-mb]').forEach(b=>b.onclick=()=>mktAct('marketBuy',{lot:+b.dataset.mb},r=>{toast(T('mkt_bought'));haptic('medium')}));
 el.querySelectorAll('[data-mc]').forEach(b=>b.onclick=()=>mktAct('marketCancel',{lot:+b.dataset.mc},()=>toast(T('mkt_cancelled'))));
}
function disMsg(o){return T('dismantled',{n:o.n})+(o.shards?' · +🔩'+fmt(o.shards):'')+(o.xp?' · +✨'+fmt(o.xp):'')}
function dismantle(ids){act('dismantle',{ids,mode:G.dismode},r=>toast(disMsg(r.out)))}
function sell(ids){if(!ids.length){toast(T('nothing_sell'));return}act('sell',{ids},r=>toast(T('sold',{g:fmt(r.out.gold)})))}
let mSlot=null,mN=3,fsub='res',gemSel=null;
function gemPane(){const C=gemCfg(),GM=G.gems||{};
 const all=[...SLOTS.map(s=>G.eq[s]).filter(Boolean),...G.inv.filter(i=>sockN(i))].filter(i=>sockN(i));
 if(gemSel&&!all.some(i=>i.id===gemSel))gemSel=null;
 let h=`<div class="card"><h4>◆ ${T('gem_title')}</h4><p class="hint">${T('gem_hint',{p:C.pts})}</p><div class="gemg">`+GEMS.map(t=>`<div class="gemrow"><span class="gname" style="color:${GEMC[t]}">${T('gem_'+t)}</span>`+[1,2,3,4,5].map(l=>{const k=t+l,n=GM[k]||0;return `<div class="gcell ${n?'':'dim'}">${gemIc(k)}<b>${n}</b>${l<C.max&&n>=3?`<button class="btn mini" data-gm="${k}">⬆${Math.floor(n/3)}</button>`:''}</div>`}).join('')+'</div>').join('')+`</div><p class="hint">${T('gem_merge_hint')}</p></div>`;
 h+=`<div class="card"><h4>${T('gem_items')}</h4><p class="hint">${T('gem_items_hint',{o:C.out.join(' / ')})}</p>`;
 if(!all.length)h+=`<p class="hint">${T('gem_no_items')}</p>`;
 for(const it of all){const eqd=SLOTS.some(s=>G.eq[s]&&G.eq[s].id===it.id),n=sockN(it),gm=it.gm||[];
  h+=`<div class="item" style="border-left-color:${RAR[it.r].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info"><div class="nm" style="color:${RAR[it.r].c}">${itemName(it)}</div><div class="sub">${RAR[it.r].n} · ${T('lvl',{n:it.il})}${eqd?' · '+T('equipped'):''}</div><div class="socrow">`+
   Array.from({length:n},(_,i)=>gm[i]?`<button class="sock full" data-gr="${it.id}:${i}">${gemIc(gm[i],1)}<small>${gemTxt(gm[i],it.il)}</small><small class="out">✕ ⚱️${C.out[gemP(gm[i]).l-1]}</small></button>`:`<button class="sock" data-gi="${it.id}">◇<small>${T('gem_put')}</small></button>`).join('')+'</div></div></div>'}
 return h+'</div>'}
function gemPick(id){const it=[...SLOTS.map(s=>G.eq[s]),...G.inv].find(i=>i&&i.id===id);if(!it)return;const GM=G.gems||{};
 const ks=Object.keys(GM).filter(k=>GM[k]>0).sort((a,b)=>b[1]-a[1]||GEMS.indexOf(a[0])-GEMS.indexOf(b[0]));
 modal(`<div class="big">◆</div><h3 style="color:${RAR[it.r].c}">${itemName(it)}</h3>`+(ks.length?`<div class="gpick">${ks.map(k=>`<button class="btn" data-pk="${k}">${gemIc(k,1)} ${gemName(k)} ×${GM[k]}<small>${gemTxt(k,it.il)}</small></button>`).join('')}</div>`:`<p>${T('gem_none')}</p>`),T('cancel'));
 setTimeout(()=>document.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>{queue.shift();showModal();act('gemInsert',{id,k:b.dataset.pk},()=>{toast(T('gem_in',{g:gemName(b.dataset.pk)}));haptic('light')})}),0)}
function bindGem(){const P=$('p-forge');
 P.querySelectorAll('[data-gm]').forEach(b=>b.onclick=()=>act('gemMerge',{k:b.dataset.gm,n:0},r=>{toast(T('gem_merged',{n:r.out.n,g:gemName(r.out.k)}));haptic('light')}));
 P.querySelectorAll('[data-gi]').forEach(b=>b.onclick=()=>gemPick(+b.dataset.gi));
 P.querySelectorAll('[data-gr]').forEach(b=>b.onclick=()=>{const[id,i]=b.dataset.gr.split(':').map(Number);const it=[...SLOTS.map(s=>G.eq[s]),...G.inv].find(x=>x&&x.id===id);const k=it&&it.gm&&it.gm[i];if(!k)return;const c=gemCfg().out[gemP(k).l-1];
  modal(`<div class="big">◆</div><h3>${gemName(k)}</h3><p>${T('gem_out_q',{c})}</p><div class="row"><button class="btn" id="gNo">${T('cancel')}</button></div>`,T('gem_out_btn',{c}),()=>act('gemRemove',{id,i},()=>toast(T('gem_out_ok',{g:gemName(k)}))));
  setTimeout(()=>{const n=$('gNo');if(n)n.onclick=()=>{queue.shift();showModal()}},0)});
 if(gemSel){const e=P.querySelector(`[data-gi="${gemSel}"],[data-gr^="${gemSel}:"]`);if(e)e.scrollIntoView({block:'center'});gemSel=null}}
function renderForge(){
 const F=V.forge,legs=s=>G.inv.filter(i=>i.r===4&&i.slot===s);
 if(!mSlot||!legs(mSlot).length)mSlot=SLOTS.find(s=>legs(s).length>=3)||SLOTS.find(s=>legs(s).length)||'weapon';
 const LG=legs(mSlot),maxN=Math.min(12,LG.length),need=F.myth.need;
 mN=Math.max(need,Math.min(mN,Math.max(need,maxN)));
 const extra=Math.max(0,mN-need),fails=G.mythFails||0,chance=Math.min(F.myth.cap,F.myth.base+F.myth.extra*extra+F.myth.fail*fails);
 const il=LG.length?Math.max(...LG.slice(0,mN).map(i=>i.il)):0,souls=Math.round(150+il*5);
 const ec=F.ench,legAll=G.inv.filter(i=>i.r===4).length,eMax=G.ench>=F.enchMax;
 let h='';if(fsub==='res')h+=`<div class="card"><h4>${T('res')}</h4><div class="resg">
  <div><span>${T('souls')}</span><b>${fmt(G.souls)}</b></div><div><span>${T('ash')}</span><b>${fmt(G.ash)}</b></div>
  <div><span>${T('shards')}</span><b>${fmt(G.shards)}</b></div><div><span>${T('cats')}</span><b>${G.cat}</b></div>
  <div><span>${T('ess')}</span><b>${G.ess||0}</b></div></div><h4 style="margin:10px 0 6px">${T('mats')}</h4><div class="mats">${MATN.map((x,i)=>`<div><i>⛏️</i><b>${fmt((G.mats||[])[i]||0)}</b><span>${T('mat_n',{n:x})}</span></div>`).join('')}</div><p class="hint">${T('mats_hint')}</p>
  <p class="hint">${T('forge_hint',{r:fmt(F.soulsPerHour)})}</p></div>`;
 if(fsub==='res')h+=`<div class="card"><h4>${T('dis_title')}</h4>
  <div class="chips"><button data-dm="shards" class="${G.dismode!=='xp'?'act':''}">${T('to_shards')}</button><button data-dm="xp" class="${G.dismode==='xp'?'act':''}">${T('to_xp')}</button></div>
  <div class="row"><button class="btn pri" id="disJunk" ${F.junk?'':'disabled'}>${T('dis_junk',{n:F.junk})}</button></div>
  <div class="row"><button class="btn" id="smelt" ${G.shards>=(V.smelt||400)?'':'disabled'}>${T('smelt_btn',{s:V.smelt||400})}</button><button class="btn" id="smeltAll" ${G.shards>=(V.smelt||400)*2?'':'disabled'}>${T('smelt_all',{n:Math.min(20,Math.floor(G.shards/(V.smelt||400)))})}</button></div>
  <p class="hint">${T('dis_hint')}</p></div>`;
 if(fsub==='ench')h+=`<div class="card"><h4>${T('ench_title',{l:G.ench,m:F.enchMax})}</h4>
  <p class="hint">${T('ench_hint',{p:Math.round(F.enchStep*100),c:Math.round(G.ench*F.enchStep*100)})}</p>
  ${eMax?`<p>${T('max_reached')}</p>`:`<p class="hint">${T('ench_cost',{n:legAll})} · 🔩 ${fmt(ec.shards)} · 💰 ${fmt(ec.gold)}</p>
  <div class="row"><button class="btn pri" id="ench" ${legAll&&G.shards>=ec.shards&&G.gold>=ec.gold?'':'disabled'}>${T('ench_btn',{n:G.ench+1})}</button></div>`}</div>`;
 if(fsub==='myth')h+=`<div class="card"><h4><span style="color:${RAR[5].c}">◆</span> ${T('myth_title')}</h4>
  <div class="chips">${SLOTS.map(s=>`<button data-ms="${s}" class="${s===mSlot?'act':''}">${SLOT[s].ic} ${legs(s).length}</button>`).join('')}</div>
  <p class="hint">${T('myth_have',{slot:SLOT[mSlot].n,n:LG.length,need,s:fmt(souls)})}</p>
  <div class="step"><button class="btn" id="mMinus">−</button><b>${T('anvil',{a:Math.min(mN,LG.length),b:need})}</b><button class="btn" id="mPlus">+</button></div>
  <p class="hint">${T('myth_chance',{c:chance,b:F.myth.base,e:F.myth.extra*extra,f:F.myth.fail*fails,m:F.myth.cap,need})}</p>
  <div class="row"><button class="btn pri" id="myth" ${LG.length>=need&&G.cat>=1&&G.souls>=souls?'':'disabled'}>${T('forge_btn',{c:chance})}</button></div></div>`;
 const myths=[...SLOTS.map(s=>G.eq[s]).filter(i=>i&&i.r===5),...G.inv.filter(i=>i.r===5)],A=F.ast;
 if(fsub==='ast')h+=`<div class="card"><h4><span style="color:${RAR[6].c}">✦</span> ${T('ast_title')}</h4>
  <p class="hint">${T('ast_hint',{cat:A.cat,ess:A.ess,c:F.astChance,f:A.fail,m:A.cap})}</p>
  ${myths.length?myths.map(it=>{const so=Math.round(400+it.il*12),ok=G.cat>=A.cat&&(G.ess||0)>=A.ess&&G.souls>=so;return `<div class="item" style="border-left-color:${RAR[5].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info"><div class="nm" style="color:${RAR[5].c}">${itemName(it)}</div><div class="sub">${T('lvl',{n:it.il})} · 🔥${fmt(so)}${SLOTS.some(s=>G.eq[s]&&G.eq[s].id===it.id)?' · '+T('equipped'):''}</div></div><div class="acts"><button class="btn pri" data-ast="${it.id}" ${ok?'':'disabled'}>✦ ${F.astChance}%</button></div></div>`}).join(''):`<p class="hint">${T('first_myth')}</p>`}</div>`;
 if(fsub==='gem')h+=gemPane();
 $('p-forge').innerHTML=h;
 if(fsub==='gem')bindGem();
 $('p-forge').querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{G.dismode=b.dataset.dm;renderForge();dirty.bag=1});
 if($('smelt')){$('smelt').onclick=()=>act('smelt',{n:1},r=>toast(T('smelted',{n:r.out.n})));$('smeltAll').onclick=()=>act('smelt',{n:20},r=>toast(T('smelted',{n:r.out.n})))}
 if($('disJunk'))$('disJunk').onclick=()=>act('dismantleJunk',{mode:G.dismode},r=>toast(disMsg(r.out)));
 const eb=$('ench');if(eb)eb.onclick=()=>act('enchant',{},r=>{toast(T('ench_done',{n:r.out.ench}));haptic('heavy')});
 $('p-forge').querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{mSlot=b.dataset.ms;mN=need;renderForge()});
 if($('mMinus'))$('mMinus').onclick=()=>{mN=Math.max(need,mN-1);renderForge()};
 if($('mPlus'))$('mPlus').onclick=()=>{mN=Math.min(Math.max(need,maxN),mN+1);renderForge()};
 $('p-forge').querySelectorAll('[data-ast]').forEach(b=>b.onclick=()=>act('astral',{id:+b.dataset.ast},r=>{if(r.out.win){toast(T('ast_win'));haptic('heavy')}else toast(T('ast_fail',{c:r.out.chance}))}));
 if($('myth'))$('myth').onclick=()=>{const ids=LG.slice(0,mN).map(i=>i.id);act('mythic',{ids},r=>{const o=r.out;if(o.win){toast(T('myth_win'));haptic('heavy')}else toast(T('myth_fail',{c:o.chance}))})};
}
const DNG=[{n:'Нора щурів',bg:1},{n:'Вовче лігво',bg:1},{n:'Склеп короля',bg:2},{n:'Болотне капище',bg:3},{n:'Вогняна кузня',bg:4},{n:'Крижана печера',bg:5},{n:'Затонулий храм',bg:6},{n:'Зала дзеркал',bg:7},{n:'Серце безодні',bg:8},{n:'Трон попелу',bg:8}];
const MATN=['I','II','III','IV'];
const logTime=a=>{const d=new Date(a),n=new Date(),p=x=>String(x).padStart(2,'0');return d.toDateString()===n.toDateString()?p(d.getHours())+':'+p(d.getMinutes()):p(d.getDate())+'.'+p(d.getMonth()+1)};
const dngD={}; // вибрана складність для кожного тиру
function renderDng(){
 const D=V.dng,tr=T;
 const left=D.left!=null?D.left:5,daily=D.daily||5;
 let h=`<p class="hint" style="margin-top:0">${T('dng_hint',{r:D.rooms,d:daily})}</p><p class="hint">${T('chest_hint')}</p><div class="chestbar" style="background:var(--panel);border-color:var(--line)">🏰<span>${T('dng_left',{n:left,m:daily})}</span></div>`;
 if(G.maxStage<D.unlockStage)h+=`<div class="empty">${T('dng_unlock',{n:D.unlockStage})}</div>`;
 for(const T of D.tiers){const d=DNG[T.t-1],DF=T.diffs||[{d:1,open:T.open,rw:T.rw,est:T.est}];
  if(!dngD[T.t]||!DF[dngD[T.t]-1]||!DF[dngD[T.t]-1].open)dngD[T.t]=Math.max(1,...DF.filter(x=>x.open).map(x=>x.d));
  const cd=DF[dngD[T.t]-1]||DF[0],rw=cd.rw,e=cd.est;
  const ec=e==null?'':e>=80?'#56c271':e>=40?'#f2c14e':'#e0484e';
  h+=`<div class="dcard ${T.open?'':'lock'}"><div class="th" style="background-image:url(${IMG('bg'+d.bg)})"><b>${ROMAN[T.t-1]||'I'}</b></div><div class="info">
   <div class="nm">${d.n} <span class="sub">· ${tr('tier',{n:T.t})}</span></div>
   <div class="rw">${chestIc(rw.chestG)}×${rw.chests} (${tr('lvl',{n:G.lvl+'–'+(G.lvl+3)})}) · ⛏️${MATN[rw.mat]}×${rw.matN} · 🔥${rw.souls}${rw.catChance?' · 💎'+Math.round(rw.catChance*100)+'%':''}${rw.essChance?' · ✦'+Math.round(rw.essChance*100)+'%':''}</div>
   ${cd.need?(()=>{const my=V.hero.power,ok=my>=cd.need;return `<div class="sub need ${ok?'ok':'bad'}">💪 ${tr('need_power',{n:fmt(cd.need),m:fmt(my)})}${ok?' ✓':' · '+tr('need_short',{n:fmt(cd.need-my)})}</div>`})():''}
   ${T.open&&DF.length>1?`<div class="chips diffs">${DF.map(x=>`<button data-dt="${T.t}" data-dd="${x.d}" class="${x.d===cd.d?'act':''} ${x.open?'':'lockd'}">${x.open?'':'🔒'}${tr('diff_'+x.d)}</button>`).join('')}</div>`:''}
   ${T.open?`<div class="sub">${tr('dng_chance')} <span class="est" style="color:${ec}">~${e}%</span></div>
   <button class="btn pri" data-dng="${T.t}" data-d="${cd.d}" ${busy||(!left&&!T.keys&&(G.ash||0)<T.pay)?'disabled':''}>${left?tr('enter_free'):T.keys?tr('enter_key',{n:T.keys}):tr('enter',{p:fmt(T.pay)})}</button>${(left+T.keys)>1?`<button class="btn" data-dngn="${T.t}" data-d="${cd.d}" ${busy?'disabled':''}>⚡ ${tr('batch',{n:Math.min(10,left+T.keys)})}</button>`:''}`:`<div class="sub">${G.maxStage<D.unlockStage?tr('stage',{n:D.unlockStage}):tr('need_tier',{n:T.t-1})}</div>`}
  </div></div>`}
 $('p-dng').innerHTML=h;
 $('p-dng').querySelectorAll('[data-dng]').forEach(b=>b.onclick=()=>act('dungeon',{t:+b.dataset.dng,d:+b.dataset.d},r=>dngPlay(r.out)));
 $('p-dng').querySelectorAll('[data-dngn]').forEach(b=>b.onclick=()=>act('dungeon',{t:+b.dataset.dngn,d:+b.dataset.d,n:10},r=>dngBatch(r.out)));
 $('p-dng').querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{const t=+b.dataset.dt,k=+b.dataset.dd,x=(V.dng.tiers[t-1].diffs||[])[k-1];
  if(!x||!x.open){toast(T('diff_lock',{n:T('diff_'+(k-1))}));return}dngD[t]=k;renderDng()});
}
// ---------- підземелля на весь екран: відтворення бою, порахованого сервером ----------
function dngPlay(o){
 if(!o.rooms||!o.rooms[0]||!o.rooms[0].ev){dngResult(o);return}
 const d=DNG[o.t-1],R=REGIONS[(d.bg-1)%REGIONS.length],timers=[];let done=false;
 const el=document.createElement('div');el.className='dngv';el.id='dngv';
 el.innerHTML=`<div class="dv-bg" style="background-image:url(${IMG('bg'+d.bg)})"></div>
  <div class="dv-top"><div><b>${esc(d.n)} · ${T('tier',{n:o.t})}${o.d>1?' · '+T('diff_'+o.d):''}</b><span id="dvRoom"></span></div><button class="btn" id="dvSkip">${T('skip')} ⏭</button></div>
  <div class="dv-rooms">${o.rooms.map((x,i)=>`<i id="dvR${i}" class="${x.boss?'b':''}"></i>`).join('')}${o.rooms.length<6?Array.from({length:6-o.rooms.length},(_,k)=>`<i class="${o.rooms.length+k===5?'b':''}"></i>`).join(''):''}</div>
  <div class="dv-f"><div class="f hero"><div class="sprite" id="dvH"><img alt="" src="${IMG('hero')}"></div><div class="fname">${esc(T('hero_name'))}</div><div class="hpb"><i id="dvHh"></i></div></div>
  <div class="f mob"><div class="sprite" id="dvM"></div><div class="fname" id="dvMn"></div><div class="hpb"><i id="dvMh"></i></div></div></div>`;
 document.body.appendChild(el);
 const fin=()=>{if(done)return;done=true;timers.forEach(clearTimeout);el.remove();dngResult(o)};
 $('dvSkip').onclick=fin;
 const at=(ms,f)=>timers.push(setTimeout(()=>{if(!done)f()},ms));
 const fl=(txt,cls,side)=>{const e=document.createElement('div');e.className='dmg '+cls;e.textContent=txt;e.style.left=(side==='m'?60+Math.random()*20:12+Math.random()*20)+'%';e.style.top=(42+Math.random()*8)+'%';el.appendChild(e);setTimeout(()=>e.remove(),800)};
 const hit=(id,c)=>{const e=$(id);if(!e)return;e.classList.remove(c);void e.offsetWidth;e.classList.add(c);setTimeout(()=>e.classList.remove(c),c==='hit'?250:130)};
 // темп: увесь забіг ~12–16 с, але не швидше 110 мс на удар
 const totalEv=o.rooms.reduce((a,x)=>a+x.ev.length,0),step=Math.max(110,Math.min(450,13000/Math.max(1,totalEv)));
 let t=300;
 o.rooms.forEach((x,i)=>{
  const mob=x.boss?R.boss:R.mobs[i%R.mobs.length],start=t;
  at(start,()=>{$('dvRoom').textContent=x.boss?T('boss'):T('room',{n:i+1});const r=$('dvR'+i);if(r)r.classList.add('cur');
   const m=$('dvM');m.className='sprite'+(x.boss?' big':'');m.innerHTML=`<img alt="" src="${IMG(mob[1])}">`;void m.offsetWidth;m.classList.add('appear');
   $('dvMn').textContent=(x.boss?'👑 ':'')+mob[0];$('dvMh').style.width='100%';$('dvHh').style.width=Math.max(0,x.hp0/o.heroHp*100)+'%'});
  let hp=x.hp0,fh=x.foeHp;
  x.ev.forEach((e,k)=>{t+=step;const tt=t;at(tt,()=>{
   if(e[1]===0){fh-=e[2];hit('dvH','lunge-r');hit('dvM','hit');fl(fmt(e[2])+(e[3]?'!':''),e[3]?'crit':'','m');$('dvMh').style.width=Math.max(0,fh/x.foeHp*100)+'%'}
   else{hp-=e[2];hit('dvM','lunge-l');hit('dvH','hit');fl('-'+fmt(e[2]),'taken','h');$('dvHh').style.width=Math.max(0,hp/o.heroHp*100)+'%'}})});
  t+=500;const te=t;
  at(te,()=>{const r=$('dvR'+i);if(r){r.classList.remove('cur');r.classList.add(x.win?'ok':'bad')}
   if(x.win){const m=$('dvM');m.classList.add('die');haptic('light')}else{const h=$('dvH');h.classList.add('die');haptic('medium')}});
  t+=450;
 });
 at(t+400,fin);
}

// підсумок серії заходів
function dngBatch(o){
 const d=DNG[o.t-1],g=o.gain;
 const rw=[g.chests?`${chestIc(g.chestG)} ${T('chest_'+(g.chestG||1))}: <b>${g.chests}</b>`:'',g.matN?`${T('r_mat',{m:MATN[g.mat]})} <b>${g.matN}</b>`:'',g.ash?`${T('r_ash')} <b>+${fmt(g.ash)}</b>`:'',g.souls?`${T('r_souls')} <b>+${g.souls}</b>`:'',g.cat?`${T('r_cat')} <b>+${g.cat}</b>`:'',g.ess?`<span style="color:${RAR[6].c}">${T('r_ess')} <b>+${g.ess}</b></span>`:'',g.gems?`${T('r_gems')} <b>+${g.gems}</b>`:'',g.egg||g.eggs?`${T('r_egg')} <b>+${g.eggs||1}</b>`:''].filter(Boolean).map(x=>`<p>${x}</p>`).join('');
 modal(`<div class="big">⚡</div><h3>${d.n}${o.d>1?' · '+T('diff_'+o.d):''}</h3><p>${T('batch_res',{n:o.runs,w:o.wins})}</p>${rw||`<p class="hint">${T('no_reward')}</p>`}${g.chests?`<p class="hint">${T('chests_in_bag')}</p>`:''}`,T('ok'));
 haptic('heavy');
}
function dngResult(o){
 const d=DNG[o.t-1],g=o.gain;
 const rows=o.rooms.map((x,i)=>`<div><span>${x.boss?T('boss'):T('room',{n:i+1})}</span><b style="color:${x.win?'#56c271':'#e0484e'}">${x.win?'✓':'✗'} ❤️${x.hpLeft}%</b></div>`).join('');
 const rw=[g.chests?`${chestIc(g.chestG)} ${T('chest_'+(g.chestG||1))}: <b>${g.chests}</b>`:'',g.matN?`${T('r_mat',{m:MATN[g.mat]})} <b>${g.matN}</b>`:'',g.ash?`${T('r_ash')} <b>+${fmt(g.ash)}</b>`:'',g.souls?`${T('r_souls')} <b>+${g.souls}</b>`:'',g.cat?`${T('r_cat')} <b>+1</b>`:'',g.ess?`<span style="color:${RAR[6].c}">${T('r_ess')} <b>+1</b></span>`:'',g.gems?`${T('r_gems')} <b>+${g.gems}</b>`:'',g.egg||g.eggs?`${T('r_egg')} <b>+${g.eggs||1}</b>`:''].filter(Boolean).map(x=>`<p>${x}</p>`).join('');
 modal(`<div class="big">${o.full?'🏆':'💀'}</div><h3>${d.n}: ${T(o.full?'dng_win':'dng_lose')}</h3><div class="rooms">${rows}</div>${rw||`<p class="hint">${T('no_reward')}</p>`}${g.chests?`<p class="hint">${T('chests_in_bag')}</p>`:''}`,T('ok'));
 document.querySelectorAll('.rooms div').forEach((e,i)=>setTimeout(()=>e.classList.add('show'),250+i*350));
 haptic(o.full?'heavy':'medium');
}
function gateTxt(c){return '🔩'+fmt(c.shards)+(c.mat>=0?' · ⛏️'+MATN[c.mat]+'×'+c.matN:'')+(c.cat?' · 💎'+c.cat:'')}
function gateOk(c){return G.shards>=c.shards&&(c.mat<0||((G.mats||[])[c.mat]||0)>=c.matN)&&G.cat>=c.cat}
function renderTrain(){
 const TG=(V.train&&V.train.gate)||{};
 let h='';for(const u of UPG){const l=G.up[u.k],mx=u.max&&l>=u.max,gc=TG[u.k];
  const vv=x=>u.k==='crit'?u.val(x).toFixed(1)+'%':fmt(u.val(x));
  h+=`<div class="upg"><div class="ic">${u.ic}</div><div class="info"><b>${u.n} · ${T('lvl',{n:l})}</b><span>${u.d}: ${vv(l)}${mx?'':' → '+vv(l+1)}</span></div>`;
  if(mx)h+=`<button class="btn" disabled>${T('max')}</button>`;
  else if(gc)h+=`<div class="gate"><span>⛰️ ${T('gate')}: ${gateTxt(gc)} · 💰${fmt(u.cost(l))}</span><button class="btn pri" data-up="${u.k}" data-n="1" data-gate="1">${T('gate')}</button></div>`;
  else h+=`<div class="ubtns"><button class="btn pri" data-up="${u.k}" data-n="1">💰 ${fmt(u.cost(l))}</button><button class="btn" data-up="${u.k}" data-n="10">×10</button><button class="btn" data-up="${u.k}" data-n="0">${T('max_all')}</button></div>`;
  h+='</div>'}
 h+=`<p class="hint">${T('train_hint')} ${T('gate_hint')}</p>`;
 $('p-train').innerHTML=h;
 $('p-train').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>act('upgrade',{k:b.dataset.up,n:+b.dataset.n},r=>{haptic(r.out.gate?'heavy':'light');if(r.out.n>1)toast('+'+r.out.n+' · 💰'+fmt(r.out.cost))}));renderTrainBtns();
}
function renderTrainBtns(){const TG=(V.train&&V.train.gate)||{};$('p-train').querySelectorAll('[data-up]').forEach(b=>{const u=UPG.find(x=>x.k===b.dataset.up);const l=G.up[u.k];b.disabled=busy||G.gold<u.cost(l)||(b.dataset.gate&&(!TG[u.k]||!gateOk(TG[u.k])))})}
const LOGT={
 start:()=>T('log_start'),
 lvl:a=>T('log_lvl',{n:a[0]}),
 loot:a=>`<span style="color:${RAR[a[0]].c}">${SLOT[a[1]].ic} ${RAR[a[0]].n}: ${SLOT[a[1]].names[a[2]]||''}</span>`,
 bagfull:()=>T('log_bagfull'),
 offline:a=>T('log_offline',{h:Math.floor(a[0]/3600),m:Math.floor(a[0]%3600/60),g:fmt(a[1]),i:a[2]})+(a[3]?', +'+a[3]+' 🔥':''),
 boss:a=>T('log_boss',{s:a[0],g:fmt(a[1])}),
 bossDeath:a=>T('log_bossDeath',{s:a[0]}),
 bossTimeout:a=>T('log_bossTimeout',{s:a[0]}),
 daily:a=>T('log_daily',{n:a[0]}),
 reward:a=>T('log_reward',{a:fmt(a[0])}),
 pet:a=>T(a[1]?'log_pet_new':'log_pet_dup',{p:petIc(a[0])+' '+T('pet_'+a[0]),s:a[2]?' ★'+a[2]:''}),
 petEvo:a=>T('log_pet_evo',{p:petIc(a[0])+' '+T('pet_'+a[0]),f:ROM[a[1]]}),
 dis:a=>T('log_dis',{n:a[0],v:fmt(a[1])+' '+(a[2]==='xp'?'✨':'🔩')}),
 ench:a=>T('log_ench',{n:a[0]}),
 arena:a=>T('log_arena',{r:T(a[0]?'pvp_win':'pvp_lose'),n:esc(a[1]),d:(a[2]>=0?'+':'')+a[2]}),
 gate:a=>T('log_gate',{s:(UPG.find(u=>u.k===a[0])||{n:a[0]}).n,n:a[1]}),
 dng:a=>T('log_dng',{d:DNG[a[0]-1].n,r:T(a[1]?'log_dng_ok':'log_dng_fail'),c:a[2]}),
 astral:a=>a[0]?`<span style="color:${RAR[6].c}">${T('log_ast_ok',{s:SLOT[a[1]].n})}</span>`:T('log_ast_fail',{c:a[2]}),
 myth:a=>a[0]?`<span style="color:${RAR[5].c}">${T('log_myth_ok',{s:SLOT[a[1]].n})}</span>`:T('log_myth_fail',{c:a[2]})
};
function renderLog(){$('p-log').innerHTML='<div class="log">'+(G.log.length?G.log.map(e=>{const d=new Date(e.t);return `<div><b>${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</b> ${(LOGT[e.k]||(()=>e.k))(e.a||[])}</div>`}).join(''):`<div class="empty">${T('log_empty')}</div>`)+'</div>'}
function flush(){if(G&&dirty[tab]){dirty[tab]=0;({pet:renderPet,hero:renderHero,bag:renderBag,forge:renderForge,dng:renderDng,train:renderTrain,log:renderLog,arena:renderArena,top:renderRank,prof:renderProfile,clan:renderClan,market:renderMarket})[tab]()}}

// ---------- профіль ----------
let profData=null,profBusy=false,adminData=null;
const dt=s=>{if(!s)return '—';const d=new Date(s);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()};
function copyText(t){try{navigator.clipboard.writeText(t);toast(T('copied'))}catch(e){toast(t)}}
// ---------- пітомці ----------
const PETIC={wolf:'🐺',golem:'🗿',raven:'🐦‍⬛',owl:'🦉',ghost:'👻',phoenix:'🐦‍🔥'},PETS_ORD=['wolf','golem','raven','owl','ghost','phoenix'];
const petIc=(sp,big)=>`<span class="pet-ic${big?' big':''}">${PETIC[sp]||'❔'}</span>`,eggIc=e=>`<span class="egg ${e==='r'?'r':''}">🥚</span>`;
const petEvoN=l=>l>=20?2:l>=10?1:0,stars=(s,m=5)=>'<span class="stars">'+'★'.repeat(s)+'<i>'+'★'.repeat(m-s)+'</i></span>';
const hms=ms=>{const m=Math.ceil(ms/60000),h=Math.floor(m/60);return h?T('t_hm',{h,m:m%60}):T('t_m',{m})};
function petFighter(){const e=$('petf');if(!e)return;const P=G&&G.pet;if(P&&P.act){const p=P.list[P.act];e.innerHTML=PETIC[P.act];e.className='petf evo'+petEvoN(p.l);e.style.display=''}else e.style.display='none'}
function renderPet(){const P=G.pet||{list:{},act:null,eggs:{c:0,r:0},inc:null,fn:0},D=V.pet||{},I=D.info||{},C=D.cfg||{},now=Date.now();
 let h='';const a=P.act&&P.list[P.act];
 if(a){const sp=P.act,b=(D.defs||{})[sp]||{},bv=(I.bonus||{})[sp]||0,nx=I.next,f=petEvoN(a.l);
  h+=`<div class="card petcard"><div class="petmain">${petIc(sp,1)}<div><h4>${T('pet_'+sp)} · ${T('pet_form',{f:ROM[f]})}</h4><div>${stars(a.s)} · ${T('lvl',{n:a.l})}/${C.maxLvl||30}</div><div class="up">${T('petb_'+b.b,{v:bv})}</div><div class="sub">${a.s<5?T('pet_dups',{d:a.d,n:C.dupStar||2}):T('pet_maxstar')}</div></div></div>`;
  if(nx){const ok=(G.mats||[]).slice(nx.mat).reduce((x,y)=>x+(y||0),0)>=nx.matN&&G.shards>=nx.shards&&G.cat>=nx.cat;
   h+=`<p class="hint">${nx.cat?T('pet_evo_hint',{f:ROM[f+1]}):T('pet_feed_hint')}</p><div class="st">${T('pet_cost')}: ⛏️${MATN[nx.mat]}×${nx.matN} · 🔩${fmt(nx.shards)}${nx.cat?' · 💎1':''}</div><div class="row"><button class="btn pri" id="pFeed" ${ok?'':'disabled'}>${nx.cat?T('pet_evo_btn'):T('pet_feed')}</button>${nx.cat?'':`<button class="btn" id="pFeedM" ${ok?'':'disabled'}>${T('pet_feed_max')}</button>`}</div>`}
  else h+=`<p class="hint">${T('max_reached')}</p>`;
  h+=`<div class="petfind"><span>🎒 ${T('pet_finds',{n:P.fn||0,m:C.findMax||3})}${(P.fn||0)<(C.findMax||3)&&I.findIn?' · '+T('pet_next',{t:hms(I.findIn)}):''}</span><button class="btn pri" id="pFind" ${P.fn?'':'disabled'}>${T('take')}</button></div></div>`}
 // інкубатор
 h+=`<div class="card"><h4>🥚 ${T('pet_inc')}</h4>`;
 if(P.inc){const left=Math.max(0,P.inc.at-now);h+=`<div class="petinc">${eggIc(P.inc.e)}<div><b>${T(P.inc.e==='r'?'egg_r':'egg_c')}</b><div class="sub">${left?T('pet_hatch_in',{t:hms(left)}):T('pet_ready')}</div></div>${left?`<button class="btn" id="pSpeed" ${G.ash>=I.speed?'':'disabled'}>⚡ ⚱️${I.speed}</button>`:`<button class="btn pri" id="pClaim">${T('pet_claim')}</button>`}</div>`}
 h+=`<div class="row">${['c','r'].map(e=>`<button class="btn" data-hatch="${e}" ${P.eggs[e]>0&&!P.inc?'':'disabled'}>${eggIc(e)} ${T(e==='r'?'egg_r':'egg_c')} ×${P.eggs[e]||0}</button>`).join('')}</div><p class="hint">${T('pet_egg_hint',{c:Math.round((C.hatch&&C.hatch.c||144e5)/36e5),r:Math.round((C.hatch&&C.hatch.r||432e5)/36e5)})}</p></div>`;
 // колекція
 h+=`<div class="card"><h4>📖 ${T('pet_coll')}</h4><div class="petgrid">`+PETS_ORD.map(sp=>{const p=P.list[sp],b=(D.defs||{})[sp]||{};return p?`<button class="petc ${P.act===sp?'act':''}" data-pset="${sp}">${petIc(sp)}<b>${T('pet_'+sp)}</b>${stars(p.s)}<small>${T('lvl',{n:p.l})} · ${T('petb_'+b.b,{v:(I.bonus||{})[sp]||0})}</small></button>`:`<div class="petc no"><span class="pet-ic">❔</span><b>${T('pet_'+sp)}</b><small>${T('petb_'+b.b,{v:b.v||0})}${b.rare?' · '+T('egg_r'):''}</small></div>`}).join('')+`</div><p class="hint">${T('pet_coll_hint')}</p></div>`;
 if(!a&&!P.inc&&!(P.eggs.c||P.eggs.r))h=`<div class="card"><h4>🐾 ${T('sub_pet')}</h4><p class="hint">${T('pet_intro')}</p></div>`+h;
 $('p-pet').innerHTML=h;const E=$('p-pet');
 const fd=n=>act('petFeed',{n},r=>{toast(T('pet_fed',{l:r.out.l}));haptic('light')});
 if($('pFeed'))$('pFeed').onclick=()=>fd(1);if($('pFeedM'))$('pFeedM').onclick=()=>fd(30);
 if($('pFind'))$('pFind').onclick=()=>act('petFind',{},r=>{const g=r.out.got;const sum={};for(const x of g){const k=x.k+(x.x||'');sum[k]=sum[k]||{...x,n:0};sum[k].n+=x.n}
  modal(`<div class="big">${PETIC[P.act]}</div><h3>${T('pet_found')}</h3>`+Object.values(sum).map(x=>`<p>${x.k==='chest'?'🧰 '+T('chest_1'):x.k==='gem'?gemIc(x.x)+' '+gemName(x.x):x.k==='mat'?'⛏️ '+T('mat_n',{n:MATN[+x.x]}):x.k==='ash'?'⚱️ '+T('ash'):'🔩 '+T('shards')} <b>+${fmt(x.n)}</b></p>`).join(''),T('ok'));haptic('light')});
 if($('pSpeed'))$('pSpeed').onclick=()=>act('petSpeed',{},()=>haptic('light'));
 if($('pClaim'))$('pClaim').onclick=()=>act('petClaim',{},r=>{const o=r.out;modal(`<div class="big">${PETIC[o.sp]}</div><h3>${T(o.isNew?'pet_new':'pet_dup',{p:T('pet_'+o.sp)})}</h3>${o.star?`<p>${T('pet_star_up',{s:o.star})}</p>`:''}`,T('ok'));haptic('heavy')});
 E.querySelectorAll('[data-hatch]').forEach(b=>b.onclick=()=>act('petHatch',{e:b.dataset.hatch},()=>haptic('light')));
 E.querySelectorAll('[data-pset]').forEach(b=>b.onclick=()=>{if(P.act===b.dataset.pset)return;act('petSet',{sp:b.dataset.pset},()=>toast(T('pet_set',{p:T('pet_'+b.dataset.pset)})))});
}
function renderProfile(){
 const el=$('p-prof');
 if(!profData){el.innerHTML=`<div class="empty">${T('loading')}</div>`;
  if(!profBusy){profBusy=true;api('profile').then(r=>{profData=r.out}).catch(e=>toast(errT(e))).finally(()=>{profBusy=false;dirty.prof=1})}return}
 const P=profData,R=P.refs,link=inviteLink();
 let h=`<div class="card"><h4>👤 ${T('profile')}</h4><div class="resg">
  <div><span>ID</span><b>${P.id} <a href="#" id="cpId">📋</a></b></div><div><span>${T('joined')}</span><b>${dt(P.joined)}</b></div>
  <div><span>${T('act_days')}</span><b>${P.days}</b></div><div><span>${T('lvl_word')}</span><b>${G.lvl}</b></div>
  <div><span>${T('clan')}</span><b>${P.clan?esc(P.clan):'—'}</b></div><div><span>🏆 ${T('top_rating')}</span><b>${P.arena.rating} (${P.arena.w}/${P.arena.l})</b></div></div></div>`;
 h+=`<div class="card"><h4>👥 ${T('refs')}</h4><p class="hint">${T('refs_hint',{a:R.pct[0],b:R.pct[1],c:R.pct[2]})}</p>
  <div class="arenah"><div><b>${R.n1}</b><span>${T('ref_lvl',{n:1})} · ${R.pct[0]}%</span></div><div><b>${R.n2}</b><span>${T('ref_lvl',{n:2})} · ${R.pct[1]}%</span></div><div><b>${R.n3}</b><span>${T('ref_lvl',{n:3})} · ${R.pct[2]}%</span></div></div>
  <div class="reflink">${esc(link)}</div><div class="row"><button class="btn pri" id="pInv">${T('invite')}</button><button class="btn" id="pCopy">📋 ${T('copy')}</button></div>
  ${R.list.length?'<div class="rank" style="margin-top:8px">'+R.list.map(x=>`<div><b>👤</b><span>${esc(x.name)}</span><i style="color:var(--mut);font-weight:600">${T('lvl',{n:x.lvl})} · ${T('stage',{n:x.stage})}</i></div>`).join('')+'</div>':`<p class="hint">${T('no_refs')}</p>`}</div>`;
 h+=`<div class="card"><h4>📈 ${T('stats')}</h4><div class="resg">
  <div><span>${T('max_stage')}</span><b>${G.maxStage}</b></div><div><span>${T('kills')}</span><b>${fmt(G.tot.kills)}</b></div>
  <div><span>${T('bosses')}</span><b>${G.tot.bosses}</b></div><div><span>${T('deaths')}</span><b>${G.tot.deaths}</b></div>
  <div><span>${T('dng_runs')}</span><b>${(G.dng&&G.dng.runs)||0}</b></div><div><span>${T('power',{n:''}).trim()}</span><b>${fmt(H.power)}</b></div></div></div>`;
 if(V.isAdmin)h+=adminHtml();
 h+=`<div class="row"><button class="btn" id="pRef">🔄 ${T('refresh')}</button><button class="btn" id="pTut">${T('tut_restart')}</button></div>`;
 el.innerHTML=h;
 $('pTut').onclick=tutRestart;
 $('cpId').onclick=e=>{e.preventDefault();copyText(String(P.id))};
 $('pInv').onclick=invite;$('pCopy').onclick=()=>copyText(link);
 $('pRef').onclick=()=>{profData=null;adminData=null;renderProfile()};
 if(V.isAdmin&&!adminData)api('admin').then(r=>{adminData=r.out;dirty.prof=1}).catch(e=>toast(errT(e)));
}
function adminHtml(){
 const A=adminData;if(!A)return `<div class="card"><h4>🛠️ ${T('admin')}</h4><p class="hint">${T('loading')}</p></div>`;
 const mx=Math.max(1,...A.days.map(d=>d.n));
 return `<div class="card admin"><h4>🛠️ ${T('admin')}</h4><div class="arenah">
  <div><b>${A.total}</b><span>${T('a_total')}</span></div><div><b>${A.new24}</b><span>${T('a_new24')}</span></div><div><b>${A.act24}</b><span>${T('a_act24')}</span></div>
  <div><b>${A.act1h}</b><span>${T('a_act1h')}</span></div><div><b>${A.act7}</b><span>${T('a_act7')}</span></div><div><b>${A.byRef}</b><span>${T('a_ref')}</span></div></div>
  <p class="hint">${T('a_more',{c:A.clans,f:A.fights})} · ${Object.entries(A.langs).map(([k,v])=>k+' '+v).join(', ')}</p>
  <div class="bars">${A.days.map(d=>`<div title="${d.d}: ${d.n}"><i style="height:${Math.round(d.n/mx*100)}%"></i><b>${d.n||''}</b><span>${d.d.slice(0,2)}</span></div>`).join('')}</div>
  <p class="hint" style="text-align:center;margin-top:2px">${T('a_days')}</p>
  <div class="rank">${A.top.map((t,i)=>`<div><b>${i+1}</b><span>${esc(t.name)}</span><i>${T('stage',{n:t.stage})}</i></div>`).join('')}</div></div>`;
}
// ---------- клан ----------
let clanData=null,clanBusy=false,craftT=1,clanModeSel=null,resK='m0';
const roleT=r=>T('role_'+r);
function seenTxt(s){if(!s)return '—';const m=Math.round((Date.now()-new Date(s))/60000);return m<5?T('online'):m<60?T('ago_m',{n:m}):m<1440?T('ago_h',{n:Math.round(m/60)}):T('ago_d',{n:Math.round(m/1440)})}
function clanAct(a,args){act(a,args,r=>{if(r.out)clanData=r.out;dirty.clan=1;profData=null})}
function renderClan(){
 const el=$('p-clan');
 if(G.maxStage<(V.clanStage||5)){el.innerHTML=`<div class="empty">${T('clan_unlock',{n:V.clanStage||5})}</div>`;return}
 if(!clanData){el.innerHTML=`<div class="empty">${T('loading')}</div>`;
  if(!clanBusy){clanBusy=true;api('clan').then(r=>{clanData=r.out}).catch(e=>toast(errT(e))).finally(()=>{clanBusy=false;dirty.clan=1})}return}
 const C=clanData;let h='';
 if(!C.clan){
  h+=`<div class="card"><h4>🏰 ${T('clan_create')}</h4><p class="hint">${T('clan_create_hint',{n:C.createStage,m:C.max})}</p>
   <div class="row" style="align-items:center"><input id="cName" maxlength="20" placeholder="${T('clan_name')}" class="inp"><button class="btn pri" id="cMake" ${G.maxStage>=C.createStage&&G.gold>=(V.clanCost||C.createCost)?'':'disabled'}>💰 ${fmt(V.clanCost||C.createCost)}</button></div></div>`;
  const apps=C.apps||[];
  h+=`<div class="card"><h4>🔎 ${T('clan_list')}</h4><div class="row" style="align-items:center;margin-top:0"><input id="cQ" maxlength="20" class="inp" placeholder="${T('clan_search')}" value="${esc(C.q||'')}"><button class="btn" id="cQgo">🔎</button></div>`+(C.list.length?C.list.map(c=>{
   const mine=apps.includes(c.id),full=c.members>=(c.max||C.max),reqs=(c.min_stage?`${T('stage',{n:c.min_stage})}`:'')+(c.min_power?`${c.min_stage?' · ':''}💪 ${fmt(c.min_power)}`:'');
   const btn=mine?`<button class="btn" data-cu="${c.id}">${T('app_cancel')}</button>`:c.join_mode==='closed'?`<button class="btn" disabled>🔒 ${T('clan_mode_closed')}</button>`:`<button class="btn pri" data-cj="${c.id}" ${!full&&c.ok?'':'disabled'}>${c.join_mode==='apply'?T('apply'):T('join')}</button>`;
   return `<div class="item" style="border-left-color:#7a5a26"><div class="ic">🛡️</div><div class="info"><div class="nm">${esc(c.name)}</div><div class="sub">👥 ${c.members}/${c.max||C.max} · ${T('power',{n:fmt(c.power)})} · ${T('clan_mode_'+c.join_mode)}</div>${reqs?`<div class="st ${c.ok?'':'dn'}">${T('clan_reqs')}: ${reqs}</div>`:''}${mine?`<div class="st up">${T('app_sent')}</div>`:''}</div><div class="acts">${btn}</div></div>`}).join(''):`<p class="hint">${T(C.q?'clan_nothing':'clan_none_yet')}</p>`)+'</div>';
  el.innerHTML=h;
  const srch=()=>{clanBusy=true;api('clan',{q:$('cQ').value.trim()}).then(r=>{clanData=r.out}).catch(e=>toast(errT(e))).finally(()=>{clanBusy=false;dirty.clan=1})};
  $('cQgo').onclick=srch;$('cQ').onkeydown=e=>{if(e.key==='Enter')srch()};
  el.querySelectorAll('[data-cu]').forEach(b=>b.onclick=()=>clanAct('clanUnapply',{id:+b.dataset.cu}));
  $('cMake').onclick=()=>{const n=$('cName').value.trim();if(n.length<3){toast(ERR.clan_name_bad);return}clanAct('clanCreate',{name:n})};
  el.querySelectorAll('[data-cj]').forEach(b=>b.onclick=()=>act('clanJoin',{id:+b.dataset.cj},r=>{if(r.out)clanData=r.out;dirty.clan=1;profData=null;if(r.out&&r.out.applied)toast(T('app_sent'))}));
  return}
 const K=C.clan.keys||{},lead=C.role==='leader'||C.role==='officer';
 h+=`<div class="card arenah"><div><b>🏰 ${esc(C.clan.name)}</b><span>${roleT(C.role)}</span></div><div><b>👥 ${C.clan.members}/${C.clan.max||C.max}</b><span>${T('members')}</span></div><div><b>${fmt(C.clan.power)}</b><span>${T('power',{n:''}).trim()}</span></div></div>`;
 const bank=C.clan.bank||0;
 h+=`<div class="card"><h4>🏦 ${T('clan_bank')}: <span style="color:var(--gold)">💰${fmt(bank)}</span></h4><p class="hint">${T('clan_bank_hint')}</p>
  <div class="row" style="align-items:center"><input id="cGive" class="inp" type="number" min="1" inputmode="numeric" placeholder="${T('amount')}"><button class="btn" id="cGiveAll">${T('give_all')}</button><button class="btn pri" id="cGiveGo">${T('give')}</button></div>
  <h4 style="margin-top:12px">⚱️ ${T('clan_ash')}: <span style="color:var(--gold)">${fmt(C.clan.ash||0)}</span></h4>
  <div class="row" style="align-items:center"><input id="cAsh" class="inp" type="number" min="1" inputmode="numeric" placeholder="⚱️ ${fmt(G.ash||0)}"><button class="btn" id="cAshAll">${T('give_all')}</button><button class="btn pri" id="cAshGo">${T('give')}</button></div>
  <h4 style="margin-top:12px">📦 ${T('clan_res')}</h4><div class="mats">${[0,1,2,3].map(i=>`<div><b>⛏️ ${MATN[i]}</b><span>${fmt((C.clan.res||{m:[]}).m[i]||0)}</span></div>`).join('')}<div><b>🔩</b><span>${fmt((C.clan.res||{}).sh||0)}</span></div></div>
  <div class="chips" style="margin-top:8px">${['m0','m1','m2','m3','sh'].map(k=>`<button data-rk="${k}" class="${resK===k?'act':''}">${k==='sh'?'🔩 '+fmt(G.shards||0):'⛏️'+MATN[+k[1]]+' '+fmt((G.mats||[])[+k[1]]||0)}</button>`).join('')}</div>
  <div class="row" style="align-items:center"><input id="cRes" class="inp" type="number" min="1" inputmode="numeric" placeholder="${T('amount')}"><button class="btn" id="cResAll">${T('give_all')}</button><button class="btn pri" id="cResGo">${T('give')}</button></div></div>`;
 const tiers=Object.keys(K).filter(t=>K[t]>0).sort((a,b)=>a-b);
 h+=`<div class="card"><h4>🗝️ ${T('clan_keys')}</h4><p class="hint">${T('clan_keys_hint')}</p>`+(tiers.length?tiers.map(t=>`<div class="row" style="margin-top:6px;align-items:center"><span style="flex:1.4">${T('tier',{n:t})}: <b>${K[t]}</b></span><input class="inp" data-ktq="${t}" type="number" min="1" max="${K[t]}" value="1" inputmode="numeric" style="width:64px;flex:0 0 64px"><button class="btn pri" data-ct="${t}">${T('take')}</button>${K[t]>1?`<button class="btn" data-cta="${t}">${T('take_all',{n:K[t]})}</button>`:''}</div>`).join(''):`<p class="hint">${T('clan_keys_empty')}</p>`)
  +(lead&&tiers.length?`<h4 style="margin-top:12px">🤝 ${T('key_give_t')}</h4><div class="row" style="align-items:center"><select id="kgP" class="inp">${(C.members||[]).map(m=>`<option value="${m.id}">${esc(m.name)}${m.me?' ('+T('you')+')':''}</option>`).join('')}</select><select id="kgT" class="inp" style="flex:0 0 120px">${tiers.map(t=>`<option value="${t}">${T('tier',{n:t})} (${K[t]})</option>`).join('')}</select></div><div class="row" style="align-items:center"><input id="kgN" class="inp" type="number" min="1" value="1" inputmode="numeric" placeholder="${T('key_qty')}"><button class="btn pri" id="kgGo">${T('key_give')}</button></div>`:'')+'</div>';
 if(lead){const opts=C.craft.filter(x=>x.can);if(!opts.some(x=>x.t===craftT)&&opts.length)craftT=opts[opts.length-1].t;
  const cur=C.craft.find(x=>x.t===craftT);
  h+=`<div class="card"><h4>⚒️ ${T('clan_craft')}</h4>`+(opts.length?`<div class="chips">${C.craft.map(x=>x.can?`<button data-cc="${x.t}" class="${x.t===craftT?'act':''}">${T('tier',{n:x.t})}</button>`:`<button disabled title="${esc(T('craft_lock',{n:x.t-1}))}">🔒 ${T('tier',{n:x.t})}</button>`).join('')}</div>${C.craft.some(x=>!x.can)?`<p class="hint">${T('craft_lock',{n:C.craft.find(x=>!x.can).t-1})}</p>`:''}
   <div class="row"><button class="btn pri" data-cn="1" ${(C.clan.ash||0)>=cur.ash?'':'disabled'}>×1 · ⚱️${fmt(cur.ash)}</button><button class="btn" data-cn="5" ${(C.clan.ash||0)>=cur.ash5?'':'disabled'}>×5 · ⚱️${fmt(cur.ash5)}</button></div><p class="hint">${T('clan_craft_hint')}</p>`:`<p class="hint">${T('clan_craft_none')}</p>`)+'</div>'}
 const BL=C.builds||[],RS=C.clan.res||{m:[0,0,0,0],sh:0};
 const bldOk=c=>(C.clan.bank||0)>=c.gold&&(RS.m[c.mat]||0)>=c.matN&&(RS.sh||0)>=c.sh;
 if(BL.length)h+=`<div class="card"><h4>🏗️ ${T('clan_builds')}</h4><p class="hint">${T('clan_builds_hint')}</p>`+BL.map(b=>`<div class="item" style="border-left-color:#c0563a"><div class="ic">${{citadel:'🏰',forge:'⚒️',vault:'💰',barracks:'⚔️',library:'📚'}[b.k]}</div><div class="info"><div class="nm">${T('bld_'+b.k)} · ${T('lvl',{n:b.lvl})}/${b.max}</div><div class="sub">${T('bld_'+b.k+'_d',{n:b.step,t:b.step*b.lvl})}</div>${b.cost?`<div class="st">${T('bld_cost')}: 🏦${fmt(b.cost.gold)} · ⛏️${MATN[b.cost.mat]}×${fmt(b.cost.matN)} · 🔩${fmt(b.cost.sh)}</div>`:''}</div><div class="acts">${b.cost==null?`<span class="sub">${T('max_reached')}</span>`:lead?`<button class="btn pri" data-bk="${b.k}" ${bldOk(b.cost)?'':'disabled'}>⬆️</button>`:''}</div></div>`).join('')+'</div>';
 const AP=C.apps||[];
 if(lead&&AP.length)h+=`<div class="card"><h4>📨 ${T('clan_apps')} (${AP.length})</h4>`+AP.map(a=>`<div class="item" style="border-left-color:#4f93f2"><div class="ic">👤</div><div class="info"><div class="nm">${esc(a.name)}</div><div class="sub">${T('lvl',{n:a.lvl})} · ${T('stage',{n:a.stage})} · ${T('power',{n:fmt(a.power)})}</div></div><div class="acts"><button class="btn pri" data-ay="${a.id}">✓</button><button class="btn" data-an="${a.id}">✖</button></div></div>`).join('')+'</div>';
 const CL=C.clan;
 if(C.role==='leader')h+=`<div class="card"><h4>⚙️ ${T('clan_set')}</h4><div class="chips" id="cMode">${['open','apply','closed'].map(m=>`<button data-cm="${m}" class="${(clanModeSel||CL.mode)===m?'act':''}">${T('clan_mode_'+m)}</button>`).join('')}</div>
  <p class="hint">${T('clan_mode_hint_'+(clanModeSel||CL.mode))}</p>
  <div class="row" style="align-items:center"><span style="flex:1">${T('clan_min_stage')}</span><input id="cMs" class="inp" type="number" min="0" max="80" inputmode="numeric" value="${CL.minStage||0}" style="flex:1"></div>
  <div class="row" style="align-items:center"><span style="flex:1">${T('clan_min_power')}</span><input id="cMp" class="inp" type="number" min="0" inputmode="numeric" value="${CL.minPower||0}" style="flex:1"></div>
  <div class="row"><button class="btn pri" id="cSet">${T('save')}</button></div></div>`;
 else h+=`<p class="hint">${T('clan_mode_'+CL.mode)}${CL.minStage?' · '+T('stage',{n:CL.minStage}):''}${CL.minPower?' · 💪 '+fmt(CL.minPower):''}</p>`;
 h+=`<div class="card"><h4>👥 ${T('members')}</h4>`+C.members.map(m=>{
  const canKick=!m.me&&(C.role==='leader'&&m.role!=='leader'||C.role==='officer'&&m.role==='member'),canRole=!m.me&&C.role==='leader';
  return `<div class="item" style="border-left-color:${m.role==='leader'?'#f2a33a':m.role==='officer'?'#4f93f2':'#555'}"><div class="ic">${m.role==='leader'?'👑':m.role==='officer'?'⭐':'👤'}</div><div class="info"><div class="nm">${esc(m.name)}${m.me?' ('+T('you')+')':''}</div><div class="sub">${roleT(m.role)} · ${T('lvl',{n:m.lvl})} · ${T('stage',{n:m.stage})} · ${seenTxt(m.seen)}</div><div class="st">${T('power',{n:fmt(m.power)})} · ${T('given',{n:'💰'+fmt(m.given||0)+(m.givenAsh?' · ⚱️'+fmt(m.givenAsh):'')})}</div></div>
   <div class="acts">${canRole?`<button class="btn" data-cr="${m.id}" data-r="${m.role==='member'?'officer':'member'}">${m.role==='member'?'⬆️':'⬇️'}</button>`:''}${canKick?`<button class="btn" data-ck="${m.id}">✖</button>`:''}</div></div>`}).join('')+'</div>';
 const LG=C.log||[];
 h+=`<div class="card"><h4>📜 ${T('clan_log')}</h4>`+(LG.length?LG.map(x=>{const d=x.data||{};return `<div class="logl"><span>${logTime(x.at)}</span> ${esc(T('lc_'+x.kind,{n:x.name||'—',w:d.who||'',r:d.role?roleT(d.role):'',g:fmt(d.gold||0),a:d.ash!=null?'⚱️'+fmt(d.ash):'💰'+fmt(d.gold||0),t:d.t||d.place||'',c:d.n||1,k:d.k?(d.k==='sh'?'🔩':/^m\d$/.test(d.k)?'⛏️'+MATN[+d.k[1]]:T('bld_'+d.k)):'',l:d.l||'',x:fmt(d.n||0)}))}</div>`}).join(''):`<p class="hint">${T('clan_log_empty')}</p>`)+'</div>';
 h+=`<div class="row"><button class="btn" id="cRef">🔄 ${T('refresh')}</button><button class="btn" id="cLeave">🚪 ${T('leave')}</button></div>`;
 if(C.role==='leader')h+=`<p class="hint">${T('clan_leader_hint')}</p>`;
 el.innerHTML=h;
 el.querySelectorAll('[data-ct]').forEach(b=>b.onclick=()=>{const t=+b.dataset.ct,q=el.querySelector(`[data-ktq="${t}"]`),n=Math.floor(+(q&&q.value)||1);if(!(n>=1)){toast(T('bad_amount'));return}clanAct('clanTake',{t,n})});
 const kgGo=$('kgGo');if(kgGo)kgGo.onclick=()=>{const n=Math.floor(+$('kgN').value||0);if(!(n>=1)){toast(T('bad_amount'));return}clanAct('clanGiveKeys',{pid:+$('kgP').value,t:+$('kgT').value,n})};
 el.querySelectorAll('[data-cta]').forEach(b=>b.onclick=()=>clanAct('clanTake',{t:+b.dataset.cta,all:1}));
 el.querySelectorAll('[data-bk]').forEach(b=>b.onclick=()=>clanAct('clanBuild',{k:b.dataset.bk},()=>{toast(T('bld_done'));haptic('medium')}));
 el.querySelectorAll('[data-ay]').forEach(b=>b.onclick=()=>clanAct('clanApp',{id:+b.dataset.ay,ok:true}));
 el.querySelectorAll('[data-an]').forEach(b=>b.onclick=()=>clanAct('clanApp',{id:+b.dataset.an,ok:false}));
 el.querySelectorAll('[data-cm]').forEach(b=>b.onclick=()=>{clanModeSel=b.dataset.cm;renderClan()});
 if($('cSet'))$('cSet').onclick=()=>{const m=clanModeSel||C.clan.mode;clanModeSel=null;clanAct('clanSettings',{mode:m,minStage:+$('cMs').value||0,minPower:+$('cMp').value||0});toast(T('saved'))};
 $('cGiveAll').onclick=()=>{$('cGive').value=Math.floor(G.gold)};
 const haveRes=k=>k==='sh'?Math.floor(G.shards||0):Math.floor((G.mats||[])[+k[1]]||0);
 el.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{resK=b.dataset.rk;renderClan()});
 $('cResAll').onclick=()=>{$('cRes').value=haveRes(resK)};
 $('cResGo').onclick=()=>{const n=Math.floor(+$('cRes').value||0);if(n<1)return;if(n>haveRes(resK)){toast(ERR.no_mats);return}clanAct('clanGiveRes',{k:resK,n},()=>toast(T('res_given')))};
 $('cAshAll').onclick=()=>{$('cAsh').value=Math.floor(G.ash||0)};
 $('cAshGo').onclick=()=>{const a=Math.floor(+$('cAsh').value||0);if(a<1)return;if(a>(G.ash||0)){toast(ERR.no_ash);return}clanAct('clanGiveAsh',{amt:a})};
 $('cGiveGo').onclick=()=>{const a=Math.floor(+$('cGive').value||0);if(a<1)return;if(a>G.gold){toast(ERR.no_gold);return}clanAct('clanGive',{amt:a})};
 el.querySelectorAll('[data-cc]').forEach(b=>b.onclick=()=>{craftT=+b.dataset.cc;renderClan()});
 el.querySelectorAll('[data-cn]').forEach(b=>b.onclick=()=>clanAct('clanCraft',{t:craftT,n:+b.dataset.cn}));
 el.querySelectorAll('[data-ck]').forEach(b=>b.onclick=()=>clanAct('clanKick',{pid:+b.dataset.ck}));
 el.querySelectorAll('[data-cr]').forEach(b=>b.onclick=()=>clanAct('clanRole',{pid:+b.dataset.cr,role:b.dataset.r}));
 $('cRef').onclick=()=>{clanData=null;renderClan()};
 $('cLeave').onclick=()=>modal(`<div class="big">🚪</div><h3>${T('leave_q')}</h3><p class="hint">${T(C.role==='leader'?'leave_leader':'leave_hint')}</p><div class="row"><button class="btn" id="lvNo">${T('cancel')}</button></div>`,T('leave'),()=>clanAct('clanLeave',{}));
 setTimeout(()=>{const n=$('lvNo');if(n)n.onclick=()=>{queue.shift();showModal()}},0);
}

// ---------- арена й рейтинги ----------
let arenaInfo=null,arenaLoaded=false,topKind='stage',topBusy=false;const topData={};
function renderArena(){
 const A=V.arena,el=$('p-arena');
 if(!A||G.maxStage<A.stage){el.innerHTML=`<div class="empty">${T('arena_unlock',{n:A?A.stage:10})}</div>`;return}
 if(!arenaLoaded){arenaLoaded=true;el.innerHTML=`<div class="empty">${T('loading')}</div>`;act('arena',{},r=>{arenaInfo=r.out});return}
 const dv=arenaInfo?T('div_'+arenaInfo.div)+' · '+T('top_pct',{p:arenaInfo.top}):'';
 let h=`<div class="card arenah"><div><b>🏆 ${A.rating}</b><span>${dv}</span></div><div><b>⚔️ ${A.left}/${A.daily}</b><span>${T('fights_left')}</span></div><div><b>🎖️ ${A.pts}</b><span>${T('arena_pts')}</span></div></div>
 <div class="row" style="margin:0 0 8px;align-items:center"><span class="hint" style="flex:2;margin:0">${T('arena_w_l',{w:A.w,l:A.l})}</span><button class="btn" id="aRef">🔄 ${T('refresh')}</button></div>`;
 A.opps.forEach((o,i)=>{const c=o.power>H.power*1.05?'#e0484e':o.power<H.power*0.95?'#56c271':'#f2c14e';
  h+=`<div class="item" style="border-left-color:${c}"><div class="ic">🛡️</div><div class="info"><div class="nm">${esc(o.name)}</div><div class="sub">${T('lvl',{n:o.lvl})} · 🏆 ${o.rating}</div><div class="st" style="color:${c}">${T('power',{n:fmt(o.power)})}</div></div><div class="acts"><button class="btn pri" data-af="${i}" ${A.left&&!busy?'':'disabled'}>${T('to_fight')}</button></div></div>`});
 h+=`<div class="card"><h4>🎖️ ${T('arena_shop')}</h4>`+Object.entries(A.shop).map(([k,v])=>`<div class="row" style="margin-top:6px;align-items:center"><span style="flex:2">${T('shop_'+k)}</span><button class="btn" data-ab="${k}" ${A.pts>=v.pts?'':'disabled'}>🎖️ ${v.pts}</button></div>`).join('')+'</div>';
 h+=`<p class="hint">${T('arena_hint',{n:A.daily,w:A.win,l:A.lose})}</p>`;
 el.innerHTML=h;
 $('aRef').onclick=()=>act('arenaRefresh',{},r=>{arenaInfo=r.out});
 el.querySelectorAll('[data-af]').forEach(b=>b.onclick=()=>act('arenaFight',{i:+b.dataset.af},r=>pvpResult(r.out)));
 el.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>act('arenaShop',{item:b.dataset.ab},r=>{toast('✓ '+T('shop_'+b.dataset.ab)+(r.out&&r.out.got?' '+r.out.got.map(k=>gemIc(k)).join(''):''));haptic('light')}));
}
function pvpResult(o){
 modal(`<div class="big">${o.win?'🏆':'💀'}</div><h3>${T(o.win?'pvp_win':'pvp_lose')}</h3>
 <div class="pvp"><div><span>${esc(T('hero_name'))}</span><div class="hpb"><i id="pA" style="width:100%;background:linear-gradient(90deg,#2f9a52,#5fd07c)"></i></div></div><div><span>${esc(o.opp.name)} · ${T('lvl',{n:o.opp.lvl})}</span><div class="hpb"><i id="pD" style="width:100%"></i></div></div></div>
 <p>🏆 <b>${o.delta>=0?'+':''}${o.delta}</b>${o.rating!=null?' → '+o.rating:''} · 🎖️ +${o.pts}</p>`,T('ok'));
 let ha=o.hpA,hd=o.hpD;const step=Math.min(110,2600/Math.max(1,o.ev.length));
 o.ev.forEach((e,i)=>setTimeout(()=>{if(e[1]===0)hd-=e[2];else ha-=e[2];const a=$('pA'),d=$('pD');if(a)a.style.width=Math.max(0,ha/o.hpA*100)+'%';if(d)d.style.width=Math.max(0,hd/o.hpD*100)+'%'},250+i*step));
 haptic(o.win?'heavy':'medium');
}
function renderRank(){
 const el=$('p-top'),d=topData[topKind],val=r=>topKind==='power'||topKind==='clan'?fmt(r.v):r.v;
 let h=`<div class="chips">${['stage','power','rating','clan','lvl'].map(k=>`<button data-tk="${k}" class="${k===topKind?'act':''}">${T('top_'+k)}</button>`).join('')}</div>`;
 if(!d){h+=`<div class="empty">${T('loading')}</div>`;
  if(!topBusy){topBusy=true;api('top',{kind:topKind}).then(r=>{topData[r.out.kind]=r.out}).catch(e=>toast(errT(e))).finally(()=>{topBusy=false;dirty.top=1})}}
 else{
  const kinds=(d.kinds||[]).concat('clan'),hasPrize=kinds.includes(topKind),P=topKind==='clan'?(d.clanPrizes||[]):(d.prizes||[]);
  const prizeOf=pl=>{const x=P.find(q=>pl>=q.from&&pl<=q.to);return x?x.ash:0};
  if(d.prizes){const ms=Math.max(0,d.resetIn||0),dd=Math.floor(ms/864e5),hh=Math.floor(ms%864e5/36e5),mm=Math.floor(ms%36e5/6e4);
   h+=`<div class="card"><h4>🏆 ${T('prize_t')}</h4><p class="hint">${T('prize_hint')}</p>${hasPrize?`<div class="chips">${P.map(q=>`<span class="chip">${q.from===q.to?q.from:q.from+'–'+q.to}: ⚱️${q.ash}</span>`).join('')}</div>`:`<p class="hint">${T('prize_none')}</p>`}
   <p class="sub">⏳ ${T('prize_reset',{t:T('dhm',{d:dd,h:hh,m:mm})})}</p>${(d.last||[]).length?`<p class="sub">${T('prize_last')} ${(d.last||[]).map(x=>T('top_'+(x.kind==='max_stage'?'stage':x.kind))+' #'+x.place+' ⚱️'+x.ash).join(', ')}</p>`:''}</div>`}
  const row=r=>`<div class="${r.me?'me':''}"><b>${r.place<=3?['🥇','🥈','🥉'][r.place-1]:r.place}</b><span>${esc(r.name)}${hasPrize&&prizeOf(r.place)?` <small style="color:var(--gold)">⚱️${prizeOf(r.place)}</small>`:''}</span><i>${val(r)}</i></div>`;
  h+='<div class="rank">'+d.rows.map(row).join('')+'</div>';
  if(d.me&&!d.rows.some(r=>r.me))h+='<div class="rank" style="margin-top:8px">'+row(d.me)+'</div>';
  h+=`<p class="hint">${T('top_total',{n:d.total})}</p><div class="row"><button class="btn" id="tRef">🔄 ${T('refresh')}</button></div>`}
 el.innerHTML=h;
 el.querySelectorAll('[data-tk]').forEach(b=>b.onclick=()=>{topKind=b.dataset.tk;renderRank()});
 const tr=$('tRef');if(tr)tr.onclick=()=>{delete topData[topKind];renderRank()};
}

// дія на сервері: блокує кнопки, показує помилки
async function act(a,args,ok){
 if(busy)return;busy=true;renderBoss();
 try{const r=await api(a,args);ok&&ok(r);afterSync(r);return r}catch(e){toast(errT(e))}finally{busy=false;renderBoss();paintArena()}
}

// ---------- модалки ----------
const queue=[];
function modal(html,btn,cb){queue.push({html,btn,cb});if(queue.length===1)showModal()}
function showModal(){const q=queue[0];if(!q){$('modal').classList.remove('show');return}$('mbox').innerHTML=q.html+(q.btn?`<div class="row"><button class="btn pri" id="mok">${q.btn}</button></div>`:'');$('modal').classList.add('show');if(q.btn)$('mok').onclick=()=>{q.cb&&q.cb();queue.shift();showModal()}}
let dailyShown='';
function afterSync(r){
 const p=r.prog;
 if(r.news)showNews(r.news);
 if(r.reward)modal(`<div class="big">🏆</div><h3>${T('reward_t')}</h3><p>${T('reward_txt',{a:fmt(r.reward)})}</p>`,T('claim'));
 if(p&&p.offline&&p.sec>=60&&p.kills>0){const h=Math.floor(p.sec/3600),m=Math.floor(p.sec%3600/60);
  modal(`<div class="big">🌙</div><h3>${T('away')}</h3><p>${T('away_line',{t:(h?T('hours',{n:h})+' ':'')+T('mins',{n:m}),s:p.stage})}</p><p>${T('p_killed')} <b>${fmt(p.kills)}</b></p><p>${T('p_gold')} <b>+${fmt(p.gold)}</b></p><p>${T('p_xp')} <b>+${fmt(p.xp)}</b></p>${p.souls?`<p>${T('p_souls')} <b>+${fmt(p.souls)}</b></p>`:''}${p.items?`<p>${T('p_items')} <b>${p.items}</b></p>`:''}`,T('claim'))}
 if(p&&p.boss&&!p.boss.win){p.boss.auto=1;if(p.offline)modal(`<div class="big">⚔️</div><h3>${T('auto_off_t')}</h3><p>${T('auto_off_txt',{n:p.boss.stage})}</p>`,T('ok'))}
 if(p&&p.boss&&!B.rep)startReplay(p.boss);
 const d=V.daily;
 if(d&&dailyShown!==String(G.daily.date)+d.streak){dailyShown=String(G.daily.date)+d.streak;
  let days='';for(let i=1;i<=7;i++)days+=`<div class="${i<d.streak?'got':i===d.streak?'now':''}">${T('day',{n:i})}<br>${i===7?'🧰':'💰'}</div>`;
  modal(`<div class="big">🎁</div><h3>${T('daily_title')}</h3><div class="days">${days}</div><p>${T('today')} <b>💰 ${fmt(d.gold)}</b>${d.ash?' · <b>'+T('daily_ash',{a:d.ash})+'</b>':''}${d.epic?' + <b style="color:'+RAR[3].c+'">'+T('epic_item')+'</b>':''}</p><p class="hint">${T('daily_hint')}</p>`,T('claim'),()=>act('daily',{},r=>toast('+💰'+fmt(r.out.gold)+(r.out.ash?' +⚱️'+r.out.ash:''))))}
}

// ---------- мова: застосування ----------
function applyLang(){
 L=I18N[LANG];
 REGIONS.forEach((r,i)=>{const x=L.regions[i];r.n=x[0];r.mobs.forEach((m,j)=>m[0]=x[1][j]);r.boss[0]=x[2]});
 SLOTS.forEach(s=>{SLOT[s].n=L.slot[s];SLOT[s].names=L.items[s]});
 RAR.forEach((r,i)=>r.n=L.rar[i]);
 Object.keys(STATN).forEach(k=>STATN[k]=L.stat[k]);
 UPG.forEach(u=>{u.n=L.upg[u.k][0];u.d=L.upg[u.k][1]});
 DNG.forEach((d,i)=>d.n=L.dng[i]);
 Object.assign(ERR,L.err);
 document.documentElement.lang=LANG;
 document.querySelectorAll('.tabs button').forEach(b=>{b.firstChild.nodeValue=T('tab_'+b.dataset.t)});
 const hn=document.querySelector('.f.hero .fname');if(hn)hn.textContent=T('hero_name');
 $('dead').textContent=T('dead');
}
function setLang(l){
 if(!LANGS.includes(l)||l===LANG)return;LANG=l;try{localStorage.setItem('gt_lang',l)}catch(e){}
 applyLang();Object.keys(dirty).forEach(k=>dirty[k]=1);
 if(B.m&&!B.m.boss){B.m=null;B.resp=0.1}else if(B.m)$('mn').textContent='👑 '+B.m.n;
 renderBoss();paintArena();flush();renderSub();
}

// ---------- навчання: вступ для новачків, підказки-вказівники й пояснення розділів ----------
// Прогрес — на сервері (G.tut): "intro", "p_<розділ>", "tg_<ціль>"; "old" — гравець до навчання, "off" — вимкнув.
const tutLocal=new Set();let tutCur=null,newsShown=0;
const tutHas=k=>tutLocal.has(k)||((G&&G.tut)||[]).includes(k);
const tutOff=()=>tutHas('off');
function tutMark(k){if(tutHas(k))return;tutLocal.add(k);api('tut',{k}).catch(()=>{})}
const TUT_INTRO=[['ti_1','#arena'],['ti_2','#bossBtn'],['ti_3','#autoBtn'],['ti_4','.cur'],['ti_5','.tabs']];
const TUT_PANES=['bag','market','train','pet','res','gem','ench','myth','ast','dng','arena','top','clan','prof'];
const tabBtn=t=>'.tabs button[data-t="'+t+'"]';
// вказівники: умова, куди показати, після якого пояснення розділу крок уже не потрібен; all — і для старих гравців (нові функції)
const TUT_GOALS=[
 {k:'bag',tab:'bag',p:'bag',c:()=>G.inv.length>0},
 {k:'train',tab:'hero',p:'train',c:()=>G.maxStage>=2&&G.gold>=150},
 {k:'forge',tab:'forge',p:'res',c:()=>G.maxStage>=4},
 {k:'dng',tab:'dng',p:'dng',c:()=>V.dng&&G.maxStage>=V.dng.unlockStage},
 {k:'arena',tab:'arena',p:'arena',c:()=>V.arena&&G.maxStage>=V.arena.stage},
 {k:'clan',tab:'clan',p:'clan',c:()=>G.maxStage>=(V.clanStage||5)},
 {k:'pet',tab:'hero',p:'pet',all:1,c:()=>{const P=G.pet;return !!P&&(P.eggs.c+P.eggs.r>0||!!P.inc||Object.keys(P.list).length>0)}},
 {k:'gem',tab:'forge',p:'gem',all:1,c:()=>Object.values(G.gems||{}).some(n=>n>0)},
];
function tutEl(){let e=$('tut');if(!e){e=document.createElement('div');e.id='tut';e.innerHTML='<div class="tring" id="tring"></div><div class="tbub" id="tbub"></div>';document.body.appendChild(e)}return e}
function tutHide(){tutCur=null;const e=$('tut');if(e)e.className=''}
function tutPlace(){
 if(!tutCur)return;const t=document.querySelector(tutCur.sel);
 if(!t||!t.offsetParent){tutHide();return}
 const r=t.getBoundingClientRect(),vh=innerHeight,top=Math.max(4,r.top-4),bot=Math.min(vh-4,r.bottom+4);
 if(bot-top<20){tutHide();return}
 const ring=$('tring'),bub=$('tbub');
 Object.assign(ring.style,{left:(r.left-4)+'px',top:top+'px',width:(r.width+8)+'px',height:(bot-top)+'px'});
 const bh=bub.offsetHeight||120;
 if(vh-bot>=bh+12){bub.style.top=(bot+10)+'px';bub.style.bottom=''}
 else if(top>=bh+12){bub.style.top=(top-10-bh)+'px';bub.style.bottom=''}
 else{bub.style.top='';bub.style.bottom='12px'}
}
function tutShow(o){
 tutCur=o;const e=tutEl();e.className='show'+(o.block?' block':'');
 const step=o.n?`<div class="tstep">${T('tut_step',{i:o.i,n:o.n})}</div>`:'';
 $('tbub').innerHTML=`${step}<p>${T(o.txt)}</p><div class="row"><button class="btn pri" id="tutOk">${T(o.n&&o.i<o.n?'tut_next':'tut_ok')}</button>${o.skip?`<button class="btn" id="tutSkip">${T('tut_skip')}</button>`:''}</div>`;
 $('tutOk').onclick=()=>{const c=tutCur;tutHide();c&&c.ok()};
 if(o.skip)$('tutSkip').onclick=()=>{tutHide();tutMark('off')};
 tutPlace();
}
let introI=0;
const curPane=()=>groupOf(tab)==='forge'?fsub:tab;
const tipPending=()=>{const k=curPane();return TUT_PANES.includes(k)&&!tutHas('p_'+k)};
function tutCheck(){
 if(!G||!V)return;
 if(tutOff()){if(tutCur)tutHide();return}
 const blocked=B.rep||$('dngv')||$('boot')||document.querySelector('.modal.show');
 if(blocked){if(tutCur)tutHide();return}
 if(tutCur){if(tutCur.still&&!tutCur.still())tutHide();else{tutPlace();return}}
 const old=tutHas('old');
 if(!old&&!tutHas('intro')){
  if(tab!=='hero'&&groupOf(tab)!=='hero')return;
  const [txt,sel]=TUT_INTRO[introI]||TUT_INTRO[0];
  tutShow({txt,sel,block:1,skip:1,i:introI+1,n:TUT_INTRO.length,ok:()=>{introI++;if(introI>=TUT_INTRO.length){introI=0;tutMark('intro')}}});return;
 }
 const pk=curPane();
 if(tipPending()){
  const sel=$('subtabs').style.display!=='none'?'#subtabs':'#p-'+tab;
  tutShow({txt:'tp_'+pk,sel,skip:!old,still:()=>curPane()===pk,ok:()=>tutMark('p_'+pk)});return;
 }
 for(const g of TUT_GOALS){
  if((old&&!g.all)||tutHas('tg_'+g.k)||tutHas('p_'+g.p))continue;
  let ok=false;try{ok=g.c()}catch(e){}
  if(!ok)continue;
  const inG=groupOf(tab)===g.tab,sel=inG?`#subtabs button[data-s="${g.p}"]`:tabBtn(g.tab);
  tutShow({txt:'tg_'+g.k,sel,skip:!old,still:()=>(groupOf(tab)===g.tab)===inG&&curPane()!==g.p&&!tipPending(),ok:()=>tutMark('tg_'+g.k)});return;
 }
}
function tutRestart(){tutLocal.clear();introI=0;api('tut',{reset:true}).then(()=>{toast(T('tut_restarted'));tab='hero';document.querySelector(tabBtn('hero')).click()}).catch(e=>toast(errT(e)))}
// новина з бота: показуємо один раз
function newsHtml(s){return esc(s).replace(/&lt;(\/?)(b|i)&gt;/g,'<$1$2>').replace(/\n/g,'<br>')}
function showNews(n){
 if(!n||n.id===newsShown)return;newsShown=n.id;
 modal(`<h3>${T('news_t')}</h3><div class="newsb">${newsHtml(n[LANG]||n.en)}</div>`,T('tut_ok'),()=>api('newsSeen',{id:n.id}).catch(()=>{}));
}
setInterval(tutCheck,500);addEventListener('resize',()=>tutPlace());addEventListener('scroll',()=>tutPlace(),true);

// ---------- старт ----------
function boot(msg,retry){
 let e=$('boot');if(!e){e=document.createElement('div');e.id='boot';e.className='modal show';document.body.appendChild(e)}
 if(!msg){e.remove();return}
 e.innerHTML=`<div class="mbox"><div class="big">🔥</div><h3>Grimtale</h3><p>${msg}</p>${retry?`<div class="row"><button class="btn pri" id="bootR">${T('retry')}</button></div>`:''}</div>`;
 if(retry)$('bootR').onclick=start;
}
let syncing=false;
async function sync(){if(syncing||busy||B.rep||!G)return;syncing=true;try{const r=await api('sync');afterSync(r)}catch(e){if(e.message==='auth')boot(ERR.auth)}finally{syncing=false}}
async function start(){
 applyLang();
 const w=tg();
 if(w){try{w.ready();w.expand();w.setHeaderColor&&w.setHeaderColor('#19161d');w.setBackgroundColor&&w.setBackgroundColor('#0e0c10')}catch(e){}}
 if(!w&&!DEV){boot(T('only_tg'));return}
 boot(T('loading'));
 try{const r=await api('sync');boot();B.hp=H.hp;spawn();flush();renderSub();afterSync(r)}
 catch(e){boot(errT(e),true)}
}
// головні вкладки й підвкладки
const lastSub={hero:'hero',arena:'arena',bag:'bag'};
const groupOf=t=>['hero','pet','train','log','prof'].includes(t)?'hero':t==='top'?'arena':t==='market'?'bag':t;
function setScene(){const g=groupOf(tab),sc=g==='forge'||g==='clan'?g:'';if(sc)document.body.dataset.scene=sc;else delete document.body.dataset.scene;const b=$('scene');if(sc){b.innerHTML=`<div class="sc-ic">${sc==='forge'?'⚒️':'🏰'}</div><div><b>${T(sc==='forge'?'scene_forge':'scene_clan')}</b><span>${T(sc==='forge'?'scene_forge_s':'scene_clan_s')}</span></div>`}}
function showPane(){document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('act',p.id==='p-'+tab));dirty[tab]=1;flush();renderSub()}
function renderSub(){
 setScene();
 const g=groupOf(tab),e=$('subtabs');
 const items=g==='hero'?[['hero','sub_eq'],['pet','sub_pet'],['train','sub_train'],['log','sub_log'],['prof','sub_prof']]:g==='arena'?[['arena','sub_pvp'],['top','sub_top']]:g==='bag'?[['bag','sub_bag'],['market','sub_market']]:g==='forge'?['res','gem','ench','myth','ast'].map(k=>[k,'sub_'+k]):null;
 if(!items){e.style.display='none';return}
 const cur=g==='forge'?fsub:tab;e.style.display='flex';
 e.innerHTML=items.map(([k,l])=>`<button data-s="${k}" class="${k===cur?'act':''}">${T(l)}</button>`).join('');
 e.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=b.dataset.s;if(g==='forge'){fsub=k;dirty.forge=1}else{tab=k;lastSub[g]=k}showPane()});
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{const g=b.dataset.t;tab=lastSub[g]||g;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('act',x===b));showPane()});
$('prev').onclick=()=>{if(G.stage>1)act('stage',{s:G.stage-1},()=>{B.m=null;B.resp=0.1})};
$('next').onclick=()=>{if(G.stage<G.maxStage)act('stage',{s:G.stage+1},()=>{B.m=null;B.resp=0.1})};
$('bossBtn').onclick=()=>{if(G.kills>=WAVES&&!B.rep){
 if(busy)return;busy=true;renderBoss();
 api('boss').then(r=>startReplay(r.out)).catch(e=>toast(errT(e))).finally(()=>{busy=false;renderBoss();paintArena()})}};
$('autoBtn').onclick=()=>act('settings',{autoBoss:!G.autoBoss});

let lt=performance.now();
setInterval(()=>{const n=performance.now();let dt=Math.min(1,(n-lt)/1000);lt=n;
 while(dt>0){const s=Math.min(dt,0.1);tick(s);dt-=s}
 if(G){renderTop();if(dirty[tab])flush()}},100);
setInterval(sync,SYNC_MS);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){lt=performance.now();sync()}});
window.__G=()=>G;window.__B=B;
start();
})();
