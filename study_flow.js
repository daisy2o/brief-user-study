'use strict';
/* 사용자 평가(2026-11-24 계획) — 한 링크로 끝까지. 참가 번호가 흐름을 정한다(참가자가 고르지 않는다).
   개인 투자자 G: 안내·동의 → 브리핑 하나(자유롭게 봄) → 두 문항 → 제출
   종사자 E: 안내·동의 → 브리핑 하나 → 두 문항 → 검토 요청 → 검토 의견 → 제출 (모두 같은 흐름)
   답을 맞고 틀림으로 채점하지 않는다. 결론을 먼저 보이고, 근거·세부는 펼쳐서 본다. 화면 규칙은 index.html 의 디자인 규칙 그대로. */
const S=window.STIMULI,C=window.STUDY,$=document.getElementById('app'),Q=new URLSearchParams(location.search);
/* 11/24 회의 뒤 결정: 참가자가 그 뒤 주가를 기억해 답이 바뀌지 않게 날짜를 가린다('판단일'·'전날', AI 가 본 자료의 내용·수치는 그대로).
   11/24 밤 결정: 종목명 가림(종목 A·B…)은 풀고 실제 종목명을 보인다 — 날짜 가림만 남는다. */
const AG=window.AGENTS||{};
(function anonymize(){
 Object.values(S.days).forEach(d=>{
  const [y,mo,dd]=d.date.split('-').map(Number);
  const fix=s=>String(s).replace(/\d{4}-\d{2}-\d{2}/g,x=>x===d.date?'판단일':'전날').replace(/\d{1,2}월 \d{1,2}일(?: [월화수목금토일]요일)?/g,x=>x.startsWith(`${mo}월 ${dd}일`)?'판단일':'전날');
  const walk=o=>{ if(Array.isArray(o)) return o.map(walk); if(o&&typeof o==='object'){ for(const k in o){ if(['id','code','link','truth'].includes(k)) continue; o[k]=walk(o[k]); } return o; } return typeof o==='string'?fix(o):o; };
  ['name','dateLabel','market','sources','items','others','portfolio','marketFlags'].forEach(k=>{ if(d[k]!=null) d[k]=walk(d[k]); });
  d.anon=true; });
})();
/* 결과 자동 제출 주소(구글 Apps Script 웹 앱의 /exec). 비어 있으면 파일 공유·복사로 받는다. 로컬 시험 때만 ?submit= 로 바꿀 수 있다 */
const SUBMIT_URL='https://script.google.com/macros/s/AKfycbzN1F7-0oamiwVFQXjuDtPf-lUZ1IfBDL0n0wCGupwHCcjiK7JuKJv7OLIwfApjHRBqZA/exec';
const LOCAL=/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const SUBMIT=LOCAL ? (Q.get('submit')||'/preview-submit') : SUBMIT_URL;
/* test=1은 제출 데이터를 시험으로 표시한다. 루프백 미리보기는 로컬에서만 받는다. */
const TEST_LINK=Q.get('test')==='1', TEST=TEST_LINK||LOCAL;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I={doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',list:'<path d="M5 7h14M5 12h14M5 17h9"/>',cal:'<path d="M5 6h14v14H5zM5 10h14M9 4v4M15 4v4"/>',
 share:'<path d="M12 15V4M8 8l4-4 4 4M6 12v7h12v-7"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.5"/>',
 pen:'<path d="M5 19l1-4L16 5l3 3L9 18z"/><path d="M14 7l3 3"/>',lock:'<path d="M6 11h12v9H6z"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',exit:'<path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/>',
 flow:'<path d="M5 17l5-5 3 3 6-7"/><path d="M15 8h4v4"/>',bell:'<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',home:'<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',star:'<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>',
 wallet:'<path d="M4 7h16v12H4zM4 7l2-3h10l2 3M15 13h2"/>',grid:'<path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/>'};
const ic=n=>`<svg class="ic" viewBox="0 0 24 24">${I[n]}</svg>`;
const won=x=>Math.round(x).toLocaleString('ko-KR')+'원';
const pct=p=>`<span class="${p>=0?'up':'down'}">${p>=0?'+':''}${p.toFixed(2)}%</span>`;
const weightPct=w=>(w*100).toFixed(1)+'%';
/* 목표 비중 목록(종목 + 현금)은 합이 100.0% 로 보이게 가장 큰 나머지 방식으로 반올림한다(따로 반올림하면 99.9% 가 될 수 있다 — 11/25) */
const roundTo1000=ws=>{const raw=ws.map(w=>w*1000),fl=raw.map(Math.floor);let left=1000-fl.reduce((s,x)=>s+x,0);raw.map((x,i)=>[x-fl[i],i]).sort((p,q)=>q[0]-p[0]).forEach(([,i])=>{if(left>0){fl[i]++;left--;}});return fl.map(x=>(x/10).toFixed(1)+'%');};
const SRCIC={price:'flow',flows:'flow',indicators:'flow'};

/* ── 참가 번호와 흐름 ── */
const code=(Q.get('p')||'').toUpperCase(), valid=/^[EG]\d\d$/.test(code)&&+code.slice(1)>=1;
/* 배정표(S.assign)에 있는 번호는 그 순서, 공통 링크로 받은 그 뒤 번호는 순서 1~4 를 번호 순으로 돌아가며 */
/* 11/24 밤 결정: 종사자는 모두 10분판(브리핑 + 검토 요청) — only=a 는 받지 않는다 */
const mode=code[0]==='G'?'B':'BA', order=valid?(S.assign[code]||((+code.slice(1)-1)%4)+1):1;
const ORD={1:[['1','linked'],['2','plain']],2:[['1','plain'],['2','linked']],3:[['2','linked'],['1','plain']],4:[['2','plain'],['1','linked']]};
/* 11/24 밤: '시작 전' 두 질문은 뺀다 — 공통 링크 첫 화면에서 종사자·개인 투자자를 이미 고른다(번호의 E·G) */
const steps=[{t:'start'}];
/* 11/24 밤: 브리핑은 하나(stimuli_b.js 의 사례, 출처가 이어진 버전) — 두 버전 비교는 하지 않는다 */
if(mode.includes('B')){ steps.push({t:'brief',day:S.sets['1'][0],cond:'linked',b:0},{t:'bq'}); }
if(mode.includes('A')) steps.push({t:'review'},{t:'aq'});
steps.push({t:'end'});

/* ── 상태와 기록 ── */
/* 다른 문항 버전이나 시험 흐름에서 입력한 답은 현재 흐름으로 가져오지 않는다. */
const KEY=['mb5',code,mode,C.version,TEST?'test':'live'].join('_');
let st={v:2,study:C.version,idx:0,t0:Date.now(),consent:false,profile:{group:code[0]},B:{cases:{},answers:{}},A:{answers:{},bg:{},more:false,moreSeen:false},events:[],dead:0};
if(!Q.get('reset')){
  try{
    const current=JSON.parse(localStorage.getItem(KEY)||'null');
    if(current&&current.v===2&&current.study===C.version&&current.B?.answers&&current.A?.answers) st=current;
  }catch(e){}
}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}};
const log=(type,d)=>{st.events.push(Object.assign({t:Date.now()-st.t0,type},d||{})); save();};
let sub=null, shownAt=0, hidAt=0, toastT=null, sending=false;
const step=()=>steps[st.idx];
const CASE=s=>st.B.cases[s.day]||(st.B.cases[s.day]={id:s.day,cond:s.cond,b:s.b,ms:0,hid:0,opened:[],evOpened:[],expand:[]});

/* ── 브리핑을 본 시간: 화면에 보이는 동안만 센다(제한 시간 없음) ── */
function startClock(){ stopClock(); const s=step(); if(s.t!=='brief') return; CASE(s); shownAt=performance.now(); hidAt=document.hidden?shownAt:0; }
function stopClock(){ const s=step(); if(s&&s.t==='brief'&&shownAt){ if(!document.hidden) CASE(s).ms+=performance.now()-shownAt; shownAt=0; save(); } }
document.addEventListener('visibilitychange',()=>{ const s=step(); if(s.t!=='brief') return; const c=CASE(s);
  if(document.hidden){ if(shownAt) c.ms+=performance.now()-shownAt; hidAt=performance.now(); } else { if(hidAt) c.hid+=performance.now()-hidAt; hidAt=0; shownAt=performance.now(); } save(); });

/* ── 이동 ── */
function go(d){ stopClock(); sub=null; const n=st.idx+d; if(n<0||n>=steps.length) return;
  st.ret=null; st.retY=null; st.idx=n; log('step',{to:steps[n].t}); render(); startClock(); }
function toast(m){ let e=document.querySelector('.toast'); if(!e){e=document.createElement('div');e.className='toast';document.body.appendChild(e);} e.textContent=m; clearTimeout(toastT); toastT=setTimeout(()=>e.remove(),2200); }

/* ── 문항 ── */
const storeOf=name=>name==='bg'?st.A.bg:name==='bbg'?(st.B.bg||(st.B.bg={})):name==='b'?st.B.answers:st.A.answers;
function shown(q){
  if(!q.when) return true;
  const [key, values]=q.when;
  if(!values.includes(st.A.answers[key])) return false;
  return !q.requiresRequest||(!!st.A.answers.A2&&st.A.answers.A2!=='none');
}
const requiresText=(q,v)=>q.text&&(!q.textOptional||(q.textRequiredFor||[]).includes(v));
function answered(q,store){ const v=store[q.id]; if(!shown(q)) return true;
  if(q.type==='text') return q.optional||!!String(v||'').trim();
  if(!q.options.some(([key])=>key===v)) return !!q.optional;
  return !requiresText(q,v)||!!String(store[q.id+'_text']||'').trim(); }
function qHtml(q,name){ if(!shown(q)) return ''; const store=storeOf(name),v=store[q.id]; let h=`<div class="panel pad" style="margin-top:12px"><div class="q">${esc(q.q)}${q.optional?' <span class="meta">(선택)</span>':''}</div>`;
  if(q.lead) h+=`<p class="meta">${esc(q.lead)}</p>`;
  if(q.type==='text') h+=`<input type="text" class="line" data-q="${q.id}" data-store="${name}" maxlength="120" placeholder="한 줄로 적어 주세요" value="${esc(v||'')}">`;
  else h+=`<div class="opts ${q.grid?'g2':''}">${q.options.map(([k,l])=>`<button class="optb ${v===k?'sel':''}" aria-pressed="${v===k}" data-act="opt" data-q="${q.id}" data-store="${name}" data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
  if(q.text&&q.type!=='text'&&v!=null&&(!q.textOnlyWhenRequired||requiresText(q,v))) h+=`<input type="text" class="line" data-q="${q.id}_text" data-store="${name}" maxlength="120" placeholder="${esc(q.text)}${requiresText(q,v)?'':' (선택)'}" value="${esc(store[q.id+'_text']||'')}">`;
  return h+'</div>'; }
const allDone=(qs,name)=>qs.every(q=>answered(q,storeOf(name)));

/* ── 화면 조각 ── */
const note=()=>TEST?`<div class="note" style="color:#B42318;font-weight:700">테스트 모드 · 이 응답은 정식 결과에 들어가지 않아요</div>`:'';   /* 11/24 밤 결정: '연구용 화면 · 투자 조언 아님' 줄 삭제(동의 화면의 '과거 자료예요. 투자 조언이 아니에요'는 남음) */
const sticky=(label,act,dis)=>`<div class="sticky"><button class="cap pri" data-act="${act}" ${dis?'disabled':''}>${label}</button></div>`;
const back=(label,right)=>`<div class="back"><button data-act="back">‹ ${label||'이전'}</button><span>${right||''}</span></div>`;
const topbar=t=>`<div class="top"><div class="brand">${t}</div><div class="top-r"><div class="av">나</div></div></div>`;
const opin=o=>o.up===6?'AI 분석가 6명 모두 ‘오른다’':o.down===6?'AI 분석가 6명 모두 ‘내린다’':`AI 분석가 6명 중 ${o.up}명 ‘오른다’`;
const clean=t=>String(t).replace(/\s*[(\[](?:kr_[a-z_]+|price_info|universe_snapshot)[^)\]]*[)\]]/g,'').replace(/\s+([.,])/g,'$1').trim();
const evOf=d=>d.items.map((x,i)=>Object.assign({kind:'item',i},x,{text:clean(x.text)})).concat(d.others.map((x,i)=>Object.assign({kind:'other',i},x,{text:clean(x.text)})));
const opened=(s,k)=>CASE(s).expand.includes(k);
function weightComparison(portfolio, stock){
  const equalStock=portfolio.agents.reduce((sum,a)=>sum+(a.act==='이 종목 추천'&&a.n>0?1/a.n:0),0)/portfolio.agents.length;
  const equalCash=portfolio.agents.filter(a=>a.n===0).length/portfolio.agents.length;
  return `<table class="weight-compare" aria-label="같은 추천을 합친 두 방식의 목표 비중">
      <thead><tr><th scope="col">목표 비중</th><th scope="col">똑같이 나눔</th><th scope="col">성과 반영</th></tr></thead>
      <tbody><tr><th scope="row">${esc(stock.name)}</th><td>${weightPct(equalStock)}</td><td>${weightPct(stock.w)}</td></tr>
      <tr><th scope="row">현금</th><td>${weightPct(equalCash)}</td><td>${weightPct(portfolio.cash)}</td></tr></tbody>
    </table>`;
}
function weightDetails(portfolio, stock){
  const byStock=portfolio.agents.filter(a=>a.act==='이 종목 추천'&&a.n>0&&a.w>0);
  return `<div class="weight-details">
    <p class="meta">각 분석가의 가중치를 그 분석가가 추천한 종목에 똑같이 나눴어요. 추천이 없으면 그 몫은 현금으로 남아요.</p>
    <div class="src weight-parts"><span class="tag">${esc(stock.name)} 비중 계산</span>
      ${byStock.sort((a,b)=>b.w/b.n-a.w/a.n).map(a=>`<div class="kv"><span>분석가 ${a.agent} · ${weightPct(a.w)} ÷ ${a.n}종목</span><span>${weightPct(a.w/a.n)}</span></div>`).join('')}
    </div></div>`;
}
function recentRecord(record,s,key){
  const open=opened(s,key);
  return `<button class="fold2 analyst-record-button" data-act="expand" data-k="${key}" aria-expanded="${open}"><span>최근 ${record.days}거래일 기록</span><span class="chev" aria-hidden="true">${open?'⌃':'⌄'}</span></button>
    ${open?`<div class="src analyst-record"><div class="kv"><span>평균 수익이 플러스였던 날</span><span>추천 ${record.rec}일 중 ${record.plus}일</span></div>
    <div class="kv"><span>추천을 내지 않은 날</span><span>${record.none}일</span></div>
    <p class="meta">판단일 전에 확정된 기록이에요. 추천일 시가부터 다음 거래일 시가까지의 추천 종목 평균 수익을 셌어요. 거래비용 차감 전이에요.</p></div>`:''}`;
}
function chart(card){ const X=v=>((v+4)/8*310+20).toFixed(1);
  const label=card.bars.map(b=>`${b.label} ${b.v} %p/월, 90% 구간 ${b.lo}~${b.hi}`).join('. ');
  return `<svg role="img" aria-label="${esc(label)}" viewBox="0 0 350 ${card.bars.length*56+26}" style="display:block;width:100%;margin-top:12px"><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${card.bars.length*56}" stroke="#111" stroke-width="1"/>
   ${card.bars.map((b,i)=>{const y=i*56; return `<text x="20" y="${y+16}" font-size="13" fill="#3D3D3D">${esc(b.label)}</text><line x1="${X(b.lo)}" y1="${y+34}" x2="${X(b.hi)}" y2="${y+34}" stroke="#111" stroke-width="3" stroke-linecap="round"/><circle cx="${X(b.v)}" cy="${y+34}" r="6" fill="#111"/>
    <text x="330" y="${y+16}" font-size="13" font-weight="700" fill="#111" text-anchor="end">${b.v>0?'+':''}${b.v.toFixed(2)}%p</text>`;}).join('')}
   ${[-4,-2,0,2,4].map(v=>`<text x="${X(v)}" y="${card.bars.length*56+18}" font-size="11" fill="#6B6F76" text-anchor="middle">${v>0?'+':''}${v}</text>`).join('')}</svg>`; }

const V={
start:()=>{ const t=mode==='BA'?['약 10분 걸려요','과거 브리핑을 살펴보고 사내 시범 운영 검토에 답해요']:mode==='A'?['약 5분 걸려요','검토 요청 하나를 보고 의견을 남겨요']:['약 5분 걸려요','과거 브리핑을 살펴보고 어디까지 활용할지 답해요'];
 return note()+`<div class="back"><button data-act="home">‹ 처음 화면</button><span></span></div><div class="top"><div class="brand">모닝브리프</div><div></div></div>
 <div class="h1">${mode==='A'?'검토 요청 하나에<br>의견을 남겨 주세요':'AI 투자 브리핑을<br>써 보고 의견을 주세요'}</div>
 <div class="lead">${mode==='BA'?'브리핑 활용과 사내 시범 운영 검토에 관한 연구예요.':'투자 판단에 브리핑을 어떻게 활용할지 알아보는 연구예요.'} 맞고 틀린 답은 없어요.</div>
 <div class="panel">${[['clock',t[0],t[1]],['cal','과거 자료예요. 투자 조언이 아니에요',''],['pen','답과 본 과정을 참가 번호로 기록해요','이름은 입력하지 않아요'],(LOCAL?['share','이 Mac에서 시험 제출해요','시험 제출은 수집용 시트에 저장되지 않아요']:(SUBMIT?['share','제출하면 연구용 구글 시트에 저장돼요','연구 담당자만 보고, 수업 프로젝트 보고서·발표에만 써요']:['share','결과는 1:1로 보내요','연구 담당자 한 사람만 받고, 수업 프로젝트 보고서·발표에만 써요'])),['exit','언제든 그만둘 수 있어요',LOCAL?'':'보낸 뒤에도 번호를 알려 주면 지워요']].map(([i,a,b])=>`<div class="li"><div class="dot">${ic(i)}</div><div class="tx"><div class="nm">${a}</div>${b?`<div class="sm2">${b}</div>`:''}</div></div>`).join('')}</div>
 <button class="chk" data-act="consent"><span class="box ${st.consent?'on':''}">${ic('check')}</span>안내를 읽고 참여에 동의해요</button>`+sticky('동의하고 시작하기','next',!st.consent); },
profile:()=>{ if(sub&&sub.v==='inel') return note()+`<div class="center"><div class="h1" style="margin-top:72px">참여 조건을 확인해 주세요</div><div class="lead">이번 평가는 금융회사에서 투자, 리서치, 심사, 상품기획 관련 업무를 현재 하고 있거나 1년 이상 한 분, 또는 주식을 직접 거래해 본 분을 대상으로 해요. 시간을 내 주셔서 감사합니다.</div></div>
  <button class="link" data-act="uninel"><span>응답 다시 확인하기</span><span class="chev">›</span></button>`;
 return note()+back('뒤로','시작 전')+`<div class="h1">두 가지만 알려 주세요</div>
 <div class="panel pad" style="margin-top:12px"><div class="q" style="margin-bottom:12px">금융회사에서 투자, 리서치, 심사, 상품기획 관련 업무를 현재 하고 있거나 1년 이상 한 경험이 있나요?</div>
  <div class="two">${[['y','네'],['n','아니요']].map(([v,l])=>`<button class="cap sec ${st.profile.fin===v?'sel':''}" data-act="prof" data-k="fin" data-v="${v}">${l}</button>`).join('')}</div></div>
 <div class="panel pad" style="margin-top:12px"><div class="q" style="margin-bottom:12px">주식을 직접 거래한 경험은 얼마나 되나요?</div>
  <div class="two">${[['none','안 해 봤어요'],['lt1','1년 미만'],['1to5','1~5년'],['gt5','5년 넘게']].map(([v,l])=>`<button class="cap sec ${st.profile.exp===v?'sel':''}" data-act="prof" data-k="exp" data-v="${v}">${l}</button>`).join('')}</div></div>`
 +sticky(mode==='A'?'검토 요청 보기':'브리핑 보기','pnext',!(st.profile.fin&&st.profile.exp)); },
brief:s=>{ const d=S.days[s.day],m=d.market,o=d.opinions,p=d.portfolio,E=evOf(d),linked=s.cond==='linked';
 if(sub&&sub.v==='sources') return note(d)+`<div class="back"><button data-act="closesub">‹ ${sub.parent?.v==='ev'?'판단 근거':'브리핑'}</button><span></span></div>
  <div class="title">AI가 본 자료 <span class="code">${esc(d.name)}</span></div><div class="sub">이 사례에서 화면에 포함한 자료예요.</div>
  <div class="panel" style="margin-top:16px">${d.sources.map(y=>`<button class="li" data-act="source" data-sid="${esc(y.id)}" data-from="list"><div class="dot">${ic(SRCIC[y.id]||'doc')}</div><div class="tx"><div class="nm">${esc(y.label)} <span class="code">${esc(y.date)}</span></div><div class="sm1">${esc(y.lines[0])}</div></div><span class="chev">›</span></button>`).join('')}</div>`+sticky('돌아가기','closesub');
 if(sub&&sub.v==='source'){ const y=d.sources.find(z=>z.id===sub.sid),x=sub.parent?.v==='ev'?E[sub.parent.ev]:null,hl=linked&&x&&x.kind==='item'&&y.id===x.link.source?x.link.lines:[];
  return note(d)+`<div class="back"><button data-act="closesub">‹ ${sub.from==='list'?'자료 목록':'판단 근거'}</button><span></span></div>
  <div class="title">${esc(y.label)} <span class="code">${esc(d.name)}</span></div><div class="sub">${esc(y.date)} 기준</div>
  <div class="panel" style="margin-top:16px;padding:8px 20px">${y.lines.map((l,i)=>`<div class="raw">${hl.includes(i)?`<span class="hi">${esc(l)}</span>`:esc(l)}</div>`).join('')}</div>`+sticky('돌아가기','closesub'); }
 if(sub&&sub.v==='ev'){ const x=E[sub.ev],src=linked&&x.kind==='item'?d.sources.find(y=>y.id===x.link.source):null;
  return note(d)+`<div class="back"><button data-act="closesub">‹ 브리핑</button><span></span></div>
  <div class="panel pad"><span class="tag">판단 근거</span><div class="claim">${esc(x.text)}</div><div class="meta" style="margin-top:8px">AI 분석가 ${x.agent} · ${esc(x.srcLabel)} 자료를 보고 씀</div>
   ${src?`<div class="src"><span class="tag">AI가 본 자료 · ${esc(src.label)} ${esc(src.date)}</span>${x.link.lines.map(i=>`<div class="ln"><span class="hi">${esc(src.lines[i])}</span></div>`).join('')}</div>
    <button class="link" data-act="source" data-sid="${esc(src.id)}" data-from="link"><span>이 자료 전체 보기</span><span class="chev">›</span></button>`:''}
   <button class="link" data-act="sources"><span>AI가 본 자료 목록 · ${d.sources.length}건</span><span class="chev">›</span></button></div>`+sticky('브리핑으로 돌아가기','closesub'); }
 const top1=p.target.find(x=>x.code===d.code)||p.target[0], wOpen=opened(s,'weights');
 return note(d)+(st.ret!=null?'<div class="back"><button data-act="ret">‹ 질문으로 돌아가기</button><span></span></div>':back('참여 안내',''))+topbar('투자 브리핑')+`<div style="margin:4px 0 16px"><div style="font-size:14px;font-weight:600;color:var(--mute)">판단일 · 장 시작 전</div><div style="font-size:24px;font-weight:700;color:var(--ink);line-height:1.4;margin-top:6px">AI 분석가 6명의 판단을 모아<br>오늘 담을 비중을 정했어요</div></div>
 <div class="card"><div class="k">과거 사례 · 모의 포트폴리오 목표 비중</div><div class="big">${esc(top1.name)} 비중 ${weightPct(top1.w)}</div>
  <div class="hold">${(()=>{const ts=[...p.target].sort((a,b)=>(b.code===d.code)-(a.code===d.code)),lab=roundTo1000([...ts.map(x=>x.w),p.cash]);return ts.map((t,i)=>`<div class="hrow"><span>${esc(t.name)}</span><b>${lab[i]}</b></div>`).join('')+`<div class="hrow"><span>현금</span><b>${lab[ts.length]}</b></div>`;})()}</div></div>
 <div class="panel weight-panel">
  <div class="panel-intro"><strong>같은 추천, 다른 비중</strong><p class="meta">같은 추천을 분석가별로 똑같이 반영한 경우와 성과를 반영한 경우를 비교했어요.</p></div>
  ${weightComparison(p,top1)}
  <button class="fold2" data-act="expand" data-k="weights" aria-expanded="${wOpen}"><span>비중 계산 자세히 보기</span><span class="chev" aria-hidden="true">${wOpen?'⌃':'⌄'}</span></button>
 ${wOpen?weightDetails(p,top1):''}</div>
 <h2>${esc(d.name)}</h2>
 <div class="panel pad"><div class="meta" style="font-weight:600">전날 종가</div><div class="row2"><div><div class="price" style="margin-top:4px">${won(m.close)}</div><div class="chg">전날 하루 등락률 <span class="${m.pct>=0?'up':'down'}">${m.pct>=0?'+':''}${m.pct.toFixed(2)}%</span> <span class="meta">(${m.chg>=0?'+':''}${Math.round(m.chg).toLocaleString('ko-KR')}원)</span></div></div></div></div>
 <div class="panel pad" style="margin-top:12px"><div class="meta" style="font-weight:600">AI의 전망 · 다음 거래일</div><div class="h3" style="margin-top:6px">${opin(o)}</div><div class="bar">${Array.from({length:6},(_,i)=>`<i class="${i<o.up?'':'off'}"></i>`).join('')}</div>
  ${d.marketFlags.map(f=>{ const g=String(f); if(g.startsWith('의견 차이')) return ''; const v=g.match(/거래량 ([\d.]+)배/); return v?`전날 거래량이 평소의 ${v[1]}배였어요`:esc(g); }).filter(Boolean).map(x=>`<div class="meta" style="margin-top:6px">눈여겨볼 점 · ${x}</div>`).join('')}</div>
 <div class="panel" style="margin-top:12px"><div style="padding:16px 0 4px"><div style="font-size:17px;font-weight:700;color:var(--ink)">AI 분석가 6명의 판단</div></div>
  <button class="fold2" data-act="expand" data-k="help" style="border-top:0;padding:8px 0 14px"><span style="font-size:14px;font-weight:600;color:var(--body)">이 화면 읽는 법</span><span class="chev">${opened(s,'help')?'⌃':'⌄'}</span></button>
  ${opened(s,'help')?`<div class="meta" style="padding:0 0 14px;line-height:1.7">· <b>분석가</b>: 이 사례에서는 같은 자료를 받은 AI 분석가 여섯이 각각 판단했어요.<br>· <b>상승 확률</b>: 그 분석가가 본, 이 종목이 다음 거래일에 오를 가능성이에요. 50%보다 높으면 ‘오른다’로 적었어요.<br>· <b>추천</b>: 분석가가 오늘 사자고 고른 종목이에요. 확신이 없으면 추천을 내지 않아요.<br>· <b>가중치</b>: 여섯 의견을 합칠 때 각 분석가의 판단을 얼마나 반영하는지예요. 모델은 과거 추천 결과와 그날 분석 평가를 바탕으로 정해요.<br>· <b>비중</b>: 가진 돈 가운데 그 종목에 넣는 몫이에요. 추천을 내지 않은 분석가의 몫은 현금으로 남아요.</div>`:''}
  ${(AG[d.id]||[]).map(g=>{ const mine=E.map((x,k)=>[x,k]).filter(([x])=>x.agent===g.agent), w=(p.agents.find(a=>a.agent===g.agent)||{}).w||0, op=opened(s,'a'+g.agent), hid=Math.max(0,g.evTotal-mine.length);
   const head=g.rec?`${esc(d.name)} 추천`:(g.nrec?'다른 종목 추천':'추천 없음');
   const forecast=g.up!=null?`상승 확률 ${g.up}%`:'전망 없음';
   return `<button class="fold2 analyst-toggle" data-act="expand" data-k="a${g.agent}" aria-expanded="${op}">
    <span><span class="analyst-heading">분석가 ${g.agent} <span class="meta">${forecast}</span></span>
    <span class="meta">${head} · 분석가 가중치 ${weightPct(w)}</span></span><span class="chev" aria-hidden="true">${op?'⌃':'⌄'}</span></button>`
    +(op?`<div class="analyst-detail">
      ${mine.length?`<div class="analyst-label">판단 근거</div>`+mine.map(([x,k])=>`<button class="li" data-act="ev" data-ev="${k}"><div class="tx"><div class="two-l">${esc(x.text)}</div><div class="meta cut">${linked&&x.kind==='item'?'<b class="lk">자료 바로 보기</b> · ':''}${esc(x.srcLabel)} 자료</div></div><span class="chev">›</span></button>`).join(''):''}
      ${g.rec&&hid?`<p class="meta analyst-note">이 밖에 뉴스·리서치·컨센서스 자료를 쓴 근거 ${hid}개는 이 화면에 싣지 않았어요.</p>`:''}
      ${!g.rec&&!g.nrec?`<p class="meta analyst-note">추천을 내지 않아 이 분석가의 가중치 ${weightPct(w)}는 현금으로 남았어요.</p>`:''}
      ${g.record?recentRecord(g.record,s,'record'+g.agent):''}</div>`:'');
  }).join('')}
  <button class="fold2" data-act="sources"><span>AI가 본 자료 목록 · ${d.sources.length}건</span><span class="chev">›</span></button></div>`
 +(st.ret!=null?sticky('질문으로 돌아가기','ret'):sticky('다 봤어요','next')); },
bq:()=>{ const d=S.days[S.sets['1'][0]], p=d.portfolio, stock=p.target.find(x=>x.code===d.code)||p.target[0]; return note()+`<div class="back"><button data-act="revisit" data-b="0">‹ 브리핑 다시 보기</button><span></span></div><div class="h1">브리핑을 어떻게 쓰시겠어요?</div>
 <div class="panel pad"><strong>방금 본 과거 사례</strong>${weightComparison(p,stock)}
  <p class="meta">근거나 분석가별 판단은 위 ‘브리핑 다시 보기’에서 다시 열 수 있어요.</p></div>${C.B.questions.map(q=>qHtml(q,'b')).join('')}`+(mode==='B'?`<h2>투자 경험</h2>${C.B.background.map(q=>qHtml(q,'bbg')).join('')}`:'')+sticky(mode==='BA'?'다음으로':'마치기','next',!(allDone(C.B.questions,'b')&&(mode!=='B'||allDone(C.B.background,'bbg')))); },
/* 검토 자료와 A1·A2·A3를 한 화면에 둔다. */
review:()=>{ const A=C.A,qs=[A.q1,A.q2,A.q3];
 return note()+`<div class="back"><button data-act="back">‹ 뒤로</button><span></span></div>`+topbar('검토 요청')+`<div class="card"><div class="k">${esc(A.request.label)}</div><div class="big" style="font-size:24px">${esc(A.request.title)}</div><div class="s">${esc(A.request.sub)}</div></div>
 <h2>비교 결과</h2><div class="panel pad"><div class="h3">${esc(A.summary)}</div>${chart(A.card)}<div class="meta" style="margin-top:8px">${esc(A.legend)}</div>
  <p class="meta">${esc(A.card.scope)}</p>
  <dl class="review-findings">${A.keyFindings.map(f=>`<div><dt>${esc(f.title)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl>
  <button class="fold" data-act="amore"><span>비교 결과 자세히 보기</span><span>${st.A.more?'⌃':'⌄'}</span></button>
  ${st.A.more?`<div class="meta" style="margin-top:6px">${esc(A.card.note)}</div>`+A.more.map(m=>`<div class="oth" data-m="${m.id}"><div class="one2">${esc(m.t)}</div><div class="meta mwhy">${esc(m.why)}</div>${m.rows.map(r=>`<div class="kv"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join('')}</div>`).join(''):''}</div>
 <h2>검토 의견</h2>${qs.map(q=>qHtml(q,'a')).join('')}`
 +sticky('다음으로','next',!allDone(qs,'a')); },
aq:()=>{ const A=C.A; return note()+back('검토 요청 다시 보기','')+`<div class="h1">하시는 일</div>${A.background.map(q=>qHtml(Object.assign({},q,{grid:true}),'bg')).join('')}`+sticky('마치기','next',!allDone(A.background,'bg')); },
end:()=>{ const lead=!SUBMIT?'결과 파일을 공유하거나 복사한 글을 붙여 넣어, 링크를 보내 준 연구 담당자에게 카카오톡 1:1로 보내 주세요.'
  :st.sentRemote?(LOCAL?'시험 제출을 확인했어요. 수집용 시트에는 저장되지 않아요.':'제출됐어요. 이제 창을 닫아도 돼요. 고맙습니다.'):st.sendFail?'제출이 되지 않았어요. 다시 눌러 보고, 그래도 안 되면 아래 ‘결과 텍스트 복사하기’로 복사해 연구 담당자에게 1:1로 보내 주세요.':'아래 버튼을 누르면 결과가 연구 담당자에게 제출돼요.';
 return note()+(st.sentRemote?'':`<div class="back"><button data-act="back">‹ 뒤로</button><span></span></div>`)+`<div class="center"><div class="done" style="margin-top:${st.sentRemote?72:24}px">${ic('check')}</div><div class="h1">${SUBMIT&&st.sentRemote?'제출을 마쳤어요':'모두 마쳤어요'}</div><div class="lead">${lead}</div></div>
 <div class="panel" style="margin-top:8px"><div class="kv"><span>참여한 것</span><span>${mode==='BA'?'브리핑 · 검토 요청':mode==='A'?'검토 요청':'브리핑'}</span></div><div class="kv"><span>참가 번호</span><span>${esc(code)}</span></div></div>
 ${mode.includes('A')&&st.sentRemote?`<div class="panel" style="margin-top:12px"><button class="fold2" data-act="team"><span>연구진의 검토안 보기</span><span class="chev">${st.teamOpen?'⌃':'⌄'}</span></button>${st.teamOpen?`<div class="sm2" style="padding-bottom:16px;white-space:pre-line">${esc(C.A.team)}</div>`:''}</div>`:''}
 <button class="link" data-act="copy"><span>결과 텍스트 복사하기</span><span class="chev">›</span></button>`+(SUBMIT?sticky(st.sentRemote?'제출 완료':(sending?'제출하는 중…':'결과 제출하기'),'submitRemote',st.sentRemote||sending):sticky('결과 파일 공유하기','send')); }
};
function render(){ const s=step(); $.innerHTML=V[s.t](s); window.scrollTo(0,0); }
const keep=()=>{ const y=window.scrollY; render(); window.scrollTo(0,y); };
function openSub(view){ sub={...view,parent:sub,y:window.scrollY}; render(); }
function refreshSticky(){ const s=step(),tmp=document.createElement('div'); tmp.innerHTML=V[s.t](s); const a=document.querySelector('.sticky .cap'),b=tmp.querySelector('.sticky .cap'); if(a&&b) a.disabled=b.disabled; }

/* ── 누름 처리 ── */
$.addEventListener('input',e=>{ const q=e.target.dataset.q; if(!q) return; storeOf(e.target.dataset.store)[q]=e.target.value; save(); refreshSticky(); });
$.addEventListener('click',e=>{ const dead=e.target.closest('[data-dead]'); if(dead){ st.dead++; log('dead',{name:dead.dataset.dead}); toast('이 화면에서는 쓰지 않는 기능이에요'); return; }
 const b=e.target.closest('[data-act]'); if(!b||b.disabled) return; const act=b.dataset.act,s=step();
 if(act==='revisit'){ const to=steps.findIndex(x=>x.t==='brief'&&x.b===+b.dataset.b); stopClock(); st.ret=st.idx; st.retY=window.scrollY; st.idx=to; sub=null; const c=CASE(steps[to]); c.revisits=(c.revisits||0)+1; log('revisit',{b:+b.dataset.b}); render(); startClock(); return; }
 if(act==='ret'){ stopClock(); const y=st.retY||0; st.idx=st.ret; st.ret=null; st.retY=null; sub=null; log('return'); render(); window.scrollTo(0,y); return; }
 if(act==='next') return go(1);
 if(act==='back') return go(-1);
 if(act==='home'){ location.href=(/^(127\.0\.0\.1|localhost)$/.test(location.hostname)?'start.html':'./')+(TEST_LINK?'?test=1':''); return; }
 if(act==='consent'){st.consent=!st.consent; log('consent',{v:st.consent}); return render();}
 if(act==='prof'){st.profile[b.dataset.k]=b.dataset.v; save(); return render();}
 if(act==='pnext'){ if(st.profile.fin==='n'&&st.profile.exp==='none'){ sub={v:'inel'}; log('ineligible'); return render(); } return go(1); }
 if(act==='uninel'){ sub=null; return render(); }
 if(act==='opt'){ const store=storeOf(b.dataset.store), previous=store[b.dataset.q]; store[b.dataset.q]=b.dataset.v;
  const changedRequest=b.dataset.q==='A2'&&previous!==b.dataset.v;
  if(changedRequest) delete st.A.answers.A2_text;
  if(b.dataset.q==='B2'&&previous==='etc'&&store.B2!=='etc') delete store.B2_text;
  if(b.dataset.store==='a'&&(changedRequest||!shown(C.A.q3))){ delete st.A.answers.A3; delete st.A.answers.A3_text; }
  log('pick',{q:b.dataset.q,v:b.dataset.v}); return keep(); }
 if(act==='expand'){ const c=CASE(s),k=b.dataset.k; c.expand=c.expand.includes(k)?c.expand.filter(x=>x!==k):[...c.expand,k]; if(c.expand.includes(k)){ c.expandEver=c.expandEver||[]; if(!c.expandEver.includes(k)) c.expandEver.push(k); } log('expand',{day:s.day,k,open:c.expand.includes(k)}); return keep(); }
 if(act==='amore'){ st.A.more=!st.A.more; if(st.A.more) st.A.moreSeen=true; log('amore',{open:st.A.more}); return keep(); }
 if(act==='team'){ st.teamOpen=!st.teamOpen; log('team',{open:st.teamOpen}); return keep(); }
 if(act==='ev'){ const x=evOf(S.days[s.day])[+b.dataset.ev]; CASE(s).evOpened.push(`${x.kind}:${x.i}`); log('open_ev',{day:s.day,k:`${x.kind}:${x.i}`}); return openSub({v:'ev',ev:+b.dataset.ev}); }
 if(act==='sources'){ log('open_list',{day:s.day}); return openSub({v:'sources'}); }
 if(act==='source'){ CASE(s).opened.push(b.dataset.sid); log('open_source',{day:s.day,sid:b.dataset.sid,from:b.dataset.from}); return openSub({v:'source',sid:b.dataset.sid,from:b.dataset.from}); }
 if(act==='closesub'){ const y=sub?.y; sub=sub?.parent||null; render(); if(y!=null) window.scrollTo(0,y); return; }
 if(act==='send') return send();
 if(act==='copy') return copyText();
 if(act==='submitRemote') return submitRemote();
});

/* ── 결과 ── */
function result(full){ const dev={w:innerWidth,h:innerHeight,touch:navigator.maxTouchPoints>0,mobile:/Mobi|Android/i.test(navigator.userAgent)};
 const r={v:2,study:st.study||'2026-11-24',code,order,mode,sample:!!S.meta.sample,built:S.meta.built,started:st.t0,finished:st.fin||Date.now(),dev,profile:st.profile,dead:st.dead};
 if(mode.includes('B')) r.B={cases:Object.values(st.B.cases).sort((a,b)=>a.b-b.b).map(c=>({id:c.id,cond:c.cond,b:c.b,ms:Math.round(c.ms),hid:Math.round(c.hid),opened:c.opened,evOpened:c.evOpened,expand:c.expand,expandEver:c.expandEver||[],revisits:c.revisits||0})),answers:st.B.answers,bg:st.B.bg||{}};
 if(mode.includes('A')) r.A={answers:st.A.answers,bg:st.A.bg,more:!!(st.A.moreSeen||st.A.more),team:!!st.teamOpen};
 if(TEST) r.test=true;
 if(full) r.events=st.events; return r; }
const b64=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const compact=()=>'MB1:'+b64(JSON.stringify(result(false)));
const finish=()=>{ if(!st.fin){st.fin=Date.now(); log('finish');} };
async function send(){ finish(); const blob=new Blob([JSON.stringify(result(true))],{type:'application/json'}); const file=new File([blob],`morningbrief_${code}.json`,{type:'application/json'});
 try{ if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:'모닝브리프 결과 '+code}); log('sent',{how:'share'}); return toast('카카오톡에서 결과가 전송됐는지 확인해 주세요.'); } }catch(e){ if(e&&e.name==='AbortError') return; }
 const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); log('sent',{how:'download'}); toast('다운로드한 결과 파일을 담당자에게 1:1로 보내 주세요.'); }
async function submitRemote(){ if(sending||st.sentRemote) return; finish(); sending=true; st.sendFail=false; render(); log('submit_try',{});
 try{ const r=await fetch(SUBMIT,{method:'POST',body:JSON.stringify(Object.assign(result(true),TEST?{test:true}:{}))}); const j=await r.json(); if(!j||!j.ok) throw new Error((j&&j.error)||'bad response');
  st.sentRemote=true; log('sent',{how:'sheet'}); save(); toast('제출됐어요'); }
 catch(e){ st.sendFail=true; log('submit_fail',{msg:String(e&&e.message||e).slice(0,80)}); save(); toast('제출이 되지 않았어요'); }
 sending=false; render(); }
async function copyText(){ finish(); const t=compact();
 try{ await navigator.clipboard.writeText(t); log('sent',{how:'copy'}); toast('결과를 복사했어요. 담당자와의 1:1 채팅에 붙여 넣어 주세요.'); }
 catch(e){ const box=document.createElement('div'); box.className='code-box'; box.textContent=t; document.querySelector('.link').after(box); toast('아래 결과 텍스트를 길게 눌러 복사해 주세요.'); } }

/* ── 시작 ── */
if(!valid){ $.innerHTML=`<div class="center"><div class="h1" style="margin-top:96px">링크를 다시 확인해 주세요</div><div class="lead">받은 링크 그대로 열어야 해요.</div></div>`; }
else{ if(st.events.length===0) log('open',{order,mode}); else log('resume'); render(); startClock(); }
