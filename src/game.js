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
const errT=e=>ERR[e.message]||('Помилка: '+e.message);

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
 $('stg').textContent='Етап '+st;$('reg').textContent=r.n+(tier?' '+ROMAN[tier]:'');
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
  if(res.win){deathFx();haptic('heavy');toast('👑 Бос переможений! +💰'+fmt(res.gold)+(res.souls?' +🔮'+res.souls:'')+(res.cat?' +🧪':'')+(res.ash?' +⚱️'+res.ash:''));B.m=null;B.resp=0.8}
  else{B.dead=2.5;$('dead').style.display='grid';toast(res.timeout?'⏳ Час вийшов — бос утік':'💀 Бос сильніший. Прокачайся!');B.m=null}
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
 $('lvl').textContent=G.lvl;$('gold').textContent=fmt(gold);$('souls').textContent=fmt(G.souls||0);$('pw').textContent='Сила '+fmt(power(H));
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
 if(B.rep){b.textContent='⚔️ Бій з босом!';b.disabled=true;b.classList.remove('ready')}
 else if(!atTop){b.textContent='✓ Етап пройдено — фарм';b.disabled=true;b.classList.remove('ready')}
 else if(G.kills>=WAVES){b.textContent='⚔️ Викликати боса';b.disabled=busy;b.classList.add('ready')}
 else if(!V.canFarm){b.textContent='💀 Тут занадто важко';b.disabled=true;b.classList.remove('ready')}
 else{b.textContent='⚔️ Бос: '+k+'/'+WAVES;b.disabled=true;b.classList.remove('ready')}
 const a=$('autoBtn');a.textContent='Авто-бос: '+(G.autoBoss?'увімк':'вимк');a.classList.toggle('on',G.autoBoss);
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
 const link=inviteLink(),text='Приєднуйся до Grimtale — темна казкова RPG у Telegram!';
 const w=tg();
 if(w&&w.openTelegramLink){w.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(text));return}
 try{navigator.clipboard.writeText(link);toast('Посилання скопійовано')}catch(e){toast(link)}
}
function renderHero(){
 let h='<div class="row" style="margin:0 0 10px"><button class="btn pri" id="bestBtn">Одягнути найкраще</button><button class="btn" id="invBtn">👥 Запросити друга</button></div><div class="slots">';
 for(const s of SLOTS){const it=G.eq[s];
  h+=`<div class="slot" ${it?`style="border-color:${RAR[it.r].c}66"`:''}><div class="ic">${SLOT[s].ic}</div><div class="sn">${SLOT[s].n}</div>`+
   (it?`<div class="it" style="color:${RAR[it.r].c}">${itemName(it)}</div><div class="sn">ур. ${it.il}</div>`:'<div class="sn" style="margin-top:6px">порожньо</div>')+'</div>'}
 h+=`</div><div class="stats">
  <div><span>Атака</span><b>${fmt(H.atk)}</b></div><div><span>Здоров’я</span><b>${fmt(H.hp)}</b></div>
  <div><span>Захист</span><b>${fmt(H.def)}</b></div><div><span>Шанс криту</span><b>${H.crit.toFixed(1)}%</b></div>
  <div><span>Макс. етап</span><b>${G.maxStage}</b></div><div><span>Вбито</span><b>${fmt(G.tot.kills)}</b></div>
  <div><span>Босів</span><b>${G.tot.bosses}</b></div><div><span>Смертей</span><b>${G.tot.deaths}</b></div>
  <div><span>Заточка</span><b>+${Math.round((G.ench||0)*V.forge.enchStep*100)}%</b></div><div><span>Душі/год</span><b>${fmt(V.forge.soulsPerHour)}</b></div></div>
  <p class="hint">Герой б’ється сам, навіть коли гра закрита (до 8 годин, офлайн удвічі повільніше). Пройди 10 ворогів на етапі — і виклич боса, щоб відкрити наступний.</p>`;
 $('p-hero').innerHTML=h;$('invBtn').onclick=invite;$('bestBtn').onclick=()=>act('equipBest',{},r=>toast(r.out.n?'Одягнуто предметів: '+r.out.n:'Усе найкраще вже на тобі'));
}
let bagFilter='all';
function chestCount(){return Object.values(G.chests||{}).reduce((a,b)=>a+b,0)}
function renderBag(){
 const cc=chestCount();
 let h=(cc?`<div class="chestbar">🎁<span>Скрині: ${cc}</span><button class="btn pri" id="openC">Відкрити</button></div>`:'')+`<div class="filter">${['all',...SLOTS].map(f=>`<button data-f="${f}" class="${bagFilter===f?'act':''}">${f==='all'?'Усе':SLOT[f].ic+' '+SLOT[f].n}</button>`).join('')}</div>
 <div class="row" style="margin-top:0;margin-bottom:10px"><button class="btn" id="sellC">Продати звичайні</button><button class="btn" id="sellW">Продати гірші</button><button class="btn ${G.autoSell?'pri':''}" id="autoS">Авто-продаж звич.: ${G.autoSell?'так':'ні'}</button></div>
 <div class="hint">${G.inv.length}/${INV_MAX} предметів</div>`;
 const list=G.inv.filter(i=>bagFilter==='all'||i.slot===bagFilter);
 if(!list.length)h+='<div class="empty">Тут поки порожньо. Лут падає з ворогів (12%) і завжди з босів.</div>';
 for(const it of list){const eq=G.eq[it.slot],better=!eq||itemScore(it)>itemScore(eq);
  h+=`<div class="item" style="border-left-color:${RAR[it.r].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info">
   <div class="nm" style="color:${RAR[it.r].c}">${it.nw?'🆕 ':''}${itemName(it)}</div><div class="sub">${RAR[it.r].n} · ${SLOT[it.slot].n} · ур. ${it.il}${better?' · <span class="up">краще</span>':''}</div>
   <div class="st">${statLine(it.st,eq?eq.st:{})}</div></div>
   <div class="acts"><button class="btn pri" data-eq="${it.id}">Одягти</button><button class="btn" data-sell="${it.id}">💰${fmt(sellPrice(it))}</button>${it.r<4?`<button class="btn" data-dis="${it.id}">⚒️ ${G.dismode==='xp'?'✨':'🔩'}</button>`:''}</div></div>`}
 $('p-bag').innerHTML=h;
 if(cc)$('openC').onclick=()=>act('openChests',{},r=>{toast('🎁 Відкрито: '+r.out.n+(r.out.best>=3?' · '+RAR[r.out.best].n+'!':''));if(r.out.best>=3)haptic('heavy')});
 if(G.inv.some(i=>i.nw)){G.inv.forEach(i=>delete i.nw);api('seen').catch(()=>{})}
 $('p-bag').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{bagFilter=b.dataset.f;renderBag()});
 $('p-bag').querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>act('equip',{id:+b.dataset.eq},()=>haptic('light')));
 $('p-bag').querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>sell([+b.dataset.sell]));
 $('p-bag').querySelectorAll('[data-dis]').forEach(b=>b.onclick=()=>dismantle([+b.dataset.dis]));
 $('sellC').onclick=()=>sell(G.inv.filter(i=>i.r===0).map(i=>i.id));
 $('sellW').onclick=()=>sell(G.inv.filter(i=>G.eq[i.slot]&&itemScore(i)<=itemScore(G.eq[i.slot])).map(i=>i.id));
 $('autoS').onclick=()=>act('settings',{autoSell:!G.autoSell});
}
function disMsg(o){return '⚒️ Розібрано: '+o.n+(o.shards?' · +🔩'+fmt(o.shards):'')+(o.xp?' · +✨'+fmt(o.xp):'')}
function dismantle(ids){act('dismantle',{ids,mode:G.dismode},r=>toast(disMsg(r.out)))}
function sell(ids){if(!ids.length){toast('Нічого продавати');return}act('sell',{ids},r=>toast('Продано за 💰'+fmt(r.out.gold)))}
let mSlot=null,mN=3;
function renderForge(){
 const F=V.forge,legs=s=>G.inv.filter(i=>i.r===4&&i.slot===s);
 if(!mSlot||!legs(mSlot).length)mSlot=SLOTS.find(s=>legs(s).length>=3)||SLOTS.find(s=>legs(s).length)||'weapon';
 const L=legs(mSlot),maxN=Math.min(12,L.length),need=F.myth.need;
 mN=Math.max(need,Math.min(mN,Math.max(need,maxN)));
 const extra=Math.max(0,mN-need),fails=G.mythFails||0,chance=Math.min(F.myth.cap,F.myth.base+F.myth.extra*extra+F.myth.fail*fails);
 const il=L.length?Math.max(...L.slice(0,mN).map(i=>i.il)):0,souls=Math.round(150+il*5);
 const ec=F.ench,legAll=G.inv.filter(i=>i.r===4).length,eMax=G.ench>=F.enchMax;
 let h=`<div class="card"><h4>Ресурси</h4><div class="resg">
  <div><span>🔮 Душі</span><b>${fmt(G.souls)}</b></div><div><span>⚱️ Попіл</span><b>${fmt(G.ash)}</b></div>
  <div><span>🔩 Уламки</span><b>${fmt(G.shards)}</b></div><div><span>🧪 Каталізатори</span><b>${G.cat}</b></div>
  <div><span>✦ Ес. астралу</span><b>${G.ess||0}</b></div><div><span>⛏️ Матеріали</span><b>${MATN.map((x,i)=>x+':'+fmt((G.mats||[])[i]||0)).join(' ')}</b></div></div>
  <p class="hint">Душі накопичуються самі: ${fmt(F.soulsPerHour)}/год (росте з рівнем і за кожен надітий міфік +6%). Каталізатори падають з босів, Попіл — за першу перемогу над босом регіону.</p></div>`;
 h+=`<div class="card"><h4>⚒️ Розбирання</h4>
  <div class="chips"><button data-dm="shards" class="${G.dismode!=='xp'?'act':''}">🔩 На уламки</button><button data-dm="xp" class="${G.dismode==='xp'?'act':''}">✨ На досвід</button></div>
  <div class="row"><button class="btn pri" id="disJunk" ${F.junk?'':'disabled'}>Розібрати непотрібне (${F.junk})</button></div>
  <p class="hint">Непотрібне — гірше за надіте, крім легендарних і міфічних. Окремий предмет можна розібрати в Сумці кнопкою ⚒️.</p></div>`;
 h+=`<div class="card"><h4>✨ Заточка · ур. ${G.ench}/${F.enchMax}</h4>
  <p class="hint">Кожен рівень: +${Math.round(F.enchStep*100)}% до характеристик усього надітого спорядження. Зараз: +${Math.round(G.ench*F.enchStep*100)}%.</p>
  ${eMax?'<p>Максимум досягнуто</p>':`<p class="hint">Ціна: 1 легендарка (є ${legAll}) · 🔩 ${fmt(ec.shards)} · 💰 ${fmt(ec.gold)}</p>
  <div class="row"><button class="btn pri" id="ench" ${legAll&&G.shards>=ec.shards&&G.gold>=ec.gold?'':'disabled'}>Заточити → ур. ${G.ench+1}</button></div>`}</div>`;
 h+=`<div class="card"><h4><span style="color:${RAR[5].c}">◆</span> Крафт міфічного</h4>
  <div class="chips">${SLOTS.map(s=>`<button data-ms="${s}" class="${s===mSlot?'act':''}">${SLOT[s].ic} ${legs(s).length}</button>`).join('')}</div>
  <p class="hint">${SLOT[mSlot].n}: легендарок ${L.length}. Потрібно ${need} одного слота + 🧪1 + 🔮${fmt(souls)}.</p>
  <div class="step"><button class="btn" id="mMinus">−</button><b>На ковадлі ${Math.min(mN,L.length)}/${need}</b><button class="btn" id="mPlus">+</button></div>
  <p class="hint">Шанс <b style="color:#fff">${chance}%</b> = база ${F.myth.base}% · лишні +${F.myth.extra*extra}% · невдачі +${F.myth.fail*fails}% (макс. ${F.myth.cap}%). При невдачі згорають лише лишні, основні ${need} лишаються.</p>
  <div class="row"><button class="btn pri" id="myth" ${L.length>=need&&G.cat>=1&&G.souls>=souls?'':'disabled'}>Кувати · ${chance}%</button></div></div>`;
 const myths=[...SLOTS.map(s=>G.eq[s]).filter(i=>i&&i.r===5),...G.inv.filter(i=>i.r===5)],A=F.ast;
 h+=`<div class="card"><h4><span style="color:${RAR[6].c}">✦</span> Астрал</h4>
  <p class="hint">Міфічний предмет стає астральним (×1,5 до характеристик). Ціна: 🧪${A.cat} + ✦${A.ess} + Душі. Шанс <b style="color:#fff">${F.astChance}%</b> (+${A.fail}% за кожну невдачу, макс. ${A.cap}%). При невдачі предмет лишається.</p>
  ${myths.length?myths.map(it=>{const so=Math.round(400+it.il*12),ok=G.cat>=A.cat&&(G.ess||0)>=A.ess&&G.souls>=so;return `<div class="item" style="border-left-color:${RAR[5].c}"><div class="ic">${SLOT[it.slot].ic}</div><div class="info"><div class="nm" style="color:${RAR[5].c}">${itemName(it)}</div><div class="sub">ур. ${it.il} · 🔮${fmt(so)}${SLOTS.some(s=>G.eq[s]&&G.eq[s].id===it.id)?' · надіто':''}</div></div><div class="acts"><button class="btn pri" data-ast="${it.id}" ${ok?'':'disabled'}>✦ ${F.astChance}%</button></div></div>`}).join(''):'<p class="hint">Спершу скуй міфічний предмет.</p>'}</div>`;
 $('p-forge').innerHTML=h;
 $('p-forge').querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>{G.dismode=b.dataset.dm;renderForge();dirty.bag=1});
 $('disJunk').onclick=()=>act('dismantleJunk',{mode:G.dismode},r=>toast(disMsg(r.out)));
 const eb=$('ench');if(eb)eb.onclick=()=>act('enchant',{},r=>{toast('✨ Заточка: ур. '+r.out.ench);haptic('heavy')});
 $('p-forge').querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{mSlot=b.dataset.ms;mN=need;renderForge()});
 $('mMinus').onclick=()=>{mN=Math.max(need,mN-1);renderForge()};
 $('mPlus').onclick=()=>{mN=Math.min(Math.max(need,maxN),mN+1);renderForge()};
 $('p-forge').querySelectorAll('[data-ast]').forEach(b=>b.onclick=()=>act('astral',{id:+b.dataset.ast},r=>{if(r.out.win){toast('✦ Предмет став астральним!');haptic('heavy')}else toast('Не вдалося ('+r.out.chance+'%). Предмет цілий')}));
 $('myth').onclick=()=>{const ids=L.slice(0,mN).map(i=>i.id);act('mythic',{ids},r=>{const o=r.out;if(o.win){toast('◆ Міфік скувався!');haptic('heavy')}else toast('Не вдалося ('+o.chance+'%). Наступна спроба +5%')})};
}
const DNG=[{n:'Нора щурів',bg:1},{n:'Вовче лігво',bg:1},{n:'Склеп короля',bg:2},{n:'Болотне капище',bg:3},{n:'Вогняна кузня',bg:4},{n:'Крижана печера',bg:5},{n:'Затонулий храм',bg:6},{n:'Зала дзеркал',bg:7},{n:'Серце безодні',bg:8},{n:'Трон попелу',bg:8}];
const MATN=['I','II','III','IV'];
function renderDng(){
 const D=V.dng;
 let h=`<p class="hint" style="margin-top:0">Данж — ${D.rooms} кімнат з елітними ворогами і бос. Здоров’я між кімнатами майже не відновлюється. Нагороди: скрині зі спорядженням, матеріали, Душі, каталізатори, а з глибоких — Астральна есенція. Вхід — ключ (купується за золото при вході).</p>`;
 if(G.maxStage<D.unlockStage)h+=`<div class="empty">Данжі відкриються на етапі ${D.unlockStage}</div>`;
 for(const T of D.tiers){const d=DNG[T.t-1],rw=T.rw,e=T.est;
  const ec=e==null?'':e>=80?'#56c271':e>=40?'#f2c14e':'#e0484e';
  h+=`<div class="dcard ${T.open?'':'lock'}"><div class="th" style="background-image:url(${IMG('bg'+d.bg)})"><b>${ROMAN[T.t-1]||'I'}</b></div><div class="info">
   <div class="nm">${d.n} <span class="sub">· тир ${T.t}</span></div>
   <div class="rw">🎁×${rw.chests} (ур. ${rw.chestIl}) · ⛏️${MATN[rw.mat]}×${rw.matN} · 🔮${rw.souls}${rw.catChance?' · 🧪'+Math.round(rw.catChance*100)+'%':''}${rw.essChance?' · ✦'+Math.round(rw.essChance*100)+'%':''}</div>
   ${T.open?`<div class="sub">Шанс пройти: <span class="est" style="color:${ec}">~${e}%</span></div>
   <button class="btn pri" data-dng="${T.t}" ${busy||(!T.keys&&G.gold<T.price)?'disabled':''}>${T.keys?'🗝️ Увійти (ключів: '+T.keys+')':'Увійти · 💰'+fmt(T.price)}</button>`:`<div class="sub">${G.maxStage<D.unlockStage?'Етап '+D.unlockStage:'Спершу пройди тир '+(T.t-1)}</div>`}
  </div></div>`}
 $('p-dng').innerHTML=h;
 $('p-dng').querySelectorAll('[data-dng]').forEach(b=>b.onclick=()=>act('dungeon',{t:+b.dataset.dng},r=>dngResult(r.out)));
}
function dngResult(o){
 const d=DNG[o.t-1],g=o.gain;
 const rows=o.rooms.map((x,i)=>`<div><span>${x.boss?'👑 Бос':'Кімната '+(i+1)}</span><b style="color:${x.win?'#56c271':'#e0484e'}">${x.win?'✓':'✗'} ❤️${x.hpLeft}%</b></div>`).join('');
 const rw=[g.chests?`🎁 Скринь: <b>${g.chests}</b>`:'',g.matN?`⛏️ Матеріал ${MATN[g.mat]}: <b>${g.matN}</b>`:'',g.souls?`🔮 Душі: <b>+${g.souls}</b>`:'',g.cat?'🧪 Каталізатор: <b>+1</b>':'',g.ess?`<span style="color:${RAR[6].c}">✦ Астральна есенція: <b>+1</b></span>`:''].filter(Boolean).map(x=>`<p>${x}</p>`).join('');
 modal(`<div class="big">${o.full?'🏆':'💀'}</div><h3>${d.n}: ${o.full?'пройдено!':'поразка'}</h3><div class="rooms">${rows}</div>${rw||'<p class="hint">Нагород немає — стань сильнішим і спробуй знову.</p>'}${g.chests?'<p class="hint">Скрині відкриваються в Сумці.</p>':''}`,'Добре');
 document.querySelectorAll('.rooms div').forEach((e,i)=>setTimeout(()=>e.classList.add('show'),250+i*350));
 haptic(o.full?'heavy':'medium');
}
function renderTrain(){
 let h='';for(const u of UPG){const l=G.up[u.k],mx=u.max&&l>=u.max;
  h+=`<div class="upg"><div class="ic">${u.ic}</div><div class="info"><b>${u.n} · ур. ${l}</b><span>${u.d}: ${u.k==='crit'?u.val(l).toFixed(1)+'%':fmt(u.val(l))}${mx?'':' → '+(u.k==='crit'?u.val(l+1).toFixed(1)+'%':fmt(u.val(l+1)))}</span></div>
  <button class="btn pri" data-up="${u.k}" ${mx?'disabled':''}>${mx?'МАКС':'💰 '+fmt(u.cost(l))}</button></div>`}
 h+='<p class="hint">Тренування — постійні бонуси. Комбінуй їх зі спорядженням, щоб пробити стіну на складних етапах.</p>';
 $('p-train').innerHTML=h;
 $('p-train').querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>act('upgrade',{k:b.dataset.up},()=>haptic('light')));renderTrainBtns();
}
function renderTrainBtns(){$('p-train').querySelectorAll('[data-up]').forEach(b=>{const u=UPG.find(x=>x.k===b.dataset.up);const l=G.up[u.k];if(!(u.max&&l>=u.max))b.disabled=busy||G.gold<u.cost(l)})}
const LOGT={
 start:()=>'🔥 Мандрівник вирушив у Гнилий ліс',
 lvl:a=>'✨ Досягнуто рівня '+a[0],
 loot:a=>`<span style="color:${RAR[a[0]].c}">${SLOT[a[1]].ic} ${RAR[a[0]].n}: ${SLOT[a[1]].names[a[2]]||''}</span>`,
 bagfull:()=>'🎒 Сумка повна — предмет продано',
 offline:a=>`🌙 Офлайн ${Math.floor(a[0]/3600)} год ${Math.floor(a[0]%3600/60)} хв: +${fmt(a[1])} 💰, ${a[2]} предм.${a[3]?', +'+a[3]+' 🔮':''}`,
 boss:a=>`👑 Переможено боса етапу ${a[0]} (+${fmt(a[1])} 💰)`,
 bossDeath:a=>'💀 Загинув у бою з босом етапу '+a[0]+'. Стань сильнішим!',
 bossTimeout:a=>'⏳ Не встиг перемогти боса на етапі '+a[0],
 daily:a=>'🎁 Щоденна нагорода, день '+a[0],
 dis:a=>`⚒️ Розібрано ${a[0]} предм.: +${fmt(a[1])} ${a[2]==='xp'?'✨':'🔩'}`,
 ench:a=>'✨ Заточка спорядження: ур. '+a[0],
 dng:a=>`🏰 Данж «${DNG[a[0]-1].n}»: ${a[1]?'пройдено':'не пройдено'}, скринь: ${a[2]}`,
 astral:a=>a[0]?`<span style="color:${RAR[6].c}">✦ Предмет став астральним: ${SLOT[a[1]].n}</span>`:`💥 Астрал не вдався (${a[2]}%)`,
 myth:a=>a[0]?`<span style="color:${RAR[5].c}">◆ Скувано міфічний предмет: ${SLOT[a[1]].n}</span>`:`💥 Крафт міфіка не вдався (${a[2]}%)`
};
function renderLog(){$('p-log').innerHTML='<div class="log">'+(G.log.length?G.log.map(e=>{const d=new Date(e.t);return `<div><b>${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}</b> ${(LOGT[e.k]||(()=>e.k))(e.a||[])}</div>`}).join(''):'<div class="empty">Подій ще немає</div>')+'</div>'}
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
  modal(`<div class="big">🌙</div><h3>Поки тебе не було</h3><p>${h?h+' год ':''}${m} хв герой бився на етапі ${p.stage}</p><p>⚔️ Вбито: <b>${fmt(p.kills)}</b></p><p>💰 Золото: <b>+${fmt(p.gold)}</b></p><p>✨ Досвід: <b>+${fmt(p.xp)}</b></p>${p.souls?`<p>🔮 Душі: <b>+${fmt(p.souls)}</b></p>`:''}${p.items?`<p>🎒 Предметів: <b>${p.items}</b></p>`:''}`,'Забрати')}
 if(p&&p.boss&&!B.rep)startReplay(p.boss);
 const d=V.daily;
 if(d&&dailyShown!==String(G.daily.date)+d.streak){dailyShown=String(G.daily.date)+d.streak;
  let days='';for(let i=1;i<=7;i++)days+=`<div class="${i<d.streak?'got':i===d.streak?'now':''}">День ${i}<br>${i===7?'🎁':'💰'}</div>`;
  modal(`<div class="big">🎁</div><h3>Щоденна нагорода</h3><div class="days">${days}</div><p>Сьогодні: <b>💰 ${fmt(d.gold)}</b>${d.epic?' + <b style="color:'+RAR[3].c+'">епічний предмет</b>':''}</p><p class="hint">Заходь щодня — нагорода росте, а на 7-й день скриня з епіком.</p>`,'Забрати',()=>act('daily',{},r=>toast('+💰'+fmt(r.out.gold))))}
}

// ---------- старт ----------
function boot(msg,retry){
 let e=$('boot');if(!e){e=document.createElement('div');e.id='boot';e.className='modal show';document.body.appendChild(e)}
 if(!msg){e.remove();return}
 e.innerHTML=`<div class="mbox"><div class="big">🔥</div><h3>Grimtale</h3><p>${msg}</p>${retry?'<div class="row"><button class="btn pri" id="bootR">Спробувати ще</button></div>':''}</div>`;
 if(retry)$('bootR').onclick=start;
}
let syncing=false;
async function sync(){if(syncing||busy||B.rep||!G)return;syncing=true;try{const r=await api('sync');afterSync(r)}catch(e){if(e.message==='auth')boot(ERR.auth)}finally{syncing=false}}
async function start(){
 const w=tg();
 if(w){try{w.ready();w.expand();w.setHeaderColor&&w.setHeaderColor('#19161d');w.setBackgroundColor&&w.setBackgroundColor('#0e0c10')}catch(e){}}
 if(!w&&!DEV){boot('Гра працює всередині Telegram. Відкрий бота @Grimtalebot і натисни «Грати».');return}
 boot('Завантаження…');
 try{const r=await api('sync');boot();B.hp=H.hp;spawn();flush();afterSync(r)}
 catch(e){boot(errT(e),true)}
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('act',x===b));document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('act',p.id==='p-'+tab));dirty[tab]=1;flush()});
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
