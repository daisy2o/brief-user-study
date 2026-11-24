'use strict';
/* 사용자 평가(2026-11-24 계획) — 한 링크로 끝까지. 참가 번호가 흐름을 정한다(참가자가 고르지 않는다).
   개인 투자자 G: 안내·동의 → 브리핑 둘(자유롭게 봄) → 두 문항 → 제출
   종사자 E: 안내·동의 → 브리핑 둘 → 두 문항 → 검토 요청 카드 → 두 문항 → 제출 (only=a 면 브리핑 없이 검토만)
   답을 맞고 틀림으로 채점하지 않는다. 결론을 먼저 보이고, 근거·세부는 펼쳐서 본다. 화면 규칙은 index.html 의 디자인 규칙 그대로. */
const S=window.STIMULI,C=window.STUDY,$=document.getElementById('app'),Q=new URLSearchParams(location.search);
/* 결과 자동 제출 주소(구글 Apps Script 웹 앱의 /exec). 비어 있으면 파일 공유·복사로 받는다. 로컬 시험 때만 ?submit= 로 바꿀 수 있다 */
const SUBMIT_URL='https://script.google.com/macros/s/AKfycbzN1F7-0oamiwVFQXjuDtPf-lUZ1IfBDL0n0wCGupwHCcjiK7JuKJv7OLIwfApjHRBqZA/exec';
const SUBMIT=(/^(127\.0\.0\.1|localhost)$/.test(location.hostname)&&Q.get('submit'))||SUBMIT_URL;
/* 테스트 제출: 링크에 test=1 이 있거나 이 Mac 에서 열면 시트의 '테스트' 탭으로 간다(정식 기간에도). 화면 표시는 test=1 일 때만 */
const TEST_LINK=Q.get('test')==='1', TEST=TEST_LINK||/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
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
const pc=w=>Math.round(w*100)+'%';
const SRCIC={price:'flow',flows:'flow',indicators:'flow'};

/* ── 참가 번호와 흐름 ── */
const code=(Q.get('p')||'').toUpperCase(), valid=/^[EG]\d\d$/.test(code)&&+code.slice(1)>=1;
/* 배정표(S.assign)에 있는 번호는 그 순서, 공통 링크로 받은 그 뒤 번호는 순서 1~4 를 번호 순으로 돌아가며 */
const mode=code[0]==='G'?'B':(Q.get('only')==='a'?'A':'BA'), order=valid?(S.assign[code]||((+code.slice(1)-1)%4)+1):1;
const ORD={1:[['1','linked'],['2','plain']],2:[['1','plain'],['2','linked']],3:[['2','linked'],['1','plain']],4:[['2','plain'],['1','linked']]};
const steps=[{t:'start'},{t:'profile'}];
if(mode.includes('B')){ ORD[order].forEach(([set,cond],b)=>steps.push({t:'brief',day:S.sets[set][0],cond,b})); steps.push({t:'bq'}); }
if(mode.includes('A')) steps.push({t:'review'},{t:'aq'});
steps.push({t:'end'});

/* ── 상태와 기록 ── */
const KEY='mb4_'+code+'_'+mode;
let st={v:2,idx:0,t0:Date.now(),consent:false,profile:{},B:{cases:{},answers:{}},A:{answers:{},bg:{},cards:[],more:false},events:[],dead:0};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null'); if(s&&s.v===2&&s.B&&s.B.answers&&s.A&&s.A.cards&&!Q.get('reset')) st=s;}catch(e){}
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
function go(d){ stopClock(); sub=null; const n=st.idx+d; if(n<0||n>=steps.length) return; if(d<0&&steps[n].t==='start') return;
  st.idx=n; log('step',{to:steps[n].t}); render(); startClock(); }
function toast(m){ let e=document.querySelector('.toast'); if(!e){e=document.createElement('div');e.className='toast';document.body.appendChild(e);} e.textContent=m; clearTimeout(toastT); toastT=setTimeout(()=>e.remove(),2200); }

/* ── 문항 ── */
const storeOf=name=>name==='bg'?st.A.bg:name==='b'?st.B.answers:st.A.answers;
const shown=q=>!q.when||st.A.answers[q.when[0]]===q.when[1];
function answered(q,store){ const v=store[q.id]; if(!shown(q)) return true;
  if(q.type==='textOrNone') return store[q.id+'_none']===true||!!String(v||'').trim();
  if(q.type==='text') return q.optional||!!String(v||'').trim();
  if(v==null) return !!q.optional;
  return !(q.text&&!q.textOptional&&!String(store[q.id+'_text']||'').trim()); }
function qHtml(q,name){ if(!shown(q)) return ''; const store=storeOf(name),v=store[q.id]; let h=`<div class="panel pad" style="margin-top:12px"><div class="q">${esc(q.q)}${q.optional?' <span class="meta">(선택)</span>':''}</div>`;
  if(q.type==='text') h+=`<textarea data-q="${q.id}" data-store="${name}" maxlength="400">${esc(v||'')}</textarea>`;
  else if(q.type==='textOrNone') h+=(store[q.id+'_none']?'':`<textarea data-q="${q.id}" data-store="${name}" maxlength="300" placeholder="예: 다른 기간에서도 비용을 빼고 개선이 반복되는지">${esc(v||'')}</textarea>`)+`<div class="opts" style="margin-top:8px"><button class="optb ${store[q.id+'_none']?'sel':''}" data-act="none" data-q="${q.id}" data-store="${name}">${esc(q.none)}</button></div>`;
  else h+=`<div class="opts ${q.grid?'g2':''}">${q.options.map(([k,l])=>`<button class="optb ${v===k?'sel':''}" data-act="opt" data-q="${q.id}" data-store="${name}" data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
  if(q.text&&q.type!=='text'&&v!=null) h+=`<textarea data-q="${q.id}_text" data-store="${name}" maxlength="300" placeholder="${esc(q.text)}${q.textOptional?' (선택)':''}">${esc(store[q.id+'_text']||'')}</textarea>`;
  return h+'</div>'; }
const allDone=(qs,name)=>qs.every(q=>answered(q,storeOf(name)));

/* ── 화면 조각 ── */
const note=d=>(TEST_LINK?`<div class="note" style="color:#B42318;font-weight:700">테스트 모드 · 이 응답은 정식 결과에 들어가지 않아요</div>`:'')+`<div class="note">연구용 화면 · 투자 조언 아님${d?' · '+esc(d.date.slice(0,4))+'년 '+esc(d.dateLabel.split(' ').slice(0,2).join(' '))+'의 기록':''}</div>`;
const sticky=(label,act,dis)=>`<div class="sticky"><button class="cap pri" data-act="${act}" ${dis?'disabled':''}>${label}</button></div>`;
const back=(label,right)=>`<div class="back"><button data-act="back">‹ ${label||'이전'}</button><span>${right||''}</span></div>`;
const topbar=t=>`<div class="top"><div class="brand">${t}</div><div class="top-r"><button data-dead="search">${ic('search')}</button><button data-dead="bell">${ic('bell')}</button><div class="av">나</div></div></div>`;
const opin=o=>o.up===6?'AI 분석가 6명 모두 ‘오른다’':o.down===6?'AI 분석가 6명 모두 ‘내린다’':`AI 분석가 6명 중 ${o.up}명 ‘오른다’`;
const evOf=d=>d.items.map((x,i)=>Object.assign({kind:'item',i},x)).concat(d.others.map((x,i)=>Object.assign({kind:'other',i},x)));
const wrow=(name,w,me,off)=>`<div class="wrow"><span class="wn ${me?'me':''}">${esc(name)}</span><span class="wbar"><i class="${off?'off':''}" style="width:${Math.round(w*100)}%"></i></span><span class="wv">${pc(w)}</span></div>`;
const opened=(s,k)=>CASE(s).expand.includes(k);
function chart(card){ const X=v=>((v+4)/8*310+20).toFixed(1);
  return `<svg viewBox="0 0 350 ${card.bars.length*56+26}" style="display:block;width:100%;margin-top:12px"><line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${card.bars.length*56}" stroke="#111" stroke-width="1"/>
   ${card.bars.map((b,i)=>{const y=i*56; return `<text x="20" y="${y+16}" font-size="13" fill="#3D3D3D">${esc(b.label)}</text><line x1="${X(b.lo)}" y1="${y+34}" x2="${X(b.hi)}" y2="${y+34}" stroke="#111" stroke-width="3" stroke-linecap="round"/><circle cx="${X(b.v)}" cy="${y+34}" r="6" fill="#111"/>
    <text x="330" y="${y+16}" font-size="13" font-weight="700" fill="#111" text-anchor="end">${b.v>0?'+':''}${b.v.toFixed(2)}</text>`;}).join('')}
   ${[-4,-2,0,2,4].map(v=>`<text x="${X(v)}" y="${card.bars.length*56+18}" font-size="11" fill="#6B6F76" text-anchor="middle">${v>0?'+':''}${v}</text>`).join('')}</svg>`; }

const V={
start:()=>{ const t=mode==='BA'?['약 10분 걸려요','브리핑 두 개를 보고, 검토 요청 하나에 의견을 남겨요']:mode==='A'?['약 5분 걸려요','검토 요청 하나를 보고 의견을 남겨요']:['약 7분 걸려요','브리핑 두 개를 보고 짧게 답해요'];
 return note()+`<div class="top"><div class="brand">모닝브리프</div><div></div></div>
 <div class="h1">${mode==='A'?'검토 요청 하나에<br>의견을 남겨 주세요':'AI 투자 브리핑을<br>써 보고 의견을 주세요'}</div>
 <div class="lead">여러 AI 가 함께 만든 투자 리서치를 사람들이 어떻게 쓰는지 알아보는 연구예요. 맞고 틀린 답은 없어요.</div>
 <div class="panel">${[['clock',t[0],t[1]],['cal','과거 자료예요','2026년 5월의 기록이에요. 투자 조언이 아니에요.'],['pen','고른 답과 본 과정을 기록해요','고른 답, 적은 말, 펼쳐 본 내용, 본 시간'],['lock','참가 번호로만 기록해요','이름은 입력하지 않아요.'],['doc','수업 프로젝트 보고서와 발표에 써요','여러 사람의 의견을 모아 싣고, 인용은 번호로 해요.'],(SUBMIT?['share','제출하면 연구용 구글 시트에 저장돼요','연구 담당자만 볼 수 있어요.']:['share','결과는 1:1로 보내요','링크를 보내 준 연구 담당자 한 사람만 받아요.']),['exit','언제든 그만둘 수 있어요','보낸 뒤에도 번호를 알려 주면 지워요.']].map(([i,a,b])=>`<div class="li"><div class="dot">${ic(i)}</div><div class="tx"><div class="nm">${a}</div><div class="sm2">${b}</div></div></div>`).join('')}</div>
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
 if(sub&&sub.v==='sources') return note(d)+`<div class="back"><button data-act="closesub">‹ ${sub.ev!=null?'판단 근거':'브리핑'}</button><span></span></div>
  <div class="title">AI가 본 자료 <span class="code">${esc(d.name)}</span></div><div class="sub">공시·시세·수급·지표 ${d.sources.length}건이에요. AI 는 뉴스 같은 다른 자료도 봤고, 그 자료는 여기에 없어요.</div>
  <div class="panel" style="margin-top:16px">${d.sources.map(y=>`<button class="li" data-act="source" data-sid="${esc(y.id)}" data-from="list"><div class="dot">${ic(SRCIC[y.id]||'doc')}</div><div class="tx"><div class="nm">${esc(y.label)} <span class="code">${esc(y.date)}</span></div><div class="sm1">${esc(y.lines[0])}</div></div><span class="chev">›</span></button>`).join('')}</div>`+sticky('돌아가기','closesub');
 if(sub&&sub.v==='source'){ const y=d.sources.find(z=>z.id===sub.sid),x=sub.ev!=null?E[sub.ev]:null,hl=linked&&x&&x.kind==='item'&&y.id===x.link.source?x.link.lines:[];
  return note(d)+`<div class="back"><button data-act="${sub.from==='list'?'sources':'closesub'}">‹ ${sub.from==='list'?'자료 목록':'판단 근거'}</button><span></span></div>
  <div class="title">${esc(y.label)} <span class="code">${esc(d.name)}</span></div><div class="sub">${esc(y.date)} 기준</div>
  <div class="panel" style="margin-top:16px;padding:8px 20px">${y.lines.map((l,i)=>`<div class="raw">${hl.includes(i)?`<span class="hi">${esc(l)}</span>`:esc(l)}</div>`).join('')}</div>`+sticky('돌아가기','closesub'); }
 if(sub&&sub.v==='ev'){ const x=E[sub.ev],src=linked&&x.kind==='item'?d.sources.find(y=>y.id===x.link.source):null;
  return note(d)+`<div class="back"><button data-act="closesub">‹ 브리핑</button><span></span></div>
  <div class="panel pad"><span class="tag">판단 근거</span><div class="claim">${esc(x.text)}</div><div class="meta" style="margin-top:8px">AI 분석가 ${x.agent} · ${esc(x.srcLabel)} 자료를 보고 씀</div>
   ${src?`<div class="src"><span class="tag">AI가 본 자료 · ${esc(src.label)} ${esc(src.date)}</span>${x.link.lines.map(i=>`<div class="ln"><span class="hi">${esc(src.lines[i])}</span></div>`).join('')}</div>
    <button class="link" data-act="source" data-sid="${esc(src.id)}" data-from="link"><span>이 자료 전체 보기</span><span class="chev">›</span></button>`:''}
   <button class="link" data-act="sources"><span>AI가 본 자료 목록 · ${d.sources.length}건</span><span class="chev">›</span></button></div>`+sticky('브리핑으로 돌아가기','closesub'); }
 const top1=p.target[0], more=p.target.length-1, evOpen=opened(s,'ev'), wOpen=opened(s,'weights'), all=opened(s,'all');
 return note(d)+(st.ret!=null?`<div class="back"><button data-act="ret">‹ 질문으로 돌아가기</button><span>다시 보는 중</span></div>`:s.b?`<div class="back"><button data-act="back">‹ 첫 번째 브리핑</button><span></span></div>`:'')+topbar('투자 브리핑')+`<div class="sub" style="margin-top:-8px">${esc(d.dateLabel)} 오전 8시 · 브리핑 ${s.b+1} / 2</div>
 <div class="card"><div class="k">모의 포트폴리오 · 오늘 담을 비중</div><div class="big">${esc(top1.name)} 비중 ${pc(top1.w)}</div><div class="s">현금 비중 ${pc(p.cash)} · AI 분석가 6명의 판단을 가중치로 합친 모의 비중이에요</div>
  <div class="hold">${p.target.map(t=>`<div class="hrow"><span>${esc(t.name)}</span><b>${pc(t.w)}</b></div>`).join('')}${p.cash>0.005?`<div class="hrow"><span>현금</span><b>${pc(p.cash)}</b></div>`:''}</div></div>
 <h2>${esc(d.name)} <small style="margin-left:auto">${esc(m.prev)} 종가</small></h2>
 <div class="panel pad"><div class="row2"><div><div class="price" style="margin-top:0">${won(m.close)}</div><div class="chg"><span class="${m.pct>=0?'up':'down'}">${m.chg>=0?'+':''}${Math.round(m.chg).toLocaleString('ko-KR')}원 (${m.pct>=0?'+':''}${m.pct.toFixed(2)}%)</span></div></div></div>
  <div class="h3" style="margin-top:16px">${opin(o)}</div><div class="bar">${Array.from({length:6},(_,i)=>`<i class="${i<o.up?'':'off'}"></i>`).join('')}</div>
  <div class="meta">오른다 ${o.up} · 내린다 ${o.down}${o.none?` · 의견 없음 ${o.none}`:''} · 다음 거래일 전망${d.marketFlags.length?` · 시장 관측 ${d.marketFlags.map(esc).join(' · ')}`:''}</div></div>
 <div class="panel" style="margin-top:12px"><button class="fold2" data-act="expand" data-k="ev"><span>판단 근거 보기 <span class="cnt">${E.length}</span></span><span class="chev">${evOpen?'⌃':'⌄'}</span></button>
  ${evOpen?E.slice(0,all?E.length:5).map((x,k)=>`<button class="li" data-act="ev" data-ev="${k}"><div class="tx"><div class="two-l">${esc(x.text)}</div><div class="meta cut">${linked&&x.kind==='item'?'<b class="lk">자료 바로 보기</b> · ':''}${esc(x.srcLabel)} 자료 · AI 분석가 ${x.agent}</div></div><span class="chev">›</span></button>`).join('')+(E.length>5&&!all?`<button class="fold" data-act="expand" data-k="all"><span>${E.length-5}개 더 보기</span><span>⌄</span></button>`:''):''}
  <button class="fold2" data-act="expand" data-k="weights"><span>가중치 자세히 보기</span><span class="chev">${wOpen?'⌃':'⌄'}</span></button>
  ${wOpen?`<div style="padding-bottom:16px"><div class="meta">성과가 좋았던 AI 분석가에 더 큰 가중치를 줘요. 분석가마다 받은 가중치를 그 분석가가 추천한 종목에 똑같이 나눠 담아요.</div>
   <div class="src" style="margin-top:12px"><span class="tag">${esc(d.name)} 비중 ${pc(p.target.find(t=>t.code===d.code).w)}는 이렇게 모였어요</span>
    ${p.agents.filter(a=>a.act==='이 종목 추천'&&a.w>0.0005).sort((x,y)=>y.w/y.n-x.w/x.n).map(a=>`<div class="kv"><span>분석가 ${a.agent} · 가중치 ${pc(a.w)} ÷ 추천 ${a.n}종목</span><span>${(a.w/a.n*100).toFixed(1)}%</span></div>`).join('')}</div>
   ${p.agents.map(a=>wrow(`분석가 ${a.agent}`,a.w)+`<div class="meta wm">${esc(a.act)}${a.n>1?` · 추천 ${a.n}종목`:''}</div>`).join('')}</div>`:''}
  <button class="fold2" data-act="sources"><span>AI가 본 자료 목록 · ${d.sources.length}건</span><span class="chev">›</span></button></div>`
 +(st.ret!=null?sticky('질문으로 돌아가기','ret'):sticky(s.b?'다 봤어요':'다음 브리핑 보기','next')); },
bq:()=>note()+back('두 번째 브리핑','')+`<div class="h1">브리핑은 어떠셨어요?</div><div class="two" style="margin-top:12px">${[0,1].map(b=>`<button class="cap sec" data-act="revisit" data-b="${b}">${b?'두':'첫'} 번째 브리핑 다시 보기</button>`).join('')}</div>${C.B.questions.map(q=>qHtml(q,'b')).join('')}`+sticky(mode==='BA'?'다음으로':'마치기','next',!allDone(C.B.questions,'b')),
review:()=>{ const A=C.A,items=Object.fromEntries(A.checklist.flatMap(g=>g.items).map(x=>[x.id,x])),diag=Object.fromEntries(A.diagnosis.map(d=>[d.id,d]));
 if(sub&&sub.v==='card'){ const k=A.cards.find(c=>c.id===sub.id);
  return note()+`<div class="back"><button data-act="closesub">‹ 검토 요청</button><span>연구팀이 확인한 내용</span></div><div class="title">${esc(k.t)}</div><div class="sub">${esc(k.one)}</div>
  <div class="panel" style="margin-top:16px">${(k.items||[]).map(id=>`<div class="oth"><div class="one2">${esc(items[id].t)}</div><div class="meta">확인할 것 · ${esc(items[id].q)}</div><div class="sm2" style="margin-top:4px">${esc(items[id].f)}</div></div>`).join('')}
   ${(k.diag||[]).map(id=>`<div class="oth"><div class="one2">${esc(diag[id].q.replace(/^[①-④] /,''))}</div>${diag[id].rows.map(r=>`<div class="kv"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join('')}</div>`).join('')}</div>`+sticky('검토 요청으로 돌아가기','closesub'); }
 return note()+topbar('검토 요청')+`<div class="card"><div class="k">${esc(A.request.label)}</div><div class="big" style="font-size:24px">${esc(A.request.title)}</div><div class="s">${esc(A.request.sub)}</div></div>
 <div class="stepbar">${['결과 보기','궁금한 것 확인','검토 의견 남기기'].map((x,i)=>`<div><b>${i+1}</b>${x}</div>`).join('')}</div>
 <h2>1. 핵심 결과</h2><div class="panel pad"><div class="h3">${esc(A.card.title)}</div><div class="meta">${esc(A.headline)}</div>${chart(A.card)}
  <button class="fold" data-act="amore"><span>결과 자세히 보기</span><span>${st.A.more?'⌃':'⌄'}</span></button>
  ${st.A.more?A.card.bars.map(b=>`<div class="kv"><span>${esc(b.label)} · 회차별</span><span>${esc(b.rounds)}</span></div>`).join('')+A.card.rows.map(r=>`<div class="kv"><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join(''):''}</div>
 <h2>2. 결정 전에 궁금한 것</h2><div class="lead" style="margin:-4px 0 12px">검토하면서 확인하고 싶은 질문을 눌러 보세요. 연구팀이 확인한 내용이 나와요. 하나도 열지 않아도 괜찮아요.</div><div class="panel">${A.cards.map(k=>`<button class="li" data-act="card" data-id="${k.id}"><div class="tx"><div class="nm">${esc(k.t)}</div><div class="sm2">${esc(k.one)}</div></div>${st.A.cards.includes(k.id)?`<span class="ok">${ic('check')}</span>`:'<span class="chev">›</span>'}</button>`).join('')}</div>`
 +sticky('3. 검토 의견 남기기','next'); },
aq:()=>{ const A=C.A,qs=[A.q1,A.q2,A.q3]; return note()+back('검토 요청 다시 보기','')+`<div class="h1">검토 의견</div>${qs.map(q=>qHtml(q,'a')).join('')}
 <h2>하시는 일</h2>${A.background.map(q=>qHtml(Object.assign({},q,{grid:true}),'bg')).join('')}`+sticky('마치기','next',!(allDone(qs,'a')&&allDone(A.background,'bg'))); },
end:()=>{ const lead=!SUBMIT?'결과 파일을 공유하거나 복사한 글을 붙여 넣어, 링크를 보내 준 연구 담당자에게 카카오톡 1:1로 보내 주세요.'
  :st.sentRemote?'제출됐어요. 이제 창을 닫아도 돼요. 고맙습니다.':st.sendFail?'제출이 되지 않았어요. 다시 눌러 보고, 그래도 안 되면 아래 ‘결과 텍스트 복사하기’로 복사해 연구 담당자에게 1:1로 보내 주세요.':'아래 버튼을 누르면 결과가 연구 담당자에게 제출돼요.';
 return note()+`<div class="center"><div class="done">${ic('check')}</div><div class="h1">${SUBMIT&&st.sentRemote?'제출을 마쳤어요':'모두 마쳤어요'}</div><div class="lead">${lead}</div></div>
 <div class="panel" style="margin-top:8px"><div class="kv"><span>참여한 것</span><span>${mode==='BA'?'브리핑 · 검토 요청':mode==='A'?'검토 요청':'브리핑'}</span></div><div class="kv"><span>참가 번호</span><span>${esc(code)}</span></div></div>
 ${mode.includes('A')?`<div class="panel" style="margin-top:12px"><button class="fold2" data-act="team"><span>연구팀의 판단 보기</span><span class="chev">${st.teamOpen?'⌃':'⌄'}</span></button>${st.teamOpen?`<div class="sm2" style="padding-bottom:16px">${esc(C.A.team)}</div>`:''}</div>`:''}
 <button class="link" data-act="copy"><span>결과 텍스트 복사하기</span><span class="chev">›</span></button>`+(SUBMIT?sticky(st.sentRemote?'제출 완료':(sending?'제출하는 중…':'결과 제출하기'),'submitRemote',st.sentRemote||sending):sticky('결과 파일 공유하기','send')); }
};
function render(){ const s=step(); $.innerHTML=V[s.t](s); window.scrollTo(0,0); }
const keep=()=>{ const y=window.scrollY; render(); window.scrollTo(0,y); };
function refreshSticky(){ const s=step(),tmp=document.createElement('div'); tmp.innerHTML=V[s.t](s); const a=document.querySelector('.sticky .cap'),b=tmp.querySelector('.sticky .cap'); if(a&&b) a.disabled=b.disabled; }

/* ── 누름 처리 ── */
$.addEventListener('input',e=>{ const q=e.target.dataset.q; if(!q) return; storeOf(e.target.dataset.store)[q]=e.target.value; save(); refreshSticky(); });
$.addEventListener('click',e=>{ const dead=e.target.closest('[data-dead]'); if(dead){ st.dead++; log('dead',{name:dead.dataset.dead}); toast('이 화면에서는 쓰지 않는 기능이에요'); return; }
 const b=e.target.closest('[data-act]'); if(!b||b.disabled) return; const act=b.dataset.act,s=step();
 if(act==='revisit'){ const to=steps.findIndex(x=>x.t==='brief'&&x.b===+b.dataset.b); stopClock(); st.ret=st.idx; st.idx=to; sub=null; const c=CASE(steps[to]); c.revisits=(c.revisits||0)+1; log('revisit',{b:+b.dataset.b}); render(); startClock(); return; }
 if(act==='ret'){ stopClock(); st.idx=st.ret; st.ret=null; sub=null; log('return'); render(); return; }
 if(act==='next') return go(1);
 if(act==='back') return go(-1);
 if(act==='consent'){st.consent=!st.consent; log('consent',{v:st.consent}); return render();}
 if(act==='prof'){st.profile[b.dataset.k]=b.dataset.v; save(); return render();}
 if(act==='pnext'){ if(st.profile.fin==='n'&&st.profile.exp==='none'){ sub={v:'inel'}; log('ineligible'); return render(); } return go(1); }
 if(act==='uninel'){ sub=null; return render(); }
 if(act==='opt'){ const store=storeOf(b.dataset.store); store[b.dataset.q]=b.dataset.v; if(b.dataset.q==='A1'&&b.dataset.v!=='check'){ delete st.A.answers.A3; delete st.A.answers.A3_text; } log('pick',{q:b.dataset.q,v:b.dataset.v}); return keep(); }
 if(act==='expand'){ const c=CASE(s),k=b.dataset.k; c.expand=c.expand.includes(k)?c.expand.filter(x=>x!==k):[...c.expand,k]; log('expand',{day:s.day,k,open:c.expand.includes(k)}); return keep(); }
 if(act==='card'){ const id=b.dataset.id; if(!st.A.cards.includes(id)) st.A.cards.push(id); log('card',{id}); sub={v:'card',id,y:window.scrollY}; return render(); }
 if(act==='amore'){ st.A.more=!st.A.more; log('amore',{open:st.A.more}); return keep(); }
 if(act==='team'){ st.teamOpen=!st.teamOpen; log('team',{open:st.teamOpen}); return keep(); }
 if(act==='none'){ const store=storeOf(b.dataset.store),q=b.dataset.q; store[q+'_none']=!store[q+'_none']; if(store[q+'_none']) store[q]=''; log('pick',{q,v:'none:'+store[q+'_none']}); return keep(); }
 if(act==='ev'){ const x=evOf(S.days[s.day])[+b.dataset.ev]; sub={v:'ev',ev:+b.dataset.ev,y:window.scrollY}; CASE(s).evOpened.push(`${x.kind}:${x.i}`); log('open_ev',{day:s.day,k:`${x.kind}:${x.i}`}); return render(); }
 if(act==='sources'){ sub={v:'sources',ev:sub&&sub.ev!=null?sub.ev:null,y:sub&&sub.y!=null?sub.y:window.scrollY}; log('open_list',{day:s.day}); return render(); }
 if(act==='source'){ CASE(s).opened.push(b.dataset.sid); log('open_source',{day:s.day,sid:b.dataset.sid,from:b.dataset.from}); sub={v:'source',sid:b.dataset.sid,from:b.dataset.from,ev:sub&&sub.ev!=null?sub.ev:null,y:sub&&sub.y}; return render(); }
 if(act==='closesub'){ const y=sub&&sub.y; if(sub&&(sub.v==='sources'||sub.v==='source')&&sub.ev!=null) sub={v:'ev',ev:sub.ev,y}; else sub=null; render(); if(!sub&&y!=null) window.scrollTo(0,y); return; }
 if(act==='send') return send();
 if(act==='copy') return copyText();
 if(act==='submitRemote') return submitRemote();
});

/* ── 결과 ── */
function result(full){ const dev={w:innerWidth,h:innerHeight,touch:navigator.maxTouchPoints>0,mobile:/Mobi|Android/i.test(navigator.userAgent)};
 const r={v:2,study:C.version,code,order,mode,sample:!!S.meta.sample,built:S.meta.built,started:st.t0,finished:st.fin||Date.now(),dev,profile:st.profile,dead:st.dead};
 if(mode.includes('B')) r.B={cases:Object.values(st.B.cases).sort((a,b)=>a.b-b.b).map(c=>({id:c.id,cond:c.cond,b:c.b,ms:Math.round(c.ms),hid:Math.round(c.hid),opened:c.opened,evOpened:c.evOpened,expand:c.expand,revisits:c.revisits||0})),answers:st.B.answers};
 if(mode.includes('A')) r.A={answers:st.A.answers,bg:st.A.bg,cards:st.A.cards,more:st.A.more,team:!!st.teamOpen};
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
