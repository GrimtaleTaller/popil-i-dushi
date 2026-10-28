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
const SLOT={
 weapon:{n:'Зброя',ic:'🗡️',names:['Іржавий меч','Кістяна сокира','Чорний клинок','Булава ката','Серп жнеця']},
 helmet:{n:'Шолом',ic:'🪖',names:['Шолом вартового','Залізний капюшон','Рогатий шолом','Корона з кісток']},
 armor:{n:'Обладунок',ic:'🛡️',names:['Шкіряна куртка','Кольчуга','Латний нагрудник','Мантія попелу']},
 boots:{n:'Чоботи',ic:'👢',names:['Стоптані чоботи','Поножі мисливця','Сталеві чоботи','Чоботи тіні']},
 ring:{n:'Перстень',ic:'💍',names:['Мідний перстень','Перстень крові','Перстень вовка','Печатка мертвих']},
 amulet:{n:'Амулет',ic:'📿',names:['Амулет з ікла','Оберіг відьми','Око безодні','Серце попелу']}
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
const mobHp=s=>25*Math.pow(1.25,s-1),mobAtk=s=>4*Math.pow(1.19,s-1),mobGold=s=>4*Math.pow(1.17,s-1),mobXp=s=>6*Math.pow(1.14,s-1);
const xpNeed=l=>Math.floor(25*Math.pow(1.2,l-1));
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
 Object.keys(dirty).forEach(k=>dirty[k]=1);renderBoss();paintArena();
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
  if(res.win){deathFx();haptic('heavy');toast(T('boss_win')+' +💰'+fmt(res.gold)+(res.souls?' +🔮'+res.souls:'')+(res.cat?' +🧪':'')+(res.ash?' +⚱️'+res.ash:''));B.m=null;B.resp=0.8}
  else{B.dead=2.5;$('dead').style.display='grid';toast(T(res.timeout?'boss_timeout':'boss_lose'));B.m=null}
  R.after&&R.after();renderBoss();paintArena();
 }
}

// ---------- UI ----------
const dirty={hero:1,bag:1,forge:1,dng:1,train:1,log:1};
let tab='hero';
let tt;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),1800)}
const power=h=>h.power;
function itemScore(it){return(it.st.atk||0)*2+(it.st.hp||0)*0.25+(it.st.def||0)*1.5+(it.st.crit||0)*0.03*H.atk}
function renderTop(){
 if(!G)return;
 const gold=G.gold+pend.gold;let xp=G.xp+pend.xp;
 $('lvl').textContent=G.lvl;$('gold').textContent=fmt(gold);$('souls').textContent=fmt(G.souls||0);$('pw').textContent=T('power',{n:fmt(power(H))});
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
   (it?`<div class="it" style="color:${RAR[it.r].c}">${itemName(it)}</div><div class="sn">${T('lvl',{n:it.il})}</div>`:`<div class="sn" style="margin-top:6px">${T('empty_slot')}</div>`)+'</div>'}
 h+=`</div><div class="stats">
  <div><span>${STATN.atk}</span><b>${fmt(H.atk)}</b></div><div><span>${STATN.hp}</span><b>${fmt(H.hp)}</b></div>
  <div><span>${STATN.def}</span><b>${fmt(H.def)}</b></div><div><span>${T('crit_chance')}</span><b>${H.crit.toFixed(1)}%</b></div>
  <div><span>${T('max_stage')}</span><b>${G.maxStage}</b></div><div><span>${T('kills')}</span><b>${fmt(G.tot.kills)}</b></div>
  <div><span>${T('bosses')}</span><b>${G.tot.bosses}</b></div><div><span>${T('deaths')}</span><b>${G.tot.deaths}</b></div>
  <div><span>${T('ench')}</span><b>+${Math.round((G.ench||0)*V.forge.enchStep*100)}%</b></div><div><span>${T('souls_h')}</span><b>${fmt(V.forge.soulsPerHour)}</b></div></div>
  <p class="hint">${T('hero_hint')}</p>
  <div class="card"><h4>🌐 ${T('lang')}</h4><div class="chips">${LANGS.map(l=>`<button data-lang="${l}" class="${l===LANG?'act':''}">${{uk:'Українська',en:'English',ru:'Русский'}[l]}</button>`).join('')}</div></div>`;
 $('p-hero').innerHTML=h;$('invBtn').onclick=invite;$('bestBtn').onclick=()=>act('equipBest',{},r=>toast(r.out.n?T('equipped_n',{n:r.out.n}):T('all_best')));
 $('p-hero').querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
}
let bagFilter='all';
function chestCount(){return Object.values(G.chests||{}).reduce((a,b)=>a+b,0)}
function renderBag(){
 const cc=chestCount();
 let h=(cc?`<div class="chestbar">🎁<span>${T('chests',{n:cc})}</span><button class="btn pri" id="openC">${T('open')}</button></div>`:'')+`<div class="filter">${['all',...SLOTS].map(f=>`<button data-f="${f}" class="${bagFilter===f?'act':''}">${f==='all'?T('all'):SLOT[f].ic+' '+SLOT[f].n}</button>`).join('')}</div>
 <div class="row" style="margin-top:0;margin-bottom:10px"><button class="btn" id="sellC">${T('sell_common')}</button><button class="btn" id="sellW">${T('sell_worse')}</button><button class="btn ${G.autoSell?'pri':''}" id="autoS">${T('autosell',{s:T(G.autoSell?'yes':'no')})}</button></div>
 <div class="hint">${T('items_n',{n:G.inv.length,m:INV_MAX})}</div>`;
 const list=G.inv.filter(i=>bagFilter==='all'||i.slot===bagFilter);
 if(!list.length)h+=`<div class="empty">${T('bag_empty')}</div>`;
 for(const it of list){const eq=G.eq[it.slot],better=!eq||itemScore(it)>itemScore(eq);
  h+=`<div class="item" style="border-left-color:${RAR[it.r].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info">
   <div class="nm" style="color:${RAR[it.r].c}">${it.nw?'🆕 ':''}${itemName(it)}</div><div class="sub">${RAR[it.r].n} · ${SLOT[it.slot].n} · ${T('lvl',{n:it.il})}${better?` · <span class="up">${T('better')}</span>`:''}</div>
   <div class="st">${statLine(it.st,eq?eq.st:{})}</div></div>
   <div class="acts"><button class="btn pri" data-eq="${it.id}">${T('equip')}</button><button class="btn" data-sell="${it.id}">💰${fmt(sellPrice(it))}</button>${it.r<4?`<button class="btn" data-dis="${it.id}">⚒️ ${G.dismode==='xp'?'✨':'🔩'}</button>`:''}</div></div>`}
 $('p-bag').innerHTML=h;
 if(cc)$('openC').onclick=()=>act('openChests',{},r=>{toast(T('opened',{n:r.out.n})+(r.out.best>=3?' · '+RAR[r.out.best].n+'!':''));if(r.out.best>=3)haptic('heavy')});
 if(G.inv.some(i=>i.nw)){G.inv.forEach(i=>delete i.nw);api('seen').catch(()=>{})}
 $('p-bag').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{bagFilter=b.dataset.f;renderBag()});
 $('p-bag').querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>act('equip',{id:+b.dataset.eq},()=>haptic('light')));
 $('p-bag').querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>sell([+b.dataset.sell]));
 $('p-bag').querySelectorAll('[data-dis]').forEach(b=>b.onclick=()=>dismantle([+b.dataset.dis]));
 $('sellC').onclick=()=>sell(G.inv.filter(i=>i.r===0).map(i=>i.id));
 $('sellW').onclick=()=>sell(G.inv.filter(i=>G.eq[i.slot]&&itemScore(i)<=itemScore(G.eq[i.slot])).map(i=>i.id));
 $('autoS').onclick=()=>act('settings',{autoSell:!G.autoSell});
}
function disMsg(o){return T('dismantled',{n:o.n})+(o.shards?' · +🔩'+fmt(o.shards):'')+(o.xp?' · +✨'+fmt(o.xp):'')}
function dismantle(ids){act('dismantle',{ids,mode:G.dismode},r=>toast(disMsg(r.out)))}
function sell(ids){if(!ids.length){toast(T('nothing_sell'));return}act('sell',{ids},r=>toast(T('sold',{g:fmt(r.out.gold)})))}
let mSlot=null,mN=3,fsub='res';
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
  <div><span>${T('ess')}</span><b>${G.ess||0}</b></div><div><span>${T('mats')}</span><b>${MATN.map((x,i)=>x+':'+fmt((G.mats||[])[i]||0)).join(' ')}</b></div></div>
  <p class="hint">${T('forge_hint',{r:fmt(F.soulsPerHour)})}</p></div>`;
 if(fsub==='res')h+=`<div class="card"><h4>${T('dis_title')}</h4>
  <div class="chips"><button data-dm="shards" class="${G.dismode!=='xp'?'act':''}">${T('to_shards')}</button><button data-dm="xp" class="${G.dismode==='xp'?'act':''}">${T('to_xp')}</button></div>
  <div class="row"><button class="btn pri" id="disJunk" ${F.junk?'':'disabled'}>${T('dis_junk',{n:F.junk})}</button></div>
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
  ${myths.length?myths.map(it=>{const so=Math.round(400+it.il*12),ok=G.cat>=A.cat&&(G.ess||0)>=A.ess&&G.souls>=so;return `<div class="item" style="border-left-color:${RAR[5].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info"><div class="nm" style="color:${RAR[5].c}">${itemName(it)}</div><div class="sub">${T('lvl',{n:it.il})} · 🔮${fmt(so)}${SLOTS.some(s=>G.eq[s]&&G.eq[s].id===it.id)?' · '+T('equipped'):''}</div></div><div class="acts"><button class="btn pri" data-ast="${it.id}" ${ok?'':'disabled'}>✦ ${F.astChance}%</button></div></div>`}).join(''):`<p class="hint">${T('first_myth')}</p>`}</div>`;
 $('p-forge').innerHTML=h;
 $('p-forge').querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{G.dismode=b.dataset.dm;renderForge();dirty.bag=1});
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
function renderDng(){
 const D=V.dng,tr=T;
 let h=`<p class="hint" style="margin-top:0">${T('dng_hint',{r:D.rooms})}</p>`;
 if(G.maxStage<D.unlockStage)h+=`<div class="empty">${T('dng_unlock',{n:D.unlockStage})}</div>`;
 for(const T of D.tiers){const d=DNG[T.t-1],rw=T.rw,e=T.est;
  const ec=e==null?'':e>=80?'#56c271':e>=40?'#f2c14e':'#e0484e';
  h+=`<div class="dcard ${T.open?'':'lock'}"><div class="th" style="background-image:url(${IMG('bg'+d.bg)})"><b>${ROMAN[T.t-1]||'I'}</b></div><div class="info">
   <div class="nm">${d.n} <span class="sub">· ${tr('tier',{n:T.t})}</span></div>
   <div class="rw">🎁×${rw.chests} (${tr('lvl',{n:rw.chestIl})}) · ⛏️${MATN[rw.mat]}×${rw.matN} · 🔮${rw.souls}${rw.catChance?' · 🧪'+Math.round(rw.catChance*100)+'%':''}${rw.essChance?' · ✦'+Math.round(rw.essChance*100)+'%':''}</div>
   ${T.open?`<div class="sub">${tr('dng_chance')} <span class="est" style="color:${ec}">~${e}%</span></div>
   <button class="btn pri" data-dng="${T.t}" ${busy||(!T.keys&&G.gold<T.price)?'disabled':''}>${T.keys?tr('enter_key',{n:T.keys}):tr('enter',{p:fmt(T.price)})}</button>`:`<div class="sub">${G.maxStage<D.unlockStage?tr('stage',{n:D.unlockStage}):tr('need_tier',{n:T.t-1})}</div>`}
  </div></div>`}
 $('p-dng').innerHTML=h;
 $('p-dng').querySelectorAll('[data-dng]').forEach(b=>b.onclick=()=>act('dungeon',{t:+b.dataset.dng},r=>dngResult(r.out)));
}
function dngResult(o){
 const d=DNG[o.t-1],g=o.gain;
 const rows=o.rooms.map((x,i)=>`<div><span>${x.boss?T('boss'):T('room',{n:i+1})}</span><b style="color:${x.win?'#56c271':'#e0484e'}">${x.win?'✓':'✗'} ❤️${x.hpLeft}%</b></div>`).join('');
 const rw=[g.chests?`${T('r_chests')} <b>${g.chests}</b>`:'',g.matN?`${T('r_mat',{m:MATN[g.mat]})} <b>${g.matN}</b>`:'',g.souls?`${T('r_souls')} <b>+${g.souls}</b>`:'',g.cat?`${T('r_cat')} <b>+1</b>`:'',g.ess?`<span style="color:${RAR[6].c}">${T('r_ess')} <b>+1</b></span>`:''].filter(Boolean).map(x=>`<p>${x}</p>`).join('');
 modal(`<div class="big">${o.full?'🏆':'💀'}</div><h3>${d.n}: ${T(o.full?'dng_win':'dng_lose')}</h3><div class="rooms">${rows}</div>${rw||`<p class="hint">${T('no_reward')}</p>`}${g.chests?`<p class="hint">${T('chests_in_bag')}</p>`:''}`,T('ok'));
 document.querySelectorAll('.rooms div').forEach((e,i)=>setTimeout(()=>e.classList.add('show'),250+i*350));
 haptic(o.full?'heavy':'medium');
}
function renderTrain(){
 let h='';for(const u of UPG){const l=G.up[u.k],mx=u.max&&l>=u.max;
  h+=`<div class="upg"><div class="ic">${u.ic}</div><div class="info"><b>${u.n} · ${T('lvl',{n:l})}</b><span>${u.d}: ${u.k==='crit'?u.val(l).toFixed(1)+'%':fmt(u.val(l))}${mx?'':' → '+(u.k==='crit'?u.val(l+1).toFixed(1)+'%':fmt(u.val(l+1)))}</span></div>
  <button class="btn pri" data-up="${u.k}" ${mx?'disabled':''}>${mx?T('max'):'💰 '+fmt(u.cost(l))}</button></div>`}
 h+=`<p class="hint">${T('train_hint')}</p>`;
 $('p-train').innerHTML=h;
 $('p-train').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>act('upgrade',{k:b.dataset.up},()=>haptic('light')));renderTrainBtns();
}
function renderTrainBtns(){$('p-train').querySelectorAll('[data-up]').forEach(b=>{const u=UPG.find(x=>x.k===b.dataset.up);const l=G.up[u.k];if(!(u.max&&l>=u.max))b.disabled=busy||G.gold<u.cost(l)})}
const LOGT={
 start:()=>T('log_start'),
 lvl:a=>T('log_lvl',{n:a[0]}),
 loot:a=>`<span style="color:${RAR[a[0]].c}">${SLOT[a[1]].ic} ${RAR[a[0]].n}: ${SLOT[a[1]].names[a[2]]||''}</span>`,
 bagfull:()=>T('log_bagfull'),
 offline:a=>T('log_offline',{h:Math.floor(a[0]/3600),m:Math.floor(a[0]%3600/60),g:fmt(a[1]),i:a[2]})+(a[3]?', +'+a[3]+' 🔮':''),
 boss:a=>T('log_boss',{s:a[0],g:fmt(a[1])}),
 bossDeath:a=>T('log_bossDeath',{s:a[0]}),
 bossTimeout:a=>T('log_bossTimeout',{s:a[0]}),
 daily:a=>T('log_daily',{n:a[0]}),
 dis:a=>T('log_dis',{n:a[0],v:fmt(a[1])+' '+(a[2]==='xp'?'✨':'🔩')}),
 ench:a=>T('log_ench',{n:a[0]}),
 dng:a=>T('log_dng',{d:DNG[a[0]-1].n,r:T(a[1]?'log_dng_ok':'log_dng_fail'),c:a[2]}),
 astral:a=>a[0]?`<span style="color:${RAR[6].c}">${T('log_ast_ok',{s:SLOT[a[1]].n})}</span>`:T('log_ast_fail',{c:a[2]}),
 myth:a=>a[0]?`<span style="color:${RAR[5].c}">${T('log_myth_ok',{s:SLOT[a[1]].n})}</span>`:T('log_myth_fail',{c:a[2]})
};
function renderLog(){$('p-log').innerHTML='<div class="log">'+(G.log.length?G.log.map(e=>{const d=new Date(e.t);return `<div><b>${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</b> ${(LOGT[e.k]||(()=>e.k))(e.a||[])}</div>`}).join(''):`<div class="empty">${T('log_empty')}</div>`)+'</div>'}
function flush(){if(G&&dirty[tab]){dirty[tab]=0;({hero:renderHero,bag:renderBag,forge:renderForge,dng:renderDng,train:renderTrain,log:renderLog})[tab]()}}

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
 if(p&&p.offline&&p.sec>=60&&p.kills>0){const h=Math.floor(p.sec/3600),m=Math.floor(p.sec%3600/60);
  modal(`<div class="big">🌙</div><h3>${T('away')}</h3><p>${T('away_line',{t:(h?T('hours',{n:h})+' ':'')+T('mins',{n:m}),s:p.stage})}</p><p>${T('p_killed')} <b>${fmt(p.kills)}</b></p><p>${T('p_gold')} <b>+${fmt(p.gold)}</b></p><p>${T('p_xp')} <b>+${fmt(p.xp)}</b></p>${p.souls?`<p>${T('p_souls')} <b>+${fmt(p.souls)}</b></p>`:''}${p.items?`<p>${T('p_items')} <b>${p.items}</b></p>`:''}`,T('claim'))}
 if(p&&p.boss&&!B.rep)startReplay(p.boss);
 const d=V.daily;
 if(d&&dailyShown!==String(G.daily.date)+d.streak){dailyShown=String(G.daily.date)+d.streak;
  let days='';for(let i=1;i<=7;i++)days+=`<div class="${i<d.streak?'got':i===d.streak?'now':''}">${T('day',{n:i})}<br>${i===7?'🎁':'💰'}</div>`;
  modal(`<div class="big">🎁</div><h3>${T('daily_title')}</h3><div class="days">${days}</div><p>${T('today')} <b>💰 ${fmt(d.gold)}</b>${d.epic?' + <b style="color:'+RAR[3].c+'">'+T('epic_item')+'</b>':''}</p><p class="hint">${T('daily_hint')}</p>`,T('claim'),()=>act('daily',{},r=>toast('+💰'+fmt(r.out.gold))))}
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
const lastSub={hero:'hero'};
const groupOf=t=>['hero','train','log'].includes(t)?'hero':t;
function showPane(){document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('act',p.id==='p-'+tab));dirty[tab]=1;flush();renderSub()}
function renderSub(){
 const g=groupOf(tab),e=$('subtabs');
 const items=g==='hero'?[['hero','sub_eq'],['train','sub_train'],['log','sub_log']]:g==='forge'?['res','ench','myth','ast'].map(k=>[k,'sub_'+k]):null;
 if(!items){e.style.display='none';return}
 const cur=g==='hero'?tab:fsub;e.style.display='flex';
 e.innerHTML=items.map(([k,l])=>`<button data-s="${k}" class="${k===cur?'act':''}">${T(l)}</button>`).join('');
 e.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=b.dataset.s;if(g==='hero'){tab=k;lastSub.hero=k}else{fsub=k;dirty.forge=1}showPane()});
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{const g=b.dataset.t;tab=g==='hero'?lastSub.hero:g;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('act',x===b));showPane()});
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
