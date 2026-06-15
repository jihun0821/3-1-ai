// db-load.js
// Firestore에서 시간표, 공지사항, 수행평가 데이터를 불러와서 화면에 렌더링

// ── 과목별 CSS 클래스 매핑 ──
const SUBJECT_CLASS = {
    '국어': 'subj-kr', '수학': 'subj-math', '영어': 'subj-eng',
    '과학': 'subj-sci', '사회': 'subj-soc', '미술': 'subj-art',
    '체육': 'subj-pe', '가정': 'subj-home', '음악': 'subj-music',
    '창체': 'subj-soc'
};

const TAG_CLASS = {
    '긴급': 'tag-urgent', '수행': 'tag-assess', '행사': 'tag-event', '공지': 'tag-notice'
};

const DAY_ORDER = ['월요일', '화요일', '수요일', '목요일', '금요일'];
const TODAY_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][new Date().getDay()];

// ── 시간표 로드 ──
async function loadTimetable() {
    try {
        const tbody = document.querySelector('.timetable tbody');
        if (!tbody) return;

        // 오늘 요일 표시 업데이트
        const todayLabel = document.querySelector('.card-header div[style*="color:var(--accent)"]');
        if (todayLabel) todayLabel.textContent = `오늘: ${TODAY_KO.replace('요일', '')}`;

        // 요일별 데이터 fetch
        const dataMap = {};
        for (const day of DAY_ORDER) {
            const snap = await window.firebase.getDoc(
                window.firebase.doc(window.db, 'timetable', day)
            );
            if (snap.exists()) dataMap[day] = snap.data();
        }

        // 오늘 컬럼 인덱스
        const todayIdx = DAY_ORDER.indexOf(TODAY_KO);

        // 테이블 행 재구성 (7교시)
        const lunchRow = tbody.querySelector('tr td[colspan="6"]')?.closest('tr');
        const rows = [...tbody.querySelectorAll('tr')].filter(r => !r.querySelector('td[colspan]'));

        rows.forEach((row, i) => {
            const period = i + 1;
            const cells = row.querySelectorAll('td');

            DAY_ORDER.forEach((day, di) => {
                const subject = dataMap[day]?.[period] || '-';
                const cls = SUBJECT_CLASS[subject] || 'subj-soc';
                const isToday = di === todayIdx;
                const cell = cells[di + 1]; // 첫 번째 td는 교시 번호
                if (cell) {
                    cell.className = isToday ? 'today-col' : '';
                    cell.innerHTML = `<div class="subject-cell ${cls}">${subject}</div>`;
                }
            });
        });

        // 오늘 열 헤더도 강조
        const ths = document.querySelectorAll('.timetable th');
        ths.forEach((th, i) => {
            if (i === 0) return;
            th.className = (i - 1 === todayIdx) ? 'today-col' : '';
        });

        console.log('시간표 로드 완료');
    } catch (e) {
        console.error('시간표 로드 실패:', e);
    }
}

// ── 공지사항 로드 ──
async function loadNotices() {
    try {
        const snap = await window.firebase.getDocs(
            window.firebase.collection(window.db, 'notices')
        );

        const notices = [];
        snap.forEach(doc => notices.push({ id: doc.id, ...doc.data() }));

        // 날짜 내림차순 정렬
        notices.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.date) - new Date(a.createdAt?.toDate?.() || a.date));

        // 대시보드 공지 (최근 4개)
        const dashList = document.querySelector('#page-dashboard .notice-list');
        if (dashList) {
            dashList.innerHTML = notices.slice(0, 4).map(n => `
                <div class="notice-item">
                    <span class="notice-tag ${TAG_CLASS[n.tag] || 'tag-notice'}">${n.tag}</span>
                    <div class="notice-content">
                        <div class="notice-title">${n.title}</div>
                        <div class="notice-meta">${n.date} · ${n.author}</div>
                    </div>
                </div>`).join('');
        }

        // 공지사항 페이지 (전체)
        const fullList = document.querySelector('#page-notices .notice-list');
        if (fullList) {
            fullList.innerHTML = notices.map(n => `
                <div class="notice-item" style="padding:14px 0">
                    <span class="notice-tag ${TAG_CLASS[n.tag] || 'tag-notice'}">${n.tag}</span>
                    <div class="notice-content">
                        <div class="notice-title" style="font-size:14px;font-weight:${n.tag === '긴급' ? '600' : '500'}">${n.title}</div>
                        <div class="notice-meta" style="margin-top:5px">${n.date} · ${n.author}</div>
                    </div>
                </div>`).join('');
        }

        console.log('공지사항 로드 완료:', notices.length + '건');
    } catch (e) {
        console.error('공지사항 로드 실패:', e);
    }
}

// ── 수행평가 로드 ──
async function loadAssessments() {
    try {
        const snap = await window.firebase.getDocs(
            window.firebase.collection(window.db, 'assessments')
        );

        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items.sort((a, b) => (a.order || 0) - (b.order || 0));

        // D-day 색상
        function ddayClass(d) {
            if (d <= 5) return 'days-soon';
            if (d <= 10) return 'days-normal';
            return 'days-far';
        }

        // 과목별 CSS
        function subjectClass(s) {
            return SUBJECT_CLASS[s] ? SUBJECT_CLASS[s] : 'subj-soc';
        }

        // 날짜 포맷 (2025-06-12 → 12 / Jun)
        function fmtAssessDate(dateStr) {
            const d = new Date(dateStr);
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return { day: d.getDate(), month: months[d.getMonth()] };
        }

        const assessList = document.querySelector('#page-assessment .assess-list');
        if (assessList) {
            assessList.innerHTML = items.map(item => {
                const { day, month } = fmtAssessDate(item.date);
                return `
                <div class="assess-item">
                    <div class="assess-date">
                        <div class="assess-day">${day}</div>
                        <div class="assess-month">${month}</div>
                    </div>
                    <div class="assess-divider"></div>
                    <div class="assess-subject ${subjectClass(item.subject)}">${item.subject}</div>
                    <div class="assess-info">
                        <div class="assess-title">${item.title}</div>
                        <div class="assess-range">${item.range}</div>
                    </div>
                    <div class="days-left ${ddayClass(item.dday)}">D-${item.dday}</div>
                </div>`;
            }).join('');
        }

        // 대기 중 요청 수 스탯카드 업데이트
        const assessStat = document.querySelector('.stat-card:nth-child(3) .stat-value');
        if (assessStat) assessStat.textContent = items.length;

        console.log('수행평가 로드 완료:', items.length + '건');
    } catch (e) {
        console.error('수행평가 로드 실패:', e);
    }
}

// ── 전체 데이터 로드 (페이지 진입 시 호출) ──
async function loadAllData() {
    if (!window.db || !window.firebase) {
        // Firebase 준비 안 됐으면 잠시 후 재시도
        setTimeout(loadAllData, 300);
        return;
    }
    await Promise.all([loadTimetable(), loadNotices(), loadAssessments()]);
}

// Firebase 준비 완료 시 자동 로드
window.addEventListener('firebase-ready', loadAllData);

// 전역 노출
window.loadAllData = loadAllData;
window.loadTimetable = loadTimetable;
window.loadNotices = loadNotices;
window.loadAssessments = loadAssessments;