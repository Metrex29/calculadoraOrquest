const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
// Festivos nacionales + Comunidad de Madrid + Madrid capital (San Isidro y Almudena)
const FEST_DEF=['2026-01-01','2026-01-06','2026-03-19','2026-04-02','2026-04-03','2026-05-01','2026-05-02','2026-05-15','2026-08-15','2026-10-12','2026-11-02','2026-11-09','2026-12-07','2026-12-08','2026-12-25',
'2027-01-01','2027-01-06','2027-03-25','2027-03-26','2027-05-01','2027-05-15','2027-08-16','2027-10-12','2027-11-01','2027-11-09','2027-12-06','2027-12-08','2027-12-25'];

// Convenio de hostelería de la Comunidad de Madrid, personal de equipo.
// Importes a jornada completa (40 h) comprobados con una nómina real de octubre de 2026.
const EQUIPO={base:1127.42,convenio:175.28,manuVac:9.64,precio:9.94};
const DEF={cat:'equipo',contrato:20,pagas:12,auto:true,base:563.71,convenio:87.64,manuVac:4.82,precio:9.94,manut:2.65,
  n1Ini:'22:00',n1Fin:'00:00',n1Eur:0.07,n2Ini:'00:00',n2Fin:'08:00',n2Eur:1.76,plusDom:0,plusFest:0,ssCC:4.85,ssDes:1.65,irpf:0,cfgV:5};
const r2=x=>Math.round(x*100)/100;
function equipoImportes(h){const f=(+h||0)/40;return{base:r2(EQUIPO.base*f),convenio:r2(EQUIPO.convenio*f),manuVac:r2(EQUIPO.manuVac*f),precio:EQUIPO.precio}}
// Acepta ajustes de versiones anteriores (copias de seguridad) y los pasa al formato actual
function migrate(c){
  if(!c)return null;
  if((c.cfgV||0)>=5)return{...DEF,...c};
  const o={...DEF,cat:'equipo',contrato:+c.contrato||20,pagas:12,auto:true,...equipoImportes(+c.contrato||20)};
  for(const k of['precio','manut','n1Ini','n1Fin','n1Eur','n2Ini','n2Fin','n2Eur','plusDom','plusFest','irpf','ssCC','ssDes'])if(c[k]!=null&&(c.cfgV||0)>=3)o[k]=c[k];
  return o;
}

let S={turnos:{},cfg:null,fest:FEST_DEF.slice(),reales:{}};
try{const raw=localStorage.getItem('misHorasMadrid');if(raw){const o=JSON.parse(raw);S.turnos=o.turnos||{};S.cfg=migrate(o.cfg);S.fest=o.fest||FEST_DEF.slice();S.reales=o.reales||{};}}catch(e){}
function save(){try{localStorage.setItem('misHorasMadrid',JSON.stringify(S))}catch(e){}}

// ---------- utilidades ----------
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseIso=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const monday=d=>addDays(new Date(d.getFullYear(),d.getMonth(),d.getDate()),-((d.getDay()+6)%7));
const toMin=t=>{const[h,m]=String(t||'0:0').split(':').map(Number);return h*60+m};
const fmtH=min=>{min=Math.round(min);const h=Math.floor(min/60),m=min%60;return h+'h'+(m?' '+pad(m):'')};
const fmtHd=h=>h.toLocaleString('es-ES',{maximumFractionDigits:2})+' h';
const eur=x=>x.toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const pu=x=>x.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:4})+' €';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const ym=(y,mo)=>y+'-'+pad(mo+1);

// ---------- cálculo de un día ----------
const RANGE_RE=/(\d{1,2})[:.h](\d{2})\s*(?:-|–|—|a|hasta)\s*(\d{1,2})[:.h](\d{2})/gi;
function parseRanges(txt){
  const out=[];if(!txt)return out;let m;RANGE_RE.lastIndex=0;
  while((m=RANGE_RE.exec(txt))){const a=+m[1]*60+ +m[2];let b=+m[3]*60+ +m[4];if(a>=1440||b>1440||+m[2]>59||+m[4]>59)continue;if(b<=a)b+=1440;out.push([a,b]);}
  return out;
}
const isSun=d=>parseIso(d).getDay()===0;
const isHol=d=>S.fest.includes(d);
const isVac=d=>/vacaci/i.test(S.turnos[d]||'');
const inWin=(tm,a,b)=>a===b?false:a<b?(tm>=a&&tm<b):(tm>=a||tm<b);
// Minutos del turno que EMPIEZA en ese día (si pasa de medianoche, el resto cuenta para ese mismo día)
function calcDay(dateStr){
  const c=S.cfg,r={tot:0,n1:0,n2:0,dom:0,fest:0,ranges:parseRanges(S.turnos[dateStr])};
  const a1=toMin(c.n1Ini),b1=toMin(c.n1Fin),a2=toMin(c.n2Ini),b2=toMin(c.n2Fin),man=iso(addDays(parseIso(dateStr),1));
  for(const[a,b]of r.ranges){
    r.tot+=b-a;
    for(let t=a;t<b;t++){const tm=t%1440,day=t<1440?dateStr:man;
      if(inWin(tm,a1,b1))r.n1++;else if(inWin(tm,a2,b2))r.n2++;
      if(isHol(day))r.fest++;else if(isSun(day))r.dom++;}
  }
  return r;
}
function sumDays(dates){const s={tot:0,n1:0,n2:0,dom:0,fest:0,dias:0,festDias:0};for(const d of dates){const c=calcDay(d);for(const k of['tot','n1','n2','dom','fest'])s[k]+=c[k];if(c.tot)s.dias++;if(c.tot&&isHol(d))s.festDias++;}return s}
function ssDe(base){const c=S.cfg;return r2(base*(+c.ssCC||0)/100)+r2(base*(+c.ssDes||0)/100)}
const ssPct=()=>((+S.cfg.ssCC||0)+(+S.cfg.ssDes||0)).toLocaleString('es-ES')+' %';

// Valor de las horas de un día o semana (a precio de hora complementaria)
function money(s){
  const c=S.cfg,h=m=>m/60;
  const L=[{k:'Horas trabajadas',h:h(s.tot),pu:+c.precio||0},{k:`Nocturno ${c.n1Ini}–${c.n1Fin}`,h:h(s.n1),pu:+c.n1Eur||0},
    {k:`Nocturna ${c.n2Ini}–${c.n2Fin}`,h:h(s.n2),pu:+c.n2Eur||0},{k:'Plus domingo',h:h(s.dom),pu:+c.plusDom||0},{k:'Plus festivo',h:h(s.fest),pu:+c.plusFest||0}];
  L.forEach(l=>l.eur=r2(l.h*l.pu));
  const bruto=r2(L.reduce((a,l)=>a+l.eur,0)),ss=ssDe(bruto),irpf=r2(bruto*(+c.irpf||0)/100);
  return{lines:L.filter(l=>l.eur>0),bruto,ss,irpf,neto:r2(bruto-ss-irpf)};
}
const fmtQ=h=>h.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
function slipTable(lines,extra){
  return `<table class="slip"><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody>
  ${lines.map(l=>`<tr><td class="c">${l.k}${l.h==null?'':`<span class="q">${fmtQ(l.h)} × ${pu(l.pu)}</span>`}</td><td>${eur(l.eur)}</td></tr>`).join('')}${extra||''}</tbody></table>`;
}
function detailHTML(s){
  const m=money(s);if(!m.bruto)return '<p class="hint">Pon el precio de la hora en Ajustes para ver el dinero.</p>';
  return slipTable(m.lines,`<tr class="tot"><td class="c">Bruto</td><td>${eur(m.bruto)}</td></tr>
  <tr class="sub"><td class="c">Seguridad Social ${ssPct()}</td><td>−${eur(m.ss)}</td></tr>
  ${S.cfg.irpf?`<tr class="sub"><td class="c">IRPF ${S.cfg.irpf} %</td><td>−${eur(m.irpf)}</td></tr>`:''}
  <tr class="tot"><td class="c">Neto aprox.</td><td>${eur(m.neto)}</td></tr>`)+
  '<p class="hint">Lo que valen estas horas a precio de hora complementaria. La nómina real se calcula por mes, en la pestaña Nómina.</p>';
}

// ---------- línea de 24 h (de 06:00 a 06:00 del día siguiente) ----------
const T0=360,TSPAN=1440,pct=m=>Math.max(0,Math.min(100,(m-T0)/TSPAN*100));
function nightBands(){
  const c=S.cfg,out=[];
  for(const [cls,a,b] of [['n1',toMin(c.n1Ini),toMin(c.n1Fin)],['n2',toMin(c.n2Ini),toMin(c.n2Fin)]]){
    if(a===b)continue;
    // pasar la franja a la escala 06:00→30:00 (puede quedar partida en dos)
    const segs=a<b?[[a,b]]:[[a,1440],[0,b]];
    for(let [x,y] of segs){if(y<=T0){x+=1440;y+=1440}else if(x<T0){out.push([cls,x+1440,Math.min(y+1440,T0+TSPAN)]);x=T0}out.push([cls,x,y])}
  }
  return out;
}
function timeline(dateStr,small){
  const v=S.turnos[dateStr]||'';
  if(isVac(dateStr))return `<div class="tl vac" role="img" aria-label="Vacaciones"${small?' style="height:8px"':''}></div>`;
  const rs=parseRanges(v),c=S.cfg,a1=toMin(c.n1Ini),b1=toMin(c.n1Fin),a2=toMin(c.n2Ini),b2=toMin(c.n2Fin);
  let h=nightBands().map(([cls,x,y])=>`<i class="${cls}" style="left:${pct(x)}%;width:${pct(y)-pct(x)}%"></i>`).join('');
  h+=`<i class="mid" style="left:${pct(1440)}%"></i>`;
  for(let [a,b] of rs){if(a<T0){a+=1440;b+=1440}
    let nightMin=0;for(let t=a;t<b;t+=15){const tm=t%1440;if(inWin(tm,a1,b1)||inWin(tm,a2,b2))nightMin+=15}
    h+=`<i class="seg${nightMin?' n':''}" style="left:${pct(a)}%;width:${Math.max(.8,pct(b)-pct(a))}%"></i>`}
  const lbl=rs.length?'Turno '+v:'Sin turno';
  return `<div class="tl" role="img" aria-label="${esc(lbl)}"${small?' style="height:8px"':''}>${h}</div>`;
}

// ---------- vista semana ----------
let wStart=monday(new Date());
const weekDays=w=>[...Array(7)].map((_,i)=>iso(addDays(w,i)));
function summaryHTML(s,contratoMin,capt,moneyHTML){
  const p=contratoMin?Math.min(100,s.tot/Math.max(s.tot,contratoMin)*100):0,mk=contratoMin?Math.min(100,contratoMin/Math.max(s.tot,contratoMin)*100):0,diff=s.tot-contratoMin;
  const pills=[];
  if(s.n1+s.n2)pills.push(`<span class="pill night">Noche ${fmtH(s.n1+s.n2)}</span>`);
  if(s.dom)pills.push(`<span class="pill sun">Domingo ${fmtH(s.dom)}</span>`);
  if(s.festDias)pills.push(`<span class="pill hol">${s.festDias} festivo${s.festDias>1?'s':''} trabajado${s.festDias>1?'s':''}</span>`);
  if(s.vac)pills.push(`<span class="pill vac">${s.vac} día${s.vac>1?'s':''} de vacaciones</span>`);
  pills.push(`<span class="pill">${s.dias} día${s.dias==1?'':'s'} trabajado${s.dias==1?'':'s'}</span>`);
  return `<div class="summary"><div><div class="hint" style="margin:0 0 4px">Horas trabajadas</div><div class="big">${fmtH(s.tot).replace(/h/,'<small>h</small>')}</div></div>${moneyHTML||''}
  ${contratoMin?`<div class="meter" role="img" aria-label="${fmtH(s.tot)} de ${fmtH(contratoMin)} de contrato"><i style="width:${p}%"></i><b style="left:calc(${mk}% - 1px)"></b></div>
  <div class="meter-cap">${fmtH(contratoMin)} de contrato${capt||''} · ${diff>0?`<b class="mono">+${fmtH(diff)}</b> de más`:diff<0?`faltan <b class="mono">${fmtH(-diff)}</b>`:'justo tu jornada'}</div>`:''}</div>
  <div class="pills">${pills.join('')}</div>`;
}
function renderWeek(){
  const days=weekDays(wStart),end=addDays(wStart,6),s=sumDays(days),m=money(s);s.vac=days.filter(isVac).length;
  $('wLbl').textContent=`${wStart.getDate()} ${MES[wStart.getMonth()].slice(0,3)} – ${end.getDate()} ${MES[end.getMonth()].slice(0,3)}`;
  $('wSum').innerHTML=summaryHTML(s,(+S.cfg.contrato||0)*60,'',m.bruto?`<div class="money"><div class="v">${eur(m.bruto)}</div><div class="s">valor de tus horas</div></div>`:'')
    +(m.bruto?`<details style="margin-top:10px"><summary>Ver el desglose</summary>${detailHTML(s)}</details>`:'');
  const box=$('wDays');box.innerHTML='';const today=iso(new Date());
  for(const d of days){
    const dt=parseIso(d),c=calcDay(d),v=S.turnos[d]||'',bad=v&&!/libre|vacaci|baja/i.test(v)&&!c.ranges.length,mm=c.tot?money(c):null;
    const el=document.createElement('div');el.className='day'+(d===today?' today':'');
    const meta=[];
    if(c.n1+c.n2)meta.push(`<span class="pill night">Noche ${fmtH(c.n1+c.n2)}</span>`);
    if(c.fest)meta.push(`<span class="pill hol">Festivo ${fmtH(c.fest)}</span>`);
    if(isVac(d))meta.push('<span class="pill vac">Vacaciones</span>');
    if(bad)meta.push('<span class="pill bad">No entiendo el horario</span>');
    el.innerHTML=`<div class="date ${isHol(d)?'hol':isSun(d)?'sun':''}"><b>${dt.getDate()}</b><span>${DOW[dt.getDay()]}</span></div>
      <input class="shift${bad?' bad':''}" id="t-${d}" value="${esc(v)}" placeholder="—" list="sug" autocomplete="off" aria-label="Turno del ${DOW[dt.getDay()]} ${dt.getDate()}">
      <div class="h">${c.tot?fmtH(c.tot):''}</div>
      <div class="tlwrap">${timeline(d)}</div>
      ${meta.length?`<div class="meta">${meta.join('')}</div>`:''}
      ${c.tot&&mm.bruto?`<details><summary>${eur(mm.bruto)}</summary>${detailHTML(c)}${isHol(d)?'<p class="hint">Festivo trabajado: pregunta si te lo compensan con un día libre o pagado.</p>':''}</details>`:''}`;
    const inp=el.querySelector('input');
    inp.addEventListener('change',()=>{const t=inp.value.trim();if(t)S.turnos[d]=t;else delete S.turnos[d];save();renderWeek();const n=$('t-'+d);if(n)n.focus();});
    box.appendChild(el);
  }
}
$('wPrev').onclick=()=>{wStart=addDays(wStart,-7);renderWeek()};
$('wNext').onclick=()=>{wStart=addDays(wStart,7);renderWeek()};
$('wToday').onclick=()=>{wStart=monday(new Date());renderWeek()};

// Nómina estimada del mes, con los mismos conceptos que la nómina
function nomina(y,mo){
  const c=S.cfg,n=new Date(y,mo+1,0).getDate(),days=[...Array(n)].map((_,i)=>iso(new Date(y,mo,i+1))),s=sumDays(days);
  // Complementarias: horas del mes − horas de contrato (h/semana × 52/12, sin los días de vacaciones), en horas enteras.
  const vac=days.filter(isVac).length,contratoMes=(+c.contrato||0)*52/12*(n-vac)/n*60;
  const compl=Math.max(0,Math.round((s.tot-contratoMes)/60))*60;
  const L=[{k:'Salario base',eur:+c.base||0},{k:'Plus convenio',eur:+c.convenio||0}];
  if(+c.pagas===12)L.push({k:'Prorrata pagas extra',eur:r2((+c.base||0)*2/12)});
  else if(mo===5||mo===11)L.push({k:'Paga extra',eur:+c.base||0});
  L.push({k:'Plus manutención vacaciones',eur:+c.manuVac||0},
    {k:'Horas complementarias',h:compl/60,pu:+c.precio||0},{k:`Nocturna ${c.n2Ini}–${c.n2Fin}`,h:s.n2/60,pu:+c.n2Eur||0},
    {k:`Nocturno ${c.n1Ini}–${c.n1Fin}`,h:s.n1/60,pu:+c.n1Eur||0},{k:'Plus domingo',h:s.dom/60,pu:+c.plusDom||0},{k:'Plus festivo',h:s.fest/60,pu:+c.plusFest||0});
  L.forEach(l=>{if(l.h!=null)l.eur=r2(l.h*l.pu)});
  const dev=r2(L.reduce((a,l)=>a+l.eur,0)),manut=r2(s.dias*(+c.manut||0)),base=dev+manut;
  const ss=ssDe(base),irpf=r2(dev*(+c.irpf||0)/100);
  return{lines:L.filter(l=>l.eur>0),dev,manut,base,ss,irpf,liq:r2(dev-ss-irpf),compl,contratoMes,vac,dias:s.dias,s};
}
// ---------- vista mes / nómina ----------
let mRef=new Date();mRef.setDate(1);
function realPill(y,mo,m){
  const real=S.reales[ym(y,mo)];if(real==null)return '';
  const d=r2(real-m.liq);
  return Math.abs(d)<0.05?'<span class="pill ok">Cuadra con tu nómina</span>':`<span class="pill ${d<0?'bad':'ok'}">${d>0?'+':''}${eur(d)} sobre lo estimado</span>`;
}
function renderMonth(){
  const y=mRef.getFullYear(),mo=mRef.getMonth(),n=new Date(y,mo+1,0).getDate(),m=nomina(y,mo),s=m.s;s.vac=m.vac;
  $('mLbl').textContent=MES[mo]+' '+y;
  $('mSum').innerHTML=summaryHTML(s,s.tot-m.compl,m.vac?', sin vacaciones':'',`<div class="money"><div class="v">${eur(m.liq)}</div><div class="s">líquido estimado</div></div>`);
  const real=S.reales[ym(y,mo)];let cmp='';
  if(real!=null){const d=r2(real-m.liq);cmp=Math.abs(d)<0.05?'<p class="hint ok">✓ La estimación cuadra con tu nómina.</p>':
    `<p class="hint">${d<0?'<b class="err">Te han pagado '+eur(-d)+' menos</b> de lo calculado. Revisa que los turnos y las vacaciones estén bien y los importes de Ajustes.':'<b class="ok">Te han pagado '+eur(d)+' más</b> de lo calculado: puede haber algún concepto que la app no conoce.'}</p>`}
  $('mSlip').innerHTML=`<div class="slip-head"><div><h2>Nómina estimada</h2><p class="hint" style="margin-top:2px">${MES[mo]} ${y} · ${S.cfg.cat==='encargado'?'Encargado/a':'Equipo'} · ${S.cfg.contrato} h · ${S.cfg.pagas} pagas</p></div><div class="v">${eur(m.liq)}</div></div>
  ${slipTable(m.lines,`${m.manut?`<tr class="sub"><td class="c">Manutención (en especie, solo cotiza)<span class="q">${m.dias} días × ${pu(+S.cfg.manut)}</span></td><td>${eur(m.manut)}</td></tr>`:''}
  <tr class="tot"><td class="c">Total devengado</td><td>${eur(m.dev)}</td></tr>
  <tr class="sub"><td class="c">Seguridad Social<span class="q">${ssPct()} de ${eur(m.base)}</span></td><td>−${eur(m.ss)}</td></tr>
  ${S.cfg.irpf?`<tr class="sub"><td class="c">IRPF<span class="q">${S.cfg.irpf} %</span></td><td>−${eur(m.irpf)}</td></tr>`:''}
  <tr class="net"><td class="c">Líquido a percibir</td><td>${eur(m.liq)}</td></tr>`)}
  ${m.contratoMes?`<p class="hint">Horas complementarias: las que pasan de tus ${fmtH(m.contratoMes)} de contrato este mes${m.vac?` (descontados ${m.vac} días de vacaciones)`:''}. Suponen un <b>${Math.round(m.compl/m.contratoMes*100)} %</b> de tu jornada.</p>`:''}
  <div class="real"><label for="real">Líquido real de tu nómina</label><input type="number" step="0.01" min="0" id="real" value="${real??''}" placeholder="—" inputmode="decimal" style="width:120px;border:1px solid var(--rule);border-radius:10px;padding:8px 10px;background:var(--paper);text-align:right;font-family:var(--f-mono)"></div>${cmp}`;
  $('real').onchange=e=>{const v=parseFloat(e.target.value);if(isNaN(v))delete S.reales[ym(y,mo)];else S.reales[ym(y,mo)]=v;save();renderMonth();};
  // semanas
  let html='',w=monday(new Date(y,mo,1));
  while(w<=new Date(y,mo,n)){
    const wd=weekDays(w),sw=sumDays(wd),e=addDays(w,6),vac=wd.filter(isVac).length;
    html+=`<div class="li click" role="button" tabindex="0" data-w="${iso(w)}"><div><div class="t">${w.getDate()} ${MES[w.getMonth()].slice(0,3)} – ${e.getDate()} ${MES[e.getMonth()].slice(0,3)}</div>
      <div class="s">${vac===7?'Vacaciones':`${sw.dias} días${sw.n1+sw.n2?' · noche '+fmtH(sw.n1+sw.n2):''}${vac?' · '+vac+' de vacaciones':''}`}</div></div><div class="v">${fmtH(sw.tot)}</div>
      <div class="tl" style="height:8px">${wd.map((d,i)=>{const t=calcDay(d).tot;return t?`<i class="seg" style="left:${i/7*100+.6}%;width:${Math.max(2,Math.min(1,t/600)*(100/7-1.2))}%"></i>`:isVac(d)?`<i class="n2" style="left:${i/7*100}%;width:${100/7}%;background:var(--vac-soft)"></i>`:''}).join('')}</div></div>`;
    w=addDays(w,7);
  }
  const box=$('mWeeks');box.innerHTML=html;
  box.querySelectorAll('[data-w]').forEach(el=>{const go=()=>{wStart=parseIso(el.dataset.w);show('semana')};el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  // historial
  const months=new Set(Object.keys(S.reales));Object.keys(S.turnos).forEach(d=>{if(parseRanges(S.turnos[d]).length)months.add(d.slice(0,7))});
  const rows=[...months].sort().reverse().slice(0,12).map(k=>{const[yy,mm]=k.split('-').map(Number),e=nomina(yy,mm-1);
    return `<div class="li click" role="button" tabindex="0" data-m="${k}"><div><div class="t" style="text-transform:capitalize">${MES[mm-1]} ${yy}</div><div class="s">${fmtH(e.s.tot)} · ${fmtHd(e.compl/60)} complementarias</div></div>
      <div style="text-align:right"><div class="v">${eur(e.liq)}</div>${realPill(yy,mm-1,e)}</div></div>`});
  const hb=$('mHist');hb.innerHTML=rows.join('')||'<p class="hint">Aquí verás cada mes cuando tengas turnos guardados.</p>';
  hb.querySelectorAll('[data-m]').forEach(el=>{const go=()=>{const[yy,mm]=el.dataset.m.split('-').map(Number);mRef=new Date(yy,mm-1,1);renderMonth();window.scrollTo({top:0})};el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
}
function monthText(y,mo){
  const n=new Date(y,mo+1,0).getDate(),days=[...Array(n)].map((_,i)=>iso(new Date(y,mo,i+1))),m=nomina(y,mo),s=m.s;
  const L=[`Resumen de ${MES[mo]} ${y}`,`Horas trabajadas: ${fmtH(s.tot)} en ${s.dias} días`,`Horas complementarias: ${fmtHd(m.compl/60)}`,
    `Nocturnas: ${fmtH(s.n1)} (${S.cfg.n1Ini}-${S.cfg.n1Fin}) y ${fmtH(s.n2)} (${S.cfg.n2Ini}-${S.cfg.n2Fin})`,`Nómina estimada: ${eur(m.dev)} bruto, ${eur(m.liq)} líquido`];
  if(S.reales[ym(y,mo)]!=null)L.push(`Nómina real: ${eur(S.reales[ym(y,mo)])} líquido`);
  L.push('','Turnos:');
  for(const d of days){const v=S.turnos[d];if(v){const dt=parseIso(d),c=calcDay(d);L.push(`${DOW[dt.getDay()]} ${dt.getDate()}: ${v}${c.tot?' ('+fmtH(c.tot)+')':''}`)}}
  return L.join('\n');
}
let toastT=null;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2200)}
$('mCopy').onclick=async()=>{const t=monthText(mRef.getFullYear(),mRef.getMonth()),ta=$('mTxt');ta.value=t;
  try{await navigator.clipboard.writeText(t);ta.hidden=true;toast('Resumen copiado')}catch(e){ta.hidden=false;ta.select();toast('Selecciona el texto y cópialo')}};
$('mPrev').onclick=()=>{mRef.setMonth(mRef.getMonth()-1);renderMonth()};
$('mNext').onclick=()=>{mRef.setMonth(mRef.getMonth()+1);renderMonth()};

// ---------- importar texto ----------
const DOWN={lun:1,mar:2,mie:3,jue:4,vie:5,sab:6,dom:0};
const dowOf=s=>DOWN[String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3)];
function parseImport(txt){
  const tokRe=/(\b\d{1,2})\s*[\n ,.]*\s*(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-zéá]*\.?|(\d{1,2}[:.h]\d{2}\s*(?:-|–|—|a|hasta)\s*\d{1,2}[:.h]\d{2})|(d[ií]a libre|libre|sin asignaci[oó]n(?:es)?|vacaciones)/gi;
  const items=[];let m,cur=null;
  while((m=tokRe.exec(txt))){
    if(m[1]){cur={dia:+m[1],dow:dowOf(m[2]),rng:[],tag:''};items.push(cur);}
    else if(m[3]&&cur)cur.rng.push(m[3].replace(/\s+/g,'').replace(/[–—]|a|hasta/g,'-'));
    else if(m[4]&&cur&&!cur.tag)cur.tag=/sin/i.test(m[4])?'':/vac/i.test(m[4])?'vacaciones':'libre';
  }
  if(!items.length)return{items,error:'No he encontrado días. Usa el formato "20 Vie 18:00 - 2:00".'};
  // Deducir el mes: se prueban los meses cercanos a hoy y se elige el que hace coincidir
  // más días con su día de la semana (y, a igualdad, el más cercano a hoy).
  const today=new Date();let best=null;
  for(let off=-6;off<=6;off++){
    const b=new Date(today.getFullYear(),today.getMonth()+off,items[0].dia);
    if(b.getDate()!==items[0].dia||b.getDay()!==items[0].dow)continue;
    let prev=b,bad=0;const dates=[iso(b)];
    for(const it of items.slice(1)){let d=new Date(prev.getFullYear(),prev.getMonth(),it.dia);if(d<prev||d.getDate()!==it.dia)d=new Date(prev.getFullYear(),prev.getMonth()+1,it.dia);if(d.getDay()!==it.dow)bad++;dates.push(iso(d));prev=d;}
    const score=bad*1e12+Math.abs(b-today);
    if(!best||score<best.score)best={score,dates};
  }
  if(!best)return{items,error:'El día '+items[0].dia+' no cae en '+DOW[items[0].dow]+' en ningún mes cercano. Revisa el texto.'};
  items.forEach((it,i)=>{it.date=best.dates[i];it.warn=parseIso(it.date).getDay()!==it.dow});
  return{items};
}
function impPreview(apply){
  const out=$('impOut'),{items,error}=parseImport($('imp').value);
  if(error){out.innerHTML=`<p class="hint err">${esc(error)}</p>`;return}
  let li='',warn=0;
  for(const it of items){
    const val=it.rng.join(' / ')||it.tag,dt=parseIso(it.date),mins=parseRanges(val).reduce((a,[x,y])=>a+y-x,0);if(it.warn)warn++;
    li+=`<div class="li"><div class="d">${dt.getDate()}<span>${DOW[dt.getDay()]} · ${MES[dt.getMonth()].slice(0,3)}</span></div>
      <div><div class="mono" style="font-size:.88rem">${esc(val==='libre'?'Día libre':val==='vacaciones'?'Vacaciones':val||'Sin turno')}</div>${it.warn?'<div class="warn">El día de la semana no coincide: revísalo</div>':''}</div>
      <div class="v" style="font:700 1.1rem/1 var(--f-display)">${mins?fmtH(mins):''}</div></div>`;
    if(apply){if(val)S.turnos[it.date]=val;else delete S.turnos[it.date];}
  }
  if(apply){save();wStart=monday(parseIso(items[0].date));toast(`${items.length} días guardados`);setTimeout(()=>show('semana'),500);}
  out.innerHTML=`<p class="hint">${apply?'<b class="ok">Guardado.</b>':`${items.length} días. ${warn?`<b class="err">${warn} con dudas.</b> `:''}Si todo está bien, pulsa <b>Guardar turnos</b>.`}</p><div class="prev">${li}</div>`;
}
$('impPrev').onclick=()=>impPreview(false);
$('impGo').onclick=()=>impPreview(true);

// ---------- leer capturas con Claude ----------
const OCR_PROMPT=`Esta imagen es una captura de la app Orquest, pantalla "Mis turnos", de una persona que trabaja en un restaurante.
Cada tarjeta es un día y tiene: un número de día, la abreviatura del día de la semana (Lun, Mar, Mié, Jue, Vie, Sáb, Dom) y el turno, que puede ser:
- uno o varios tramos horarios, por ejemplo "15:30 - 18:30 / 20:00 - 1:00";
- "Día libre";
- "Sin asignaciones".
Si la tarjeta tiene a la derecha un icono de SOL (normalmente rosa), ese día es de VACACIONES.
Responde solo con un array JSON, un objeto por tarjeta, en el orden de arriba a abajo:
[{"dia":20,"semana":"Vie","turno":"18:00-2:00"},{"dia":21,"semana":"Sáb","turno":"15:30-18:30 / 20:00-1:00"},{"dia":18,"semana":"Mié","turno":"libre"}]
En "turno" pon los tramos tal cual (con " / " entre tramos), o "libre", o "vacaciones", o "" si pone "Sin asignaciones" sin sol. No inventes días que no se vean enteros. Si la imagen no es una captura de turnos, responde [].`;
let sampleFn=null,aiCtl=null;
function aiAvailable(on){$('aiAlt').hidden=!on;}
aiAvailable(false);
(async()=>{
  try{
    if(!window.claude||!window.claude.use)return;
    const s=await window.claude.use('sample');if(!s)return;
    const lim=await s.limits().catch(()=>null);if(!lim||!lim.images)return;
    sampleFn=s;$('aiFiles').accept=lim.images.mediaTypes.join(',');aiAvailable(true);
  }catch(e){}
})();
function aiErr(e){
  const c=e&&e.code;
  if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed','images_unavailable'].includes(c)){aiAvailable(false);return 'No se ha dado permiso para usar Claude. Usa el lector gratuito o escribe los turnos abajo.'}
  if(c==='rate_limited')return 'Has llegado al límite de uso de Claude por ahora. Prueba más tarde o escribe los turnos abajo.';
  if(c==='image_rejected')return 'Esa imagen no vale (formato o tamaño). Prueba con otra captura.';
  if(c==='session_expired')return 'Tu sesión de Claude ha caducado: vuelve a iniciar sesión.';
  if(c==='invalid_json')return 'No he podido leer bien la captura. Prueba otra vez o con una captura más nítida.';
  if(c==='cancelled')return 'Parado.';
  if(c==='load')return 'No se ha podido cargar el lector de capturas. Revisa la conexión o escribe los turnos abajo.';
  return 'No se ha podido leer la captura. Inténtalo de nuevo.';
}
async function processFiles(files,reader){
  files=files.filter(f=>/^image\//.test(f.type)||/\.(png|jpe?g|webp)$/i.test(f.name));
  if(!files.length){toast('Elige imágenes (capturas de pantalla)');return}
  const out=$('aiOut'),stop=$('aiStop'),prog=$('ocrProg'),bar=$('ocrBar');aiCtl=new AbortController();stop.hidden=false;prog.hidden=false;bar.style.width='3%';
  $('drop').setAttribute('aria-disabled','true');
  const all=[],errors=[];
  for(let i=0;i<files.length;i++){
    if(aiCtl.signal.aborted)break;
    out.textContent=`Leyendo captura ${i+1} de ${files.length}…`;
    try{
      const arr=await reader(files[i],aiCtl.signal,msg=>{out.textContent=`Captura ${i+1} de ${files.length}: ${msg}`});
      const rows=(Array.isArray(arr)?arr:[]).filter(r=>r&&Number.isInteger(+r.dia)&&+r.dia>=1&&+r.dia<=31&&dowOf(r.semana)!=null);
      if(!rows.length){errors.push(`Captura ${i+1}: no encuentro turnos. ¿Es una captura de la pantalla «Mis turnos»?`);continue}
      // Cada captura se fecha por separado (pueden venir desordenadas)
      const txt=rows.map(r=>`${+r.dia} ${DOW[dowOf(r.semana)]} ${String(r.turno||'Sin asignaciones').replace(/[^\d:/\-– a-záéíóúñ]/gi,'')||'Sin asignaciones'}`).join('\n');
      const p=parseImport(txt);
      if(p.error){errors.push(`Captura ${i+1}: ${p.error}`);continue}
      p.items.forEach(it=>all.push({date:it.date,line:`${parseIso(it.date).getDate()} ${DOW[it.dow]} ${it.rng.join(' / ')||(it.tag==='libre'?'Día libre':it.tag==='vacaciones'?'Vacaciones':'Sin asignaciones')}`}));
    }catch(err){errors.push(`Captura ${i+1}: ${aiErr(err)}`);if(err&&(err.code==='cancelled'||err.code==='rate_limited'||err.fatal))break}
    bar.style.width=`${Math.round((i+1)/files.length*100)}%`;
  }
  stop.hidden=true;setTimeout(()=>{prog.hidden=true},600);$('drop').removeAttribute('aria-disabled');
  const seen=new Map();all.sort((a,b)=>a.date<b.date?-1:1).forEach(x=>seen.set(x.date,x.line));
  if(seen.size){$('imp').value=[...seen.values()].join('\n');impPreview(false);}
  out.innerHTML=(seen.size?`<b class="ok">${seen.size} días leídos.</b> Revísalos abajo, sobre todo las horas y las vacaciones, y pulsa <b>Guardar turnos</b>.`:'')+(errors.length?`<div class="err" style="margin-top:6px">${errors.map(esc).join('<br>')}</div>`:'');
  if(seen.size)$('impOut').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
$('aiFiles').onchange=e=>{const f=[...e.target.files];e.target.value='';if(f.length&&sampleFn)processFiles(f,(file,signal)=>sampleFn.json(OCR_PROMPT,{images:[file],signal}))};
$('ocrFiles').onchange=e=>{const f=[...e.target.files];e.target.value='';if(f.length)processFiles(f,ocrRows)};
$('aiStop').onclick=()=>aiCtl&&aiCtl.abort();
const drop=$('drop');
['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',e=>{const f=[...(e.dataTransfer?.files||[])];if(f.length)processFiles(f,ocrRows)});
drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('ocrFiles').click()}});
drop.tabIndex=0;

// ---------- lector gratuito (Tesseract.js, se ejecuta en el dispositivo) ----------
let tessWorker=null,tessLoading=null;// [lector de texto, lector de recuadros de fecha]
function loadScript(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko({fatal:true,code:'load'});document.head.appendChild(s)})}
async function getWorker(onMsg){
  if(tessWorker)return tessWorker;
  if(!tessLoading)tessLoading=(async()=>{
    onMsg('preparando el lector…');
    if(!window.Tesseract)await loadScript('ocr/tesseract.min.js');
    const base=new URL('ocr/',location.href).href;
    const opt={workerPath:base+'worker-wrap.js',corePath:base+'core',langPath:base+'lang',workerBlobURL:false,cacheMethod:'none',
      logger:m=>{if(m.status&&m.status!=='recognizing text'&&m.progress<1)onMsg('preparando el lector…')}};
    const [a,b]=await Promise.all([Tesseract.createWorker('spa',1,opt),Tesseract.createWorker('spa',1,opt)]);
    await b.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'0123456789LunMarMiéJuevVieSábDomoaeéáis'});
    tessWorker=[a,b];return tessWorker;
  })().catch(e=>{tessLoading=null;throw {fatal:true,code:'load'}});
  return tessLoading;
}
const WDRE=/(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)/i;
// Lee una captura de "Mis turnos" de Orquest:
// 1) localiza los recuadros de fecha (negros, o rojos si es festivo) en la columna izquierda;
// 2) lee cada recuadro por separado (número + día de la semana);
// 3) lee el texto de la derecha de cada tarjeta (horarios / Día libre / Sin asignaciones);
// 4) un icono rosa a la derecha = vacaciones.
// Como los días de una captura son consecutivos, basta con leer bien algunos números para fechar todos.
async function ocrRows(file,signal,onMsg){
  const [w,wb]=await getWorker(onMsg);if(signal.aborted)throw{code:'cancelled'};
  const bm=await createImageBitmap(file),W=bm.width,H=bm.height;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(bm,0,0);
  const px=(x,y)=>cx.getImageData(x,y,1,1).data;
  const all=cx.getImageData(0,0,W,H).data,at=(x,y)=>{const k=(y*W+x)*4;return[all[k],all[k+1],all[k+2]]};
  const isBadge=([r,g,b])=>(r+g+b)/3<70||(r>190&&g<170&&b<160&&r-g>50);
  // 1) recuadros: tramos verticales del color del recuadro en x≈10 % del ancho
  let xs=0,badges=[];
  for(const fx of[0.1,0.12,0.08,0.14,0.06]){
    const x=Math.round(W*fx),found=[];let run=null;
    for(let y=0;y<H;y++){const on=isBadge(at(x,y));if(on&&!run)run={y0:y};if(!on&&run){run.y1=y;if(run.y1-run.y0>H*0.02&&run.y1-run.y0<H*0.12)found.push(run);run=null}}
    if(found.length>badges.length){badges=found;xs=x}
    if(badges.length>=5)break;
  }
  if(!badges.length)return[];
  // ancho del recuadro: se mide en su franja superior, donde aún no hay texto
  for(const b of badges){const yt=Math.round(b.y0+(b.y1-b.y0)*0.1);let x0=xs,x1=xs;while(x0>0&&isBadge(at(x0-1,yt)))x0--;while(x1<W-1&&isBadge(at(x1+1,yt)))x1++;b.x0=x0;b.x1=x1;}
  // 2) leer cada recuadro: texto blanco -> negro sobre blanco, ampliado
  onMsg('leyendo fechas…');
  for(const b of badges){
    const bw=b.x1-b.x0+1,bh=b.y1-b.y0,c=document.createElement('canvas'),k=3;c.width=bw*k+40;c.height=bh*k+40;const x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
    const d=cx.getImageData(b.x0,b.y0,bw,bh).data,o=x.createImageData(bw,bh);
    for(let i=0;i<d.length;i+=4){const t=d[i]>170&&d[i+1]>170&&d[i+2]>170;o.data[i]=o.data[i+1]=o.data[i+2]=t?0:255;o.data[i+3]=255}
    const tmp=document.createElement('canvas');tmp.width=bw;tmp.height=bh;tmp.getContext('2d').putImageData(o,0,0);
    x.imageSmoothingEnabled=true;x.drawImage(tmp,20,20,bw*k,bh*k);
    const {data}=await wb.recognize(c);if(signal.aborted)throw{code:'cancelled'};
    const t=data.text.replace(/\s+/g,' ');const n=t.match(/\b([0-3]?\d)\b/);const wd=t.match(WDRE);
    b.n=n&&+n[1]>=1&&+n[1]<=31?+n[1]:null;b.dow=wd?dowOf(wd[1]):null;
  }
  // 3) texto de la derecha
  onMsg('leyendo turnos…');
  const {data}=await w.recognize(cv,{},{text:true,blocks:true});if(signal.aborted)throw{code:'cancelled'};
  const words=[];for(const bl of data.blocks||[])for(const p of bl.paragraphs||[])for(const l of p.lines||[])for(const wd of l.words||[])words.push({t:wd.text.trim(),...wd.bbox});
  const gap=badges.length>1?(badges[1].y0-badges[0].y0):(badges[0].y1-badges[0].y0)*1.8;
  // Días de la semana: si alguno no se leyó, se deduce de los vecinos (son consecutivos)
  const known=badges.map((b,i)=>b.dow!=null?(b.dow-i+70)%7:null).filter(v=>v!=null);
  const vote=a=>{const m=new Map();a.forEach(v=>m.set(v,(m.get(v)||0)+1));let best=null,c=0;m.forEach((n,v)=>{if(n>c){c=n;best=v}});return best};
  const dow0=vote(known);if(dow0==null)return[];
  // Fecha: cada número leído propone una fecha de inicio; gana la más votada (y la más cercana a hoy)
  const today=new Date(),cands=[];
  badges.forEach((b,i)=>{if(b.n==null)return;for(let off=-6;off<=6;off++){const d=new Date(today.getFullYear(),today.getMonth()+off,b.n);if(d.getDate()!==b.n||d.getDay()!==(dow0+i)%7)continue;cands.push(iso(addDays(d,-i)))}});
  if(!cands.length)return[];
  const cnt=new Map();cands.forEach(c=>cnt.set(c,(cnt.get(c)||0)+1));
  const start=[...cnt.entries()].sort((a,b)=>b[1]-a[1]||Math.abs(parseIso(a[0])-today)-Math.abs(parseIso(b[0])-today))[0][0];
  return badges.map((b,i)=>{
    const date=addDays(parseIso(start),i),top=b.y0-gap*0.15,bot=b.y1+gap*0.15;
    const txt=words.filter(v=>v.x0>b.x1&&(v.y0+v.y1)/2>top&&(v.y0+v.y1)/2<bot).map(v=>v.t).join(' ')
      .replace(/[Oo](?=\d)/g,'0').replace(/(\d)[.;,](\d\d)/g,'$1:$2').replace(/(\d{1,2}:\d{2})\s*[-–—~=]+\s*(\d{1,2}:\d{2})/g,'$1-$2');
    let turno=(txt.match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}/g)||[]).join(' / ');
    if(!turno)turno=/libre/i.test(txt)?'libre':'';
    if(!turno){// icono rosa a la derecha de la tarjeta
      let pink=0;const y0=Math.max(0,Math.round(top)),y1=Math.min(H,Math.round(bot));
      for(let y=y0;y<y1;y+=2)for(let x=Math.round(W*0.8);x<W;x+=2){const[r,g,bb]=at(x,y);if(r>190&&bb>140&&g<170&&r-g>50)pink++}
      if(pink>30)turno='vacaciones';}
    return{dia:date.getDate(),semana:DOW[date.getDay()],turno};
  });
}

// ---------- ajustes ----------
function fillCfg(){
  const c=S.cfg;document.querySelectorAll('[data-k]').forEach(inp=>inp.value=c[inp.dataset.k]);
  $('perfilTxt').innerHTML=`<b>${c.cat==='encargado'?'Encargado/a':'Equipo'}</b> · ${c.contrato} h por semana · ${c.pagas} pagas`;
  $('nomHint').textContent=c.cat==='equipo'&&c.auto?`Calculados para ${c.contrato} h por semana con las tablas del convenio. Compáralos con tu nómina y corrígelos si no coinciden.`:'Copiados de tu nómina. Si cambian (subida de tablas, cambio de contrato), actualízalos aquí.';
  $('fest').value=S.fest.join('\n');
}
document.querySelectorAll('[data-k]').forEach(inp=>inp.addEventListener('change',()=>{
  const k=inp.dataset.k,c=S.cfg;c[k]=inp.type==='number'?(parseFloat(inp.value)||0):inp.value;
  if(k==='contrato'&&c.cat==='equipo'&&c.auto)Object.assign(c,equipoImportes(c.contrato));
  if(['base','convenio','manuVac'].includes(k))c.auto=false;
  save();fillCfg();toast('Guardado');
}));
$('festSave').onclick=()=>{const v=$('fest').value.split(/\s+/).filter(Boolean),ok=v.filter(s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(parseIso(s)));S.fest=[...new Set(ok)].sort();save();fillCfg();
  toast(v.length===ok.length?'Festivos guardados':`Guardados ${ok.length}; ${v.length-ok.length} con formato incorrecto`)};
const bk=$('bk'),bkOut=$('bkOut');
$('bkCopy').onclick=async()=>{bk.value=JSON.stringify(S);try{await navigator.clipboard.writeText(bk.value);toast('Datos copiados')}catch(e){bk.select();bkOut.textContent='Selecciona el texto y cópialo.'}};
$('bkLoad').onclick=()=>{try{const o=JSON.parse(bk.value);if(!o||typeof o!=='object'||!o.turnos)throw 0;
  S={turnos:o.turnos||{},cfg:migrate(o.cfg)||S.cfg,fest:o.fest||FEST_DEF.slice(),reales:o.reales||{}};save();toast('Datos restaurados');start()}catch(e){bkOut.innerHTML='<span class="err">Ese texto no es una copia de seguridad válida.</span>'}};
let clearArm=false;
$('bkClear').onclick=e=>{if(!clearArm){clearArm=true;e.target.textContent='¿Seguro? Pulsa otra vez';setTimeout(()=>{clearArm=false;e.target.textContent='Borrar turnos'},4000);return}
  S.turnos={};S.reales={};save();clearArm=false;e.target.textContent='Borrar turnos';toast('Turnos borrados')};

// ---------- configuración inicial ----------
const ob={horas:null,cat:null,pagas:null},HORAS=[12,16,20,24,30,40];
$('obHoras').innerHTML=HORAS.map(h=>`<button type="button" class="chip" data-h="${h}" aria-pressed="false">${h} h</button>`).join('');
function obPaint(){
  document.querySelectorAll('#obHoras .chip').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.h===ob.horas));
  document.querySelectorAll('[data-cat]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===ob.cat));
  document.querySelectorAll('[data-pagas]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.pagas===ob.pagas));
  $('obEnc').hidden=ob.cat!=='encargado';
}
document.querySelectorAll('#obHoras .chip').forEach(b=>b.onclick=()=>{ob.horas=+b.dataset.h;$('obHorasOtra').value='';obPaint()});
$('obHorasOtra').oninput=e=>{const v=parseFloat(e.target.value);ob.horas=v>0&&v<=40?v:null;obPaint()};
document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{ob.cat=b.dataset.cat;obPaint()});
document.querySelectorAll('[data-pagas]').forEach(b=>b.onclick=()=>{ob.pagas=+b.dataset.pagas;obPaint()});
$('obGo').onclick=()=>{
  const miss=[!ob.horas&&'tus horas de contrato',!ob.cat&&'tu categoría',!ob.pagas&&'tus pagas'].filter(Boolean);
  if(miss.length){$('obMsg').innerHTML=`<span class="err">Falta elegir ${miss.join(', ').replace(/, ([^,]*)$/,' y $1')}.</span>`;return}
  const c={...DEF,...(S.cfg||{}),cat:ob.cat,contrato:ob.horas,pagas:ob.pagas,cfgV:DEF.cfgV};
  if(ob.cat==='equipo'){Object.assign(c,equipoImportes(ob.horas),{auto:true})}
  else{c.auto=false;const g=id=>parseFloat($(id).value);
    c.base=g('obBase')||0;c.convenio=g('obConv')||0;c.precio=g('obPrecio')||0;c.manuVac=0;
    if(g('obN2')){c.n2Eur=g('obN2');c.n1Eur=r2(g('obN2')/25)}}
  S.cfg=c;save();start(ob.cat==='encargado'&&(!c.base||!c.precio)?'ajustes':null);
};
// Ejemplo de la bienvenida: tres turnos típicos sobre la línea de 24 h
function paintDemo(){
  const keep=S.turnos,cfgKeep=S.cfg;S.cfg=S.cfg||DEF;
  S.turnos={'2000-01-01':'7:00-15:00','2000-01-02':'15:30-18:30 / 20:00-1:00','2000-01-03':'18:00-2:00'};
  $('demo').innerHTML=Object.keys(S.turnos).map(d=>timeline(d)).join('');
  S.turnos=keep;S.cfg=cfgKeep;
}
function onboarding(){
  if(S.cfg){ob.horas=S.cfg.contrato;ob.cat=S.cfg.cat;ob.pagas=+S.cfg.pagas;
    if(S.cfg.cat==='encargado'){$('obBase').value=S.cfg.base||'';$('obConv').value=S.cfg.convenio||'';$('obPrecio').value=S.cfg.precio||'';$('obN2').value=S.cfg.n2Eur||''}}
  $('obHorasOtra').value=ob.horas&&!HORAS.includes(ob.horas)?ob.horas:'';
  paintDemo();obPaint();$('app').hidden=true;$('tabs').hidden=true;$('v-inicio').classList.add('on');window.scrollTo(0,0);
}
$('redo').onclick=onboarding;

// ---------- pestañas ----------
function show(v){
  document.querySelectorAll('.tab').forEach(b=>{if(b.dataset.v===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  document.querySelectorAll('#app .view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  if(v==='semana')renderWeek();if(v==='mes')renderMonth();if(v==='ajustes')fillCfg();
  window.scrollTo(0,0);
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>show(b.dataset.v));
function start(view){
  $('v-inicio').classList.remove('on');$('app').hidden=false;$('tabs').hidden=false;fillCfg();
  show(view||(Object.keys(S.turnos).length?'semana':'importar'));
}
if(S.cfg)start();else onboarding();
