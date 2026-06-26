const pages = {
  dashboard: { title: '대시보드', breadcrumb: '3학년 1반 / 홈' },
  ai: { title: 'AI 학급 도우미', breadcrumb: '3학년 1반 / AI 도우미' },
  timetable: { title: '시간표', breadcrumb: '3학년 1반 / 시간표' },
  notices: { title: '공지사항', breadcrumb: '3학년 1반 / 공지사항' },
  assessment: { title: '수행평가', breadcrumb: '3학년 1반 / 수행평가' },
  meal: { title: '급식 메뉴', breadcrumb: '3학년 1반 / 급식' },
  admin: { title: '관리자 패널', breadcrumb: '3학년 1반 / 관리자' }
};

// 통계 카운터
let statsData = {
  aiQuestions: 0,
  assessmentCount: 0,
  noticeCount: 0,
  pendingRequests: 0
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
  if (id === 'notices') {
    loadNotices();
  }
  if (id === 'assessment') {
    loadAssessments();
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
    statsData.aiQuestions++;
    updateDashboardStats();
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
    statsData.aiQuestions++;
    updateDashboardStats();
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

// ══════════════════════════════════════════════════════════════
// ══ 대시보드 동적 데이터 업데이트 ══
// ══════════════════════════════════════════════════════════════

function updateTodayInfo() {
  const now = new Date();
  const days = ['일','월','화','수','목','금','토'];
  const dayName = days[now.getDay()];
  const dateStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${dayName}요일`;
  
  // 현재 교시 계산
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  let currentPeriod = '-';
  if (totalMinutes >= 9*60 && totalMinutes < 10*60) currentPeriod = '1';
  else if (totalMinutes >= 10*60 && totalMinutes < 11*60) currentPeriod = '2';
  else if (totalMinutes >= 11*60 && totalMinutes < 12*60) currentPeriod = '3';
  else if (totalMinutes >= 13*60 && totalMinutes < 14*60) currentPeriod = '4';
  else if (totalMinutes >= 14*60 && totalMinutes < 15*60) currentPeriod = '5';
  else if (totalMinutes >= 15*60 && totalMinutes < 16*60) currentPeriod = '6';
  else if (totalMinutes >= 16*60 && totalMinutes < 17*60) currentPeriod = '7';
  
  const subtitle = `오늘은 ${dateStr} · ${currentPeriod}교시 진행 중`;
  const el = document.querySelector('.page#page-dashboard .page-sub');
  if (el) el.textContent = subtitle;
}

function updateDashboardStats() {
  // AI 질문 수
  const aiValue = document.querySelector('.stat-card:nth-child(2) .stat-value');
  if (aiValue) aiValue.textContent = statsData.aiQuestions;
  
  // 수행평가 수
  const assessValue = document.querySelector('.stat-card:nth-child(3) .stat-value');
  if (assessValue) assessValue.textContent = statsData.assessmentCount;
  
  // 대기 중 요청
  const pendingValue = document.querySelector('.stat-card:nth-child(4) .stat-value');
  if (pendingValue) pendingValue.textContent = statsData.pendingRequests;
}

async function loadNotices() {
  if (!window.db || !window.firebase) {
    console.error('Firestore not initialized');
    return;
  }

  try {
    const snap = await window.firebase.getDocs(
      window.firebase.collection(window.db, 'notices')
    );
    
    const notices = [];
    snap.forEach(doc => {
      const d = doc.data();
      notices.push({
        id: doc.id,
        tag: d.tag || 'notice',
        title: d.title || '제목 없음',
        content: d.content || '',
        date: d.date || '날짜 없음',
        author: d.author || '작성자 없음'
      });
    });

    notices.sort((a, b) => new Date(b.date) - new Date(a.date));
    statsData.noticeCount = notices.length;

    renderDashboardNotices(notices);
    renderNoticesPage(notices);
    updateNoticesBadge(notices.length);
    updateDashboardStats();

  } catch (e) {
    console.error('공지사항 로드 실패:', e);
  }
}

function renderDashboardNotices(notices) {
  const dashboardList = document.querySelector('.page#page-dashboard .notice-list');
  if (!dashboardList) return;

  dashboardList.innerHTML = notices.slice(0, 4).map(notice => {
    const tagClass = {
      '긴급': 'tag-urgent',
      '수행': 'tag-assess',
      '행사': 'tag-event',
      'notice': 'tag-notice'
    }[notice.tag] || 'tag-notice';

    return `
      <div class="notice-item">
        <span class="notice-tag ${tagClass}">${notice.tag}</span>
        <div class="notice-content">
          <div class="notice-title">${notice.title}</div>
          <div class="notice-meta">${notice.date} · ${notice.author}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderNoticesPage(notices) {
  const pageList = document.querySelector('.page#page-notices .notice-list');
  if (!pageList) return;

  pageList.innerHTML = notices.map(notice => {
    const tagClass = {
      '긴급': 'tag-urgent',
      '수행': 'tag-assess',
      '행사': 'tag-event',
      'notice': 'tag-notice'
    }[notice.tag] || 'tag-notice';

    return `
      <div class="notice-item" style="padding:14px 0">
        <span class="notice-tag ${tagClass}">${notice.tag}</span>
        <div class="notice-content">
          <div class="notice-title" style="font-size:14px">${notice.title}</div>
          <div class="notice-meta" style="margin-top:5px">${notice.date} · ${notice.author}</div>
        </div>
      </div>
    `;
  }).join('');
}

function updateNoticesBadge(count) {
  const badge = document.querySelector('.nav-item[onclick*="notices"] .nav-badge');
  if (badge) badge.textContent = count;
}

async function loadAssessments() {
  if (!window.db || !window.firebase) {
    console.error('Firestore not initialized');
    return;
  }

  try {
    const snap = await window.firebase.getDocs(
      window.firebase.collection(window.db, 'assessments')
    );
    
    const assessments = [];
    snap.forEach(doc => {
      const d = doc.data();
      assessments.push({
        id: doc.id,
        subject: d.subject || '과목',
        title: d.title || '제목 없음',
        date: d.date || '',
        range: d.range || '',
        dday: d.dday !== undefined ? d.dday : 0,
        order: d.order || 999
      });
    });

    assessments.sort((a, b) => (a.order || 999) - (b.order || 999));
    statsData.assessmentCount = assessments.length;

    renderAssessmentsPage(assessments);
    updateDashboardStats();

  } catch (e) {
    console.error('수행평가 로드 실패:', e);
  }
}

function renderAssessmentsPage(assessments) {
  const assessList = document.querySelector('.page#page-assessment .assess-list');
  if (!assessList) return;

  const subjectColorClass = {
    '국어': 'subj-kr',
    '수학': 'subj-math',
    '영어': 'subj-eng',
    '과학': 'subj-sci',
    '사회': 'subj-soc',
  };

  const daysLeftClass = (dday) => {
    if (dday <= 3) return 'days-soon';
    if (dday <= 7) return 'days-normal';
    return 'days-far';
  };

  const parseDate = (dateStr) => {
    const parts = dateStr.split('-');
    return { year: parts[0], month: parts[1], day: parts[2] };
  };

  assessList.innerHTML = assessments.map(a => {
    const dateParts = parseDate(a.date);
    const colorClass = subjectColorClass[a.subject] || 'subj-kr';
    const daysClass = daysLeftClass(a.dday);

    return `
      <div class="assess-item">
        <div class="assess-date">
          <div class="assess-day">${dateParts.day}</div>
          <div class="assess-month">
            ${new Date(a.date).toLocaleDateString('ko-KR', { month: 'short' }).toUpperCase()}
          </div>
        </div>
        <div class="assess-divider"></div>
        <div class="assess-subject ${colorClass}">${a.subject}</div>
        <div class="assess-info">
          <div class="assess-title">${a.title}</div>
          <div class="assess-range">${a.range}</div>
        </div>
        <div class="days-left ${daysClass}">D-${a.dday}</div>
      </div>
    `;
  }).join('');

  updateAssessmentStats(assessments);
}

function updateAssessmentStats(assessments) {
  const statsContainer = document.querySelector('.page#page-assessment .card:nth-child(2) .card-body');
  if (!statsContainer) return;

  const statsBySubject = {};
  assessments.forEach(a => {
    if (!statsBySubject[a.subject]) {
      statsBySubject[a.subject] = { total: 0, completed: 0 };
    }
    statsBySubject[a.subject].total++;
  });

  const subjectColors = {
    '국어': { color: '#7db3fa', hexColor: '#7db3fa' },
    '수학': { color: '#a89bfa', hexColor: '#7b6ef7' },
    '영어': { color: '#5de8c8', hexColor: '#4fd6b8' },
    '과학': { color: '#5dda9e', hexColor: '#4fd6a0' },
    '사회': { color: '#f7c44f', hexColor: '#f7c44f' },
  };

  const statsHtml = Object.entries(statsBySubject).map(([subject, stats]) => {
    const percentage = (stats.completed / stats.total * 100) || 0;
    const colors = subjectColors[subject] || { color: '#888', hexColor: '#888' };
    return `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
          <span style="color:${colors.color};font-weight:500">${subject}</span>
          <span style="color:var(--text3);font-family:'Space Mono',monospace;font-size:12px">${stats.completed}/${stats.total}</span>
        </div>
        <div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden">
          <div style="width:${percentage}%;height:100%;background:${colors.hexColor};border-radius:3px"></div>
        </div>
      </div>
    `;
  }).join('');

  const wrapper = document.querySelector('.page#page-assessment .card:nth-child(2) .card-body > div');
  if (wrapper) wrapper.innerHTML = statsHtml;
}

async function loadPendingRequests() {
  if (!window.db || !window.firebase) {
    console.error('Firestore not initialized');
    return;
  }

  try {
    const snap = await window.firebase.getDocs(
      window.firebase.collection(window.db, 'requests')
    );
    
    statsData.pendingRequests = snap.size;
    updateDashboardStats();
  } catch (e) {
    console.error('대기 요청 로드 실패:', e);
  }
}

// ══ 페이지 로드 시 초기화 ══
document.addEventListener('DOMContentLoaded', () => {
  // 날짜 업데이트
  updateTodayInfo();
  setInterval(updateTodayInfo, 60000); // 1분마다 업데이트
  
  // Firebase 초기화되면 데이터 로드
  const checkFirebase = setInterval(() => {
    if (window.firebase && window.db) {
      clearInterval(checkFirebase);
      loadNotices();
      loadAssessments();
      loadPendingRequests();
    }
  }, 500);
});
