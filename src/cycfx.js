// 23.11 (Влад: «має бути сама анімація бою з циклопом… як він з'являється і б'ється проти гравців з петами»).
// Повтор бою з Циклопом за журналом подій сервера (cycFight → result.log): той самий бій бачать усі учасники.
// window.cycPlay(f, o): f — {d, res, buf, log}; o — {T, esc, fmt, mine (html нагороди), onClose, eye:[x%,y%]}.
(function () {
  const CSS = `.cfx{position:fixed;inset:0;z-index:9000;background:#0b080ef2;display:flex;justify-content:center;overflow-y:auto;-webkit-overflow-scrolling:touch}
.cfx .g{width:100%;max-width:460px;margin:auto 0;padding:8px 8px 16px}
.cfx .top{display:flex;align-items:center;gap:8px;padding:6px 4px}
.cfx .top b{flex:1;font-size:16px}
.cfx .pill{background:#0008;border:1px solid #ffffff22;border-radius:999px;padding:4px 10px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
.cfx .tb{height:6px;border-radius:4px;background:#0008;overflow:hidden}.cfx .tb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#f3c15b,#ff7a2f)}
.cfx .bf{display:flex;flex-wrap:wrap;gap:5px;padding:7px 2px}
.cfx .bf span{font-size:12px;background:#0006;border:1px solid #ffffff1f;border-radius:8px;padding:2px 7px}
.cfx .ar{position:relative;height:min(62vw,300px);border-radius:14px;overflow:hidden;background:#000 center/cover}
.cfx .ar::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 62%,transparent 40%,#000b 100%);pointer-events:none}
.cfx .shk{animation:cfxShake .35s}
@keyframes cfxShake{20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}
.cfx .cy{position:absolute;left:50%;bottom:2%;height:92%;transform:translateX(-50%);transform-origin:50% 100%;transition:transform .16s,filter .5s;z-index:2}
.cfx .cy img{height:100%;display:block;filter:drop-shadow(0 10px 16px #000)}
.cfx .cy.idle{animation:cfxBr 2.6s ease-in-out infinite}
@keyframes cfxBr{50%{transform:translateX(-50%) scale(1.015,1.03)}}
.cfx .cy.hide{filter:brightness(0) blur(2px);transform:translateX(-50%) translateY(18%) scale(.9)}
.cfx .cy.l{transform:translateX(-60%) rotate(-5deg)}.cfx .cy.r{transform:translateX(-40%) rotate(5deg)}.cfx .cy.up{transform:translateX(-50%) translateY(-8%)}
.cfx .eye{position:absolute;width:12%;aspect-ratio:1;margin:-6% 0 0 -6%;border-radius:50%;background:radial-gradient(circle,#fff6c9 0,#ffb13b 35%,#ff5e1a66 60%,transparent 72%);opacity:0;transition:opacity .5s;mix-blend-mode:screen;pointer-events:none}
.cfx .eye.on{opacity:1;animation:cfxGl 1.2s ease-in-out infinite}
@keyframes cfxGl{50%{transform:scale(1.35)}}
.cfx .tot{position:absolute;left:8px;top:8px;z-index:4;background:#000b;border:1px solid #ffffff22;border-radius:10px;padding:4px 9px;font-size:11px;opacity:.9}
.cfx .tot b{display:block;color:#f3c15b;font-size:16px;font-variant-numeric:tabular-nums}
.cfx .fx{position:absolute;inset:0;z-index:5;pointer-events:none}
.cfx .nm{position:absolute;font-weight:800;font-size:14px;text-shadow:0 2px 3px #000,0 0 2px #000;animation:cfxUp 1s ease-out forwards;white-space:nowrap}
.cfx .nm.c{color:#f3c15b;font-size:16px}
@keyframes cfxUp{from{transform:translate(-50%,0) scale(.8);opacity:0}15%{opacity:1;transform:translate(-50%,-6px) scale(1.1)}to{transform:translate(-50%,-46px);opacity:0}}
.cfx .sl{position:absolute;width:44px;height:6px;border-radius:6px;background:linear-gradient(90deg,transparent,#fff,transparent);animation:cfxSl .32s ease-out forwards}
.cfx .sl.c{background:linear-gradient(90deg,transparent,#f3c15b,transparent);height:8px}
@keyframes cfxSl{from{opacity:0;transform:rotate(var(--r)) scaleX(.2)}40%{opacity:1}to{opacity:0;transform:rotate(var(--r)) scaleX(1.3)}}
.cfx .wv{position:absolute;left:50%;bottom:2%;width:40px;height:16px;margin-left:-20px;border:3px solid #ffb36b;border-radius:50%;animation:cfxWv .7s ease-out forwards}
@keyframes cfxWv{to{transform:scale(14,5);opacity:0}}
.cfx .bn{position:absolute;left:8px;right:8px;top:40%;z-index:6;text-align:center;font-weight:800;font-size:21px;line-height:1.15;color:#fff;text-shadow:0 3px 10px #000,0 0 3px #000;opacity:0;transition:opacity .3s;pointer-events:none}
.cfx .bn small{display:block;font-size:13px;color:#f3c15b;margin-top:4px}
.cfx .bn.on{opacity:1}
.cfx .dk{position:absolute;inset:0;background:#000;z-index:3;transition:opacity 1.4s}
.cfx .pt{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;padding:8px 0}
.cfx .m{position:relative;background:#140f19;border:1px solid #ffffff1c;border-radius:12px;padding:5px 3px 6px;text-align:center;transition:filter .3s}
.cfx .m .pc{position:relative;height:58px}
.cfx .m .hr{position:absolute;left:50%;top:0;height:58px;transform:translateX(-58%)}
.cfx .m .pe{position:absolute;right:-2px;bottom:-2px;width:32px;filter:drop-shadow(0 2px 2px #000)}
.cfx .m .pe.go{animation:cfxLg .35s}
@keyframes cfxLg{50%{transform:translate(-6px,-14px) scale(1.15)}}
.cfx .m .n{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.cfx .hp{height:6px;border-radius:4px;background:#000;margin:3px 2px 2px;overflow:hidden}
.cfx .hp i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#3fcf6a,#9be36b);transition:width .25s}
.cfx .m.lo .hp i{background:linear-gradient(90deg,#ff4d5e,#ff8a5b)}
.cfx .m .s{font-size:10.5px;opacity:.7;min-height:14px;font-variant-numeric:tabular-nums;white-space:nowrap}
.cfx .m.hit{animation:cfxHit .3s}.cfx .m.hit::after{content:"";position:absolute;inset:0;border-radius:12px;background:#ff2d3c66;animation:cfxFl .45s forwards;pointer-events:none}
@keyframes cfxFl{to{opacity:0}}
@keyframes cfxHit{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.cfx .m.dd{filter:grayscale(1) brightness(.55)}
.cfx .m .sk{position:absolute;left:50%;top:12px;transform:translateX(-50%);font-size:24px;display:none}
.cfx .m.dd .sk{display:block}
.cfx .m .tg{position:absolute;left:50%;top:-8px;transform:translateX(-50%);font-size:10.5px;font-weight:800;white-space:nowrap;padding:1px 6px;border-radius:6px;background:#000c;opacity:0;transition:opacity .2s;z-index:2}
.cfx .m .tg.on{opacity:1}
.cfx .fi{position:absolute;inset:-6px;border-radius:14px;background:radial-gradient(circle at 50% 70%,#ffcf5a,#ff6a1a88 45%,transparent 70%);animation:cfxFi 1.1s ease-out forwards;pointer-events:none}
@keyframes cfxFi{from{opacity:0;transform:scale(.6)}30%{opacity:1}to{opacity:0;transform:scale(1.25)}}
.cfx .ct{display:flex;gap:8px}.cfx .ct .btn{flex:1}
.cfx .rs{margin-top:8px;background:#1d1724;border:1px solid #ffffff1c;border-radius:14px;padding:10px 12px}
.cfx .rs h3{margin:0 0 6px;color:#f3c15b;font-size:18px}
.cfx .rw{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px dashed #ffffff1c;font-size:13.5px}
.cfx .rw img{width:30px}.cfx .rw .t{font-weight:800;white-space:nowrap}.cfx .rw .ok{color:#7be08a}.cfx .rw .die{color:#ff4d5e}
.cfx .rw .p{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.cfx .rw small{display:block;opacity:.65;font-size:11px}
.cfx .rs .hint{opacity:.75;font-size:12.5px;margin:8px 0 0}
@media (prefers-reduced-motion:reduce){.cfx *{animation:none!important;transition:none!important}}`;
  let css = false;
  window.cycPlay = function (f, o) {
    const T = o.T, esc = o.esc, fmt = o.fmt, V = o.ver || 1, E = o.eye || [50, 16], L = f.log || [], R = f.res || [], B = f.buf || {}, TIME = 60;
    if (!css) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); css = true; }
    const pimg = (x) => x.pet ? `assets/pet_${x.pet}${Math.min(3, Math.max(1, x.pf || 1))}.webp` : '';
    const el = document.createElement('div'); el.className = 'cfx';
    el.innerHTML = `<div class="g"><div class="top"><b>👁️ ${T('cyc_t')} · ${T('cyc_d' + f.d)}</b><span class="pill" data-k="ck">⏳ ${TIME} ${T('cyc_s')}</span></div>
<div class="tb"><i data-k="tb"></i></div>
<div class="bf">${[B.skin && T('cfx_skin', { n: B.skin }), B.dodge && T('cfx_dodge_b', { n: Math.round(B.dodge) }), B.sight && T('cfx_sight', { n: Math.round(B.sight) }), B.bite && T('cfx_bite', { n: Math.round(B.bite) }), B.rebirth && T('cfx_reb', { n: Math.round(B.rebirth) }), B.loot && T('cfx_loot', { n: Math.round(B.loot) })].filter(Boolean).map((x) => `<span>${x}</span>`).join('')}</div>
<div class="ar" data-k="ar" style="background-image:url(assets/cyc/arena.jpg?v=${V})"><div class="tot">⚔️ ${T('cfx_tot')}<b data-k="tot">0</b></div>
<div class="cy hide" data-k="cy"><img data-k="ci" src="assets/cyc/idle.webp?v=${V}" alt=""><div class="eye" data-k="eye" style="left:${E[0]}%;top:${E[1]}%"></div></div>
<div class="fx" data-k="fx"></div><div class="bn" data-k="bn"></div><div class="dk" data-k="dk"></div></div>
<div class="pt">${R.map((x, i) => `<div class="m" data-m="${i}"><span class="tg"></span><div class="pc"><img class="hr" src="assets/hero.webp" alt="" style="filter:hue-rotate(${[0, 40, -35, 150, -90][i % 5]}deg)">${x.pet ? `<img class="pe" src="${pimg(x)}" alt="">` : ''}<span class="sk">💀</span></div><div class="n">${esc(x.name)}</div><div class="hp"><i></i></div><div class="s">${T('stage', { n: x.st })}</div></div>`).join('')}</div>
<div class="ct"><button class="btn" data-k="sp">${T('cfx_speed', { n: 4 })}</button><button class="btn" data-k="sk">${T('cfx_skip')}</button></div><div data-k="rs"></div></div>`;
    document.body.appendChild(el);
    const q = (k) => el.querySelector(`[data-k="${k}"]`), M = [...el.querySelectorAll('.m')], ar = q('ar'), fx = q('fx'), cy = q('cy'), ci = q('ci');
    ['idle', 'swing', 'stomp'].forEach((n) => { const i = new Image(); i.src = `assets/cyc/${n}.webp?v=${V}`; });
    let speed = 4, t = 0, k = 0, tot = 0, raf = 0, last = 0, ph = 'intro', tm = [];
    const later = (ms, fn) => tm.push(setTimeout(fn, ms));
    const ban = (h, ms) => { const b = q('bn'); b.innerHTML = h; b.classList.add('on'); later(ms || 1400, () => b.classList.remove('on')); };
    const shake = () => { ar.classList.remove('shk'); void ar.offsetWidth; ar.classList.add('shk'); };
    const float = (x, y, s, c, col) => { const n = document.createElement('div'); n.className = 'nm' + (c ? ' c' : ''); n.style.left = x + '%'; n.style.top = y + '%'; if (col) n.style.color = col; n.textContent = s; fx.appendChild(n); setTimeout(() => n.remove(), 1000); };
    const slash = (c) => { const s = document.createElement('div'); s.className = 'sl' + (c ? ' c' : ''); s.style.left = (38 + Math.random() * 22) + '%'; s.style.top = (28 + Math.random() * 42) + '%'; s.style.setProperty('--r', (Math.random() * 120 - 60) + 'deg'); fx.appendChild(s); setTimeout(() => s.remove(), 340); };
    const card = (i) => { const c = M[i]; if (!c) return; c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); };
    const tag = (i, s, col) => { const g = M[i] && M[i].querySelector('.tg'); if (!g) return; g.textContent = s; g.style.color = col; g.classList.add('on'); later(900, () => g.classList.remove('on')); };
    const hp = (i, r) => { const c = M[i]; if (!c) return; c.querySelector('.hp i').style.width = Math.max(0, Math.min(1, r)) * 100 + '%'; c.classList.toggle('lo', r < 0.3); };
    const pose = (n, ms) => { ci.src = `assets/cyc/${n}.webp?v=${V}`; cy.classList.remove('idle'); if (n === 'swing') cy.classList.add('up'); later(ms, () => { ci.src = `assets/cyc/idle.webp?v=${V}`; cy.classList.remove('up', 'l', 'r'); cy.classList.add('idle'); }); };
    const hitOn = (h) => { const [i, v, r] = h; if (v < 0) { tag(i, T('cfx_dodge'), '#b8e6ff'); return; } card(i); hp(i, r); tag(i, '−' + fmt(v), '#ff6b78'); };
    function apply(e) {
      const [kd, et] = e;
      if (kd === 'a') { const s = e[2].reduce((a, v) => a + v, 0); tot += s; if (s > 0) float(58 + Math.random() * 14, 20 + Math.random() * 14, '+' + fmt(s) + (e[4] ? ' 🐺' : ''), !!e[3]);
        e[2].forEach((v, i) => { if (v > 0) slash((e[3] >> i) & 1); if ((e[4] >> i) & 1) { const p = M[i] && M[i].querySelector('.pe'); if (p) { p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); } } });
        q('tot').textContent = fmt(tot); }
      else if (kd === 's') { const i = e[2]; cy.classList.remove('idle'); cy.classList.add(i < R.length / 2 - 0.5 ? 'l' : i > R.length / 2 - 0.5 ? 'r' : 'up'); pose('swing', 260); later(120, () => hitOn([i, e[3], e[4]])); }
      else if (kd === 'p') { pose('stomp', 420); later(160, () => { shake(); const w = document.createElement('div'); w.className = 'wv'; fx.appendChild(w); setTimeout(() => w.remove(), 700); float(50, 80, T('cfx_stomp'), 0, '#ffb36b'); e[2].forEach(hitOn); }); }
      else if (kd === 'x') { const c = M[e[2]]; if (c) { c.classList.add('dd'); hp(e[2], 0); c.querySelector('.s').textContent = '💀 ' + Math.round(et) + ' ' + T('cyc_s'); } }
      else if (kd === 'r') { for (const j of e[2]) { const c = M[j]; if (!c) continue; c.classList.remove('dd'); hp(j, e[3] / 100); c.querySelector('.s').textContent = T('stage', { n: R[j].st }); const fi = document.createElement('div'); fi.className = 'fi'; c.appendChild(fi); setTimeout(() => fi.remove(), 1100); }
        ban(`${T('cfx_reborn')}<small>${T('cfx_reborn_s', { p: Math.round(e[3]) })}</small>`, 1600); }
    }
    function frame(now) {
      if (ph !== 'fight') return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now; t = Math.min(TIME, t + dt * speed);
      while (k < L.length && L[k][1] <= t) apply(L[k++]);
      q('ck').textContent = '⏳ ' + Math.ceil(TIME - t) + ' ' + T('cyc_s'); q('tb').style.width = (t / TIME * 100) + '%';
      if (t >= TIME) return finish();
      raf = requestAnimationFrame(frame);
    }
    function finish() {
      if (ph === 'end') return; ph = 'end'; cancelAnimationFrame(raf);
      R.forEach((x, i) => { hp(i, x.t >= TIME ? 1 : 0); if (x.t < TIME) { M[i].classList.add('dd'); M[i].querySelector('.s').textContent = '💀 ' + x.t + ' ' + T('cyc_s'); } else M[i].classList.remove('dd'); });
      for (; k < L.length; k++) { const e = L[k]; if (e[0] === 'a') tot += e[2].reduce((a, v) => a + v, 0); }
      q('ck').textContent = '⏳ 0 ' + T('cyc_s'); q('tb').style.width = '100%'; q('tot').textContent = fmt(R.reduce((a, x) => a + x.dmg, 0));
      q('dk').style.opacity = 0; cy.className = 'cy idle';
      ban(`${T('cfx_time')}<small>${T('cfx_away')}</small>`, 1500);
      later(1300, () => { cy.className = 'cy hide'; q('eye').classList.remove('on'); });
      q('sk').hidden = true;
      q('rs').innerHTML = `<div class="rs"><h3>${T('cfx_res')}</h3>${R.map((x) => `<div class="rw">${x.pet ? `<img src="${pimg(x)}" alt="">` : '<span></span>'}<div><b>${esc(x.name)}</b><small>${T('cfx_dmg', { n: fmt(x.dmg) })}</small></div><span class="t ${x.t >= TIME ? 'ok' : 'die'}">${x.t >= TIME ? '✓ ' + TIME : '💀 ' + x.t} ${T('cyc_s')}</span><span class="p">${fmt(Math.round(x.pts))}<small>${T('cfx_pts')}</small></span></div>`).join('')}<p class="hint">${T('cfx_secs')}</p>${o.mine || ''}<button class="btn pri" data-k="ok" style="width:100%;margin-top:8px">${T('ok')}</button></div>`;
      q('ok').onclick = close;
    }
    function close() { tm.forEach(clearTimeout); cancelAnimationFrame(raf); ph = 'end'; el.remove(); o.onClose && o.onClose(); }
    q('sp').onclick = () => { speed = speed === 4 ? 8 : speed === 8 ? 2 : 4; q('sp').textContent = T('cfx_speed', { n: speed }); };
    q('sk').onclick = () => { tm.forEach(clearTimeout); tm = []; finish(); };
    R.forEach((x, i) => hp(i, 1));
    if (!L.length) { finish(); return el; }
    later(250, () => { q('dk').style.opacity = 0.7; q('eye').classList.add('on'); ban(T('cfx_dark'), 1300); });
    later(1600, () => { shake(); q('dk').style.opacity = 0; cy.classList.remove('hide'); });
    later(2200, () => { ban(`${T('cfx_awake')}<small>${T('cfx_hold', { n: TIME })}</small>`, 1500); cy.classList.add('idle'); });
    later(3500, () => { q('eye').classList.remove('on'); ph = 'fight'; last = performance.now(); raf = requestAnimationFrame(frame); });
    return el;
  };
})();
