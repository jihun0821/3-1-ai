const pages = {
  dashboard: { title: '대시보드', breadcrumb: '3학년 1반 / 홈' },
  ai: { title: 'AI 학급 도우미', breadcrumb: '3학년 1반 / AI 도우미' },
  timetable: { title: '시간표', breadcrumb: '3학년 1반 / 시간표' },
  notices: { title: '공지사항', breadcrumb: '3학년 1반 / 공지사항' },
  assessment: { title: '수행평가', breadcrumb: '3학년 1반 / 수행평가' },
  meal: { title: '급식 메뉴', breadcrumb: '3학년 1반 / 급식' },
  admin: { title: '관리자 패널', breadcrumb: '3학년 1반 / 관리자' }
};

// ══ 학교 시간표 정의 ══
const SCHOOL_SCHEDULE = [
  { period: 1, start: '08:40', end: '09:30' },
  { period: 2, start: '09:40', end: '10:30' },
  { period: 3, start: '10:40', end: '11:30' },
  { period: 4, start: '11:40', end: '12:30' },
  // 점심시간: 12:30 ~ 13:40
  { period: 5, start: '13:40', end: '14:30' },
  { period: 6, start: '14:40', end: '15:30' },
  { period: 7, start: '15:40', end: '16:30' },
  { period: 8, start: '16:40', end: '17:30' }
];

const BREAK_TIMES = [
  { start: '09:30', end: '09:40', name: '쉬는시간' },
  { start: '10:30', end: '10:40', name: '쉬는시간' },
  { start: '11:30', end: '11:40', name: '쉬는시간' },
  { start: '12:30', end: '13:40', name: '점심시간' },
  { start: '14:30', end: '14:40', name: '쉬는시간' },
  { start: '15:30', end: '15:40', name: '쉬는시간' },
  { start: '16:30', end: '16:40', name: '쉬는시간' }
];

// ══ 현재 교시 및 날짜 정보 업데이트 함수 ══
function updateCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  let statusMessage = '';
  let currentPeriod = null;
  
  // 종료 시간 이후 확인
  if (currentTime >= '17:30') {
    statusMessage = '정규시간 종료';
  } else {
    // 점심시간 확인
    if (currentTime >= '12:30' && currentTime < '13:40') {
      statusMessage = '점심시간';
    } else {
      // 쉬는 시간 확인
      for (const breakTime of BREAK_TIMES) {
        if (currentTime >= breakTime.start && currentTime < breakTime.end) {
          statusMessage = breakTime.name;
          break;
        }
      }
      
      // 교시 확인
      if (!statusMessage) {
        for (const period of SCHOOL_SCHEDULE) {
          if (currentTime >= period.start && currentTime < period.end) {
            currentPeriod = period.period;
            statusMessage = `${period.period}교시 진행 중`;
            break;
          }
        }
      }
      
      // 학교 시간 전
      if (!statusMessage && currentTime < '08:40') {
        statusMessage = '학교 시간 전';
      }
    }
  }
  
  // 대시보드 헤더 업데이트
  const subTextElement = document.querySelector('.page-sub');
  if (subTextElement) {
    subTextElement.textContent = `오늘은 ${year}년 ${month}월 ${date}일 ${dayOfWeek}요일입니다 · ${statusMessage}`;
  }
}

// 페이지 로드 시 초기 업데이트
document.addEventListener('DOMContentLoaded', function() {
  updateCurrentPeriod();
  // 매분 업데이트 (1분마다 확인)
  setInterval(updateCurrentPeriod, 60000);
});

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

// ══ Vercel API 주소 ══
const CHAT_API_URL = 'https://3-1-ai.vercel.app/api/chat';

// ══ Firestore에서 학급 데이터를 모아 context 문자열로 만들기 ══
async function gatherContext() {
  if (!window.db || !window.firebase) return '(DB 연결 안 됨)';

  const parts = [];

  try {
    // 시간표
    const DAYS = ['월요일', '화요일', '수요일', '목요일', '금요일'];
    const ttLines = ['[시간표]'];
    for (const day of DAYS) {
      const snap = await window.firebase.getDoc(
        window.firebase.doc(window.db, 'timetable', day)
      );
      if (snap.exists()) {
        const d = snap.data();
        const periods = Object.entries(d)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([p, s]) => `${p}교시:${s}`)
          .join(' ');
        ttLines.push(`${day}: ${periods}`);
      }
    }
    parts.push(ttLines.join('\n'));
  } catch (e) { parts.push('[시간표] 불러오기 실패'); }

  try {
    // 공지사항
    const snap = await window.firebase.getDocs(
      window.firebase.collection(window.db, 'notices')
    );
    const lines = ['[공지사항]'];
    snap.forEach(doc => {
      const d = doc.data();
      lines.push(`- [${d.tag}] ${d.title} (${d.date}, ${d.author}): ${d.content}`);
    });
    parts.push(lines.join('\n'));
  } catch (e) { parts.push('[공지사항] 불러오기 실패'); }

  try {
    // 수행평가
    const snap = await window.firebase.getDocs(
      window.firebase.collection(window.db, 'assessments')
    );
    const lines = ['[수행평가]'];
    snap.forEach(doc => {
      const d = doc.data();
      lines.push(`- ${d.subject} / ${d.title} / ${d.date} / 범위: ${d.range} / D-${d.dday}`);
    });
    parts.push(lines.join('\n'));
  } catch (e) { parts.push('[수행평가] 불러오기 실패'); }

  try {
    // 오늘 급식 (캐시에 있으면 사용)
    const todayStr = fmtDate(new Date());
    const cached = mealWeekCache[todayStr];
    if (cached && cached.length > 0) {
      const MEAL_LABEL = { '1': '조식', '2': '중식', '3': '석식' };
      const lines = ['[오늘 급식]'];
      cached.forEach(row => {
        const label = MEAL_LABEL[row.MMEAL_SC_CODE] || '급식';
        const menu = row.DDISH_NM
          .replace(/<br\/>/gi, ', ')
          .replace(/[\d.]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        lines.push(`- ${label}: ${menu} (${row.CAL_INFO || ''})`);
      });
      parts.push(lines.join('\n'));
    } else {
      parts.push('[오늘 급식] 데이터 없음 (급식 페이지 먼저 방문 시 로드됨)');
    }
  } catch (e) { parts.push('[오늘 급식] 불러오기 실패'); }

  return parts.join('\n\n');
}

// ══ 채팅 UI 헬퍼 ══
function addChatMessage(area, role, text) {
  const wrap = document.getElementById(area);
  const div = document.createElement('div');
  div.className = 'chat-msg' + (role === 'user' ? ' user' : '');
  div.innerHTML = role === 'user'
    ? `<div class="chat-avatar user-chat-avatar">나</div><div class="chat-bubble user-bubble">${text}</div>`
    : `<div class="chat-avatar ai-avatar">AI</div><div class="chat-bubble ai-bubble">${text.replace(/\n/g, '<br>')}</div>`;
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

// ══ Vercel API 호출 ══
async function callChatAPI(question) {
  const context = await gatherContext();
  const res = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `서버 오류 (${res.status})`);
  }
  const data = await res.json();
  return data.answer || '응답을 받지 못했어요.';
}

// ══ 대시보드 채팅 ══
async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage('chat-area', 'user', text);
  input.value = '';
  addTyping('chat-area');
  try {
    const answer = await callChatAPI(text);
    removeTyping('chat-area');
    addChatMessage('chat-area', 'ai', answer);
  } catch (e) {
    removeTyping('chat-area');
    addChatMessage('chat-area', 'ai', `⚠️ 오류가 발생했어요: ${e.message}`);
  }
}

// ══ AI 페이지 채팅 ══
async function sendAIChat() {
  const input = document.getElementById('ai-chat-input');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage('ai-chat-area', 'user', text);
  input.value = '';
  addTyping('ai-chat-area');
  try {
    const answer = await callChatAPI(text);
    removeTyping('ai-chat-area');
    addChatMessage('ai-chat-area', 'ai', answer);
  } catch (e) {
    removeTyping('ai-chat-area');
    addChatMessage('ai-chat-area', 'ai', `⚠️ 오류가 발생했어요: ${e.message}`);
  }
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
const NEIS_KEY   = 'ee3525bfb94f40258c16eea2ddac370a';
const ATPT_CODE  = 'N10';
const SCHUL_CODE = '7441136';

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
let mealWeekCache   = {};

function getWeekDates(base) {
  const d = new Date(base);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
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
      const data = json.contents ? JSON.parse(json.contents) : json;
      return data;
    } catch(e) { lastErr = e; }
  }
  throw lastErr || new Error('모든 프록시 실패');
}

function parseMealRows(data) {
  if (!data || data.RESULT) return [];
  return data?.mealServiceDietInfo?.[1]?.row || [];
}

function renderMealCard(row) {
  const ti = MEAL_TYPE[row.MMEAL_SC_CODE] || {label:'급식', emoji:'🍽️', color:'var(--text2)', dotColor:'#888', borderColor:'var(--border)'};
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

function mealShow(id) {
  ['meal-loading','meal-error','meal-empty','meal-content'].forEach(k => {
    document.getElementById(k).style.display = k === id ? 'block' : 'none';
  });
}

function setMealApiStatus(state) {
  const el = document.getElementById('meal-api-status');
  if (!el) return;
  if (state === 'ok')       el.innerHTML = '<div class="rag-dot"></div> NEIS 연결됨';
  else if (state === 'err') el.innerHTML = '<div class="rag-dot" style="background:var(--danger)"></div> 연결 실패';
  else                      el.innerHTML = '<div class="rag-dot" style="animation:none;opacity:.4"></div> 불러오는 중…';
}

async function loadMeal(dateObj) {
  currentMealDate = dateObj;
  const dateStr = fmtDate(dateObj);

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
  mealWeekCache = {};
  buildMealDaySelector();
}

function buildMealDaySelector() {
  const today     = new Date();
  const weekDates = getWeekDates(today);
  const todayStr  = fmtDate(today);
  const selector  = document.getElementById('meal-day-selector');
  const DAY_KO    = ['일','월','화','수','목','금','토'];

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

  const target = weekDates.find(d => fmtDate(d) === todayStr) || weekDates[0];
  loadMeal(target);
}

function selectMealDay(btn, isoStr) {
  document.querySelectorAll('.meal-day-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadMeal(new Date(isoStr));
}
