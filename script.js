const pages = {
  dashboard: { title: '대시보드', breadcrumb: '3학년 2반 / 홈' },
  ai: { title: 'AI 학급 도우미', breadcrumb: '3학년 2반 / AI 도우미' },
  timetable: { title: '시간표', breadcrumb: '3학년 2반 / 시간표' },
  notices: { title: '공지사항', breadcrumb: '3학년 2반 / 공지사항' },
  assessment: { title: '수행평가', breadcrumb: '3학년 2반 / 수행평가' },
  meal: { title: '급식 메뉴', breadcrumb: '3학년 2반 / 급식' },
  admin: { title: '관리자 패널', breadcrumb: '3학년 2반 / 관리자' }
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.getElementById('topbar-title').textContent = pages[id].title;
  document.getElementById('topbar-breadcrumb').textContent = pages[id].breadcrumb;
  const navBtns = document.querySelectorAll('.nav-item');
  navBtns.forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'" + id + "'")) {
      btn.classList.add('active');
    }
  });
  if (id === 'meal' && document.getElementById('meal-day-selector').childElementCount === 0) {
    buildMealDaySelector();
  }
}

// Modal
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.remove('open');
  }
}

function submitRequest() {
  document.getElementById('modal-overlay').classList.remove('open');
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#1e2a3a;border:1px solid rgba(79,214,160,0.3);color:#4fd6a0;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:999;display:flex;align-items:center;gap:8px;animation:toastIn 0.3s ease';
  toast.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> 요청이 서브 DB에 저장되었습니다';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// AI Chat (demo)
const aiResponses = {
  '급식': '오늘(6월 9일 월요일) 중식 메뉴입니다:\n🍚 현미밥\n🥘 된장찌개\n🥩 제육볶음\n🥬 시금치나물\n🥒 깍두기\n🍶 요거트\n\n총 칼로리: 약 780 kcal',
  '시간표': '오늘(월요일) 시간표입니다:\n1교시 국어\n2교시 수학\n3교시 영어 ← 현재\n4교시 과학\n5교시 사회\n6교시 미술\n7교시 가정',
  '수행평가': '이번 주 수행평가 일정입니다:\n📝 6월 12일(목) - 국어 독서 감상문 제출 (D-3)\n📐 6월 16일(월) - 수학 단원 서술형 평가 (D-7)',
  '공지': '최근 공지사항입니다:\n🔴 [긴급] 내일 5·6교시 시간표 변경\n📝 국어 독서 감상문 제출 D-3\n🏃 체육대회 6월 20일 확정',
};

function addChatMessage(area, role, text) {
  const wrap = document.getElementById(area);
  const div = document.createElement('div');
  div.className = 'chat-msg' + (role === 'user' ? ' user' : '');
  div.innerHTML = role === 'user'
    ? `<div class="chat-avatar user-chat-avatar">나</div><div class="chat-bubble user-bubble">${text}</div>`
    : `<div class="chat-avatar ai-avatar">AI</div><div class="chat-bubble ai-bubble">${text.replace(/\n/g,'<br>')}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function addTyping(area) {
  const wrap = document.getElementById(area);
  const div = document.createElement('div');
  div.className = 'chat-msg'; div.id = 'typing-' + area;
  div.innerHTML = `<div class="chat-avatar ai-avatar">AI</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping(area) {
  const el = document.getElementById('typing-' + area);
  if (el) el.remove();
}

function getAIReply(text) {
  const t = text.toLowerCase();
  for (const [k, v] of Object.entries(aiResponses)) {
    if (t.includes(k)) return v;
  }
  return 'Firebase 학급 데이터를 검색했지만 관련 정보를 찾지 못했어요. 더 구체적으로 질문해주시거나, 정보가 없다면 "정보 등록 요청"을 통해 추가해주세요!';
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage('chat-area', 'user', text);
  input.value = '';
  addTyping('chat-area');
  setTimeout(() => {
    removeTyping('chat-area');
    addChatMessage('chat-area', 'ai', getAIReply(text));
  }, 1100);
}

function sendAIChat() {
  const input = document.getElementById('ai-chat-input');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage('ai-chat-area', 'user', text);
  input.value = '';
  addTyping('ai-chat-area');
  setTimeout(() => {
    removeTyping('ai-chat-area');
    addChatMessage('ai-chat-area', 'ai', getAIReply(text));
  }, 1200);
}

function handleChatKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }
function handleAIChatKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIChat(); } }

function setAIPrompt(text) {
  document.getElementById('ai-chat-input').value = text;
  document.getElementById('ai-chat-input').focus();
}

// Tab nav (공지사항)
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    this.closest('.card-header').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
  });
});

// ══ NEIS 급식 API 연동 ══
// ⚠️ 학교 코드는 아래에서 확인:
//    https://open.neis.go.kr/hub/schoolInfo?KEY=ee3525bfb94f40258c16eea2ddac370a&Type=json&SCHUL_NM=한일고&LCTN_SC_NM=충청남도
// 충남교육청 코드: N10 / 학교 코드: 실제 API 호출 후 SD_SCHUL_CODE 값 사용
const NEIS_KEY   = 'ee3525bfb94f40258c16eea2ddac370a';
const ATPT_CODE  = 'N10';      // 충청남도교육청
const SCHUL_CODE = '7441136';  // 공주 한일고등학교 (NEIS 검색 기준)

// CORS 프록시 목록 — 앞에서부터 순서대로 시도
const CORS_PROXIES = [
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const MEAL_TYPE = {
  '1': { label: '조식', emoji: '🌅', color: 'var(--accent)',  dotColor: '#4f8ef7', borderColor: 'rgba(79,142,247,0.2)' },
  '2': { label: '중식', emoji: '☀️', color: 'var(--accent3)', dotColor: '#4fd6b8', borderColor: 'rgba(79,214,184,0.2)' },
  '3': { label: '석식', emoji: '🌙', color: 'var(--warn)',    dotColor: '#f7c44f', borderColor: 'rgba(247,196,79,0.2)' },
};

let currentMealDate = null;
let mealWeekCache   = {};  // dateStr → rows[]

// 날짜 유틸 — 해당 주 일요일~토요일 7일 반환
function getWeekDates(base) {
  const d = new Date(base);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay()); // 0=일 기준 일요일로 이동
  return Array.from({length: 7}, (_, i) => {
    const dt = new Date(sun);
    dt.setDate(sun.getDate() + i);
    return dt;
  });
}
function fmtDate(dt) {
  return `${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}`;
}
function fmtDisplay(dt) {
  const days = ['일','월','화','수','목','금','토'];
  return `${dt.getMonth()+1}월 ${dt.getDate()}일 (${days[dt.getDay()]})`;
}

// NEIS API → 프록시 폴백 체인으로 호출
async function fetchMealFromNEIS(dateStr) {
  const neisUrl = `https://open.neis.go.kr/hub/mealServiceDietInfo`
    + `?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=10`
    + `&ATPT_OFCDC_SC_CODE=${ATPT_CODE}&SD_SCHUL_CODE=${SCHUL_CODE}`
    + `&MLSV_YMD=${dateStr}`;

  let lastErr;
  for (const makeProxy of CORS_PROXIES) {
    try {
      const res = await fetch(makeProxy(neisUrl), {signal: AbortSignal.timeout(8000)});
      if (!res.ok) continue;
      const json = await res.json();
      // allorigins → { contents: "..." }, codetabs / corsproxy → 직접 JSON
      const data = json.contents ? JSON.parse(json.contents) : json;
      return data;
    } catch(e) { lastErr = e; }
  }
  throw lastErr || new Error('모든 프록시 실패');
}

function parseMealRows(data) {
  // NEIS 오류 응답: { RESULT: { CODE: "INFO-200", MESSAGE: "해당하는 데이터가 없습니다." } }
  if (!data || data.RESULT) return [];
  return data?.mealServiceDietInfo?.[1]?.row || [];
}

function renderMealCard(row) {
  const ti = MEAL_TYPE[row.MMEAL_SC_CODE] || {label:'급식', emoji:'🍽️', color:'var(--text2)', dotColor:'#888', borderColor:'var(--border)'};
  // 알레르기 번호(예: "1.2.5") 제거 + <br/> → 줄바꿈
  const items = row.DDISH_NM
    .replace(/<br\/>/gi, '\n')
    .split('\n')
    .map(s => s.replace(/[\d.]+$/, '').trim())
    .filter(Boolean);
  const kcal = row.CAL_INFO ? row.CAL_INFO.trim() : '';
  return `
    <div class="meal-type-card" style="border-color:${ti.borderColor}">
      <div class="meal-type-label" style="color:${ti.color}">${ti.emoji} ${ti.label}</div>
      ${items.map(item => `
        <div class="meal-item">
          <div class="meal-dot" style="background:${ti.dotColor}"></div>
          ${item}
        </div>`).join('')}
      ${kcal ? `<div class="meal-kcal">칼로리 <span>${kcal}</span></div>` : ''}
    </div>`;
}

// UI 상태 헬퍼
function mealShow(id) {
  ['meal-loading','meal-error','meal-empty','meal-content'].forEach(k => {
    document.getElementById(k).style.display = k === id ? 'block' : 'none';
  });
}

// 급식 API 상태 뱃지 업데이트
function setMealApiStatus(state) {
  const el = document.getElementById('meal-api-status');
  if (!el) return;
  if (state === 'ok')      el.innerHTML = '<div class="rag-dot"></div> NEIS 연결됨';
  else if (state === 'err') el.innerHTML = '<div class="rag-dot" style="background:var(--danger)"></div> 연결 실패';
  else                      el.innerHTML = '<div class="rag-dot" style="animation:none;opacity:.4"></div> 불러오는 중…';
}

async function loadMeal(dateObj) {
  currentMealDate = dateObj;
  const dateStr = fmtDate(dateObj);

  // 캐시 히트
  if (mealWeekCache[dateStr] !== undefined) {
    const rows = mealWeekCache[dateStr];
    if (rows.length === 0) mealShow('meal-empty');
    else { mealShow('meal-content'); document.getElementById('meal-grid').innerHTML = rows.map(renderMealCard).join(''); }
    return;
  }

  mealShow('meal-loading');
  setMealApiStatus('loading');

  try {
    const data = await fetchMealFromNEIS(dateStr);
    const rows = parseMealRows(data);
    mealWeekCache[dateStr] = rows;
    setMealApiStatus('ok');
    if (rows.length === 0) {
      mealShow('meal-empty');
    } else {
      mealShow('meal-content');
      document.getElementById('meal-grid').innerHTML = rows.map(renderMealCard).join('');
    }
  } catch(e) {
    setMealApiStatus('err');
    mealShow('meal-error');
    const em = document.getElementById('meal-error-msg');
    if (em) em.textContent = e.message || '네트워크 오류. 잠시 후 다시 시도해주세요.';
  }
}

function loadWeekMeals() {
  mealWeekCache = {};  // 전체 캐시 초기화
  buildMealDaySelector();
}

function buildMealDaySelector() {
  const today    = new Date();
  const weekDates = getWeekDates(today);   // 일~토 7일
  const todayStr  = fmtDate(today);
  const selector  = document.getElementById('meal-day-selector');
  const DAY_KO    = ['일','월','화','수','목','금','토'];

  // 주간 레이블 (일~토)
  const wl = document.getElementById('meal-week-label');
  if (wl) {
    const sun = weekDates[0], sat = weekDates[6];
    wl.textContent = `${sun.getMonth()+1}.${sun.getDate()} – ${sat.getMonth()+1}.${sat.getDate()}`;
  }

  selector.innerHTML = weekDates.map((dt, i) => {
    const ds      = fmtDate(dt);
    const isToday = ds === todayStr;
    const isSun   = i === 0;
    const isSat   = i === 6;
    // 주말 버튼은 색상 구분
    const weekendStyle = isSun
      ? 'color:#f78f8f;border-color:rgba(247,143,143,0.25)'
      : isSat
        ? 'color:#7db3fa;border-color:rgba(125,179,250,0.25)'
        : '';
    const todayStyle = isToday
      ? 'background:rgba(79,142,247,0.15);border-color:rgba(79,142,247,0.4);color:var(--accent);font-weight:700'
      : '';
    return `<button
      class="meal-day-btn${isToday ? ' active' : ''}"
      onclick="selectMealDay(this, '${dt.toISOString()}')"
      data-date="${ds}"
      style="${weekendStyle}${isToday ? ';'+todayStyle : ''}">
      ${DAY_KO[i]}<br>
      <span style="font-family:'Space Mono',monospace;font-size:11px">${dt.getDate()}</span>
      ${isToday ? '<br><span style="font-size:9px;letter-spacing:0">오늘</span>' : ''}
    </button>`;
  }).join('');

  // 오늘 날짜로 바로 급식 로드
  const target = weekDates.find(d => fmtDate(d) === todayStr) || weekDates[0];
  loadMeal(target);
}

function selectMealDay(btn, isoStr) {
  document.querySelectorAll('.meal-day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadMeal(new Date(isoStr));
}