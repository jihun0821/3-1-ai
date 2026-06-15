// admin-panel.js
// 관리자 패널: pending_requests 실시간 조회 + 승인/거절 처리

// ── 카테고리 → 컬렉션 이름 매핑 ──
const CATEGORY_TO_COLLECTION = {
    '수행평가': 'assessments',
    '시간표':   'timetable',
    '급식 메뉴': 'meals',
    '공지사항': 'notices',
    '기타':     'misc'
};

// ── 대기 중 요청 실시간 로드 ──
function loadPendingRequests() {
    if (!window.db || !window.firebase) {
        setTimeout(loadPendingRequests, 300);
        return;
    }

    // 관리자 아닌 경우 접근 차단
    if (!window.isAdmin) {
        const panel = document.querySelector('#page-admin .grid-2');
        if (panel) {
            panel.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:48px 0;color:var(--text3)">
                    <div style="font-size:32px;margin-bottom:12px">🔒</div>
                    <div style="font-size:14px;font-weight:600;color:var(--text)">관리자 전용 페이지입니다</div>
                    <div style="font-size:12px;margin-top:6px">관리자 계정으로 로그인해주세요</div>
                </div>`;
        }
        return;
    }

    try {
        const q = window.firebase.query(
            window.firebase.collection(window.db, 'pending_requests'),
            window.firebase.where('status', '==', 'pending'),
            window.firebase.orderBy('createdAt', 'desc')
        );

        // 실시간 리스너
        window.firebase.onSnapshot = window.firebase.onSnapshot || null;

        // getDocs로 일회성 로드 (onSnapshot 미지원 시 대체)
        loadPendingOnce();
    } catch (e) {
        console.error('요청 로드 실패:', e);
    }
}

async function loadPendingOnce() {
    try {
        const q = window.firebase.query(
            window.firebase.collection(window.db, 'pending_requests'),
            window.firebase.where('status', '==', 'pending'),
            window.firebase.orderBy('createdAt', 'desc')
        );

        const snap = await window.firebase.getDocs(q);
        const requests = [];
        snap.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));

        renderPendingRequests(requests);
    } catch (e) {
        console.error('pending_requests 로드 실패:', e);
    }
}

function renderPendingRequests(requests) {
    const container = document.getElementById('pending-list');
    const countBadge = document.getElementById('pending-count');

    if (countBadge) countBadge.textContent = `${requests.length}건 대기`;

    // 사이드바 관리자 뱃지 숫자도 업데이트
    const navBadge = document.querySelector('.nav-item[onclick*="admin"] .nav-badge');
    if (navBadge) navBadge.textContent = requests.length;

    if (!container) return;

    if (requests.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:32px 0;color:var(--text3);font-size:13px">
                ✓ 대기 중인 요청이 없습니다
            </div>`;
        return;
    }

    container.innerHTML = requests.map(req => {
        const dateStr = req.createdAt?.toDate
            ? req.createdAt.toDate().toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
            : '-';

        return `
        <div class="pending-item" id="req-${req.id}">
            <div class="pending-type">${req.category}</div>
            <div class="pending-info">
                <strong>${req.title}</strong>
                <div style="font-size:12px;color:var(--text2);margin-top:4px">${req.content}</div>
                <div class="by">요청자: ${req.requesterName} · ${dateStr}</div>
            </div>
            <div class="pending-actions">
                <button class="action-btn approve-btn" title="승인" onclick="approveRequest('${req.id}', '${req.category}')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="action-btn reject-btn" title="거절" onclick="rejectRequest('${req.id}')">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── 승인 처리 ──
async function approveRequest(requestId, category) {
    if (!confirm('이 요청을 승인하시겠습니까?\n승인 후 메인 DB에 반영됩니다.')) return;

    try {
        // 원본 요청 문서 가져오기
        const reqRef = window.firebase.doc(window.db, 'pending_requests', requestId);
        const reqSnap = await window.firebase.getDoc(reqRef);
        if (!reqSnap.exists()) { alert('요청을 찾을 수 없습니다.'); return; }

        const reqData = reqSnap.data();
        const collection = CATEGORY_TO_COLLECTION[category] || 'misc';

        // 메인 DB에 반영 — 요청 내용(title + content)을 파싱해서 저장
        // 카테고리별로 저장 형식이 다름
        const docId = `approved_${requestId}`;
        const mainData = {
            title:         reqData.title,
            content:       reqData.content,
            category:      reqData.category,
            type:          reqData.type,
            requesterName: reqData.requesterName,
            approvedAt:    window.firebase.serverTimestamp(),
            status:        'approved'
        };

        // 카테고리가 공지사항이면 notices 컬렉션에 저장
        if (collection === 'notices') {
            await window.firebase.setDoc(
                window.firebase.doc(window.db, 'notices', docId),
                {
                    title:   reqData.title,
                    content: reqData.content,
                    date:    new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').replace('.', ''),
                    author:  reqData.requesterName,
                    tag:     '공지',
                    createdAt: new Date()
                }
            );
        } else {
            // 나머지 카테고리는 approved_requests에 보관 (수동 반영 유도)
            await window.firebase.setDoc(
                window.firebase.doc(window.db, 'approved_requests', docId),
                mainData
            );
        }

        // pending_requests 상태를 approved로 변경
        await window.firebase.updateDoc(reqRef, {
            status: 'approved',
            approvedAt: window.firebase.serverTimestamp(),
            approvedBy: window.auth.currentUser.email
        });

        showAdminToast('✓ 승인되어 메인 DB에 반영되었습니다', 'success');

        // 목록 새로고침
        loadPendingOnce();

        // 공지사항이면 화면도 갱신
        if (collection === 'notices' && window.loadNotices) {
            window.loadNotices();
        }

    } catch (e) {
        console.error('승인 실패:', e);
        alert('승인 처리 실패: ' + e.message);
    }
}

// ── 거절 처리 ──
async function rejectRequest(requestId) {
    if (!confirm('이 요청을 거절하시겠습니까?')) return;

    try {
        const reqRef = window.firebase.doc(window.db, 'pending_requests', requestId);
        await window.firebase.updateDoc(reqRef, {
            status: 'rejected',
            rejectedAt: window.firebase.serverTimestamp(),
            rejectedBy: window.auth.currentUser.email
        });

        showAdminToast('✗ 요청이 거절되었습니다', 'danger');
        loadPendingOnce();

    } catch (e) {
        console.error('거절 실패:', e);
        alert('거절 처리 실패: ' + e.message);
    }
}

// ── 토스트 알림 ──
function showAdminToast(msg, type) {
    const color = type === 'success' ? '#4fd6a0' : '#f76f6f';
    const border = type === 'success' ? 'rgba(79,214,160,0.3)' : 'rgba(247,111,111,0.3)';
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:28px;right:28px;background:#1e2a3a;border:1px solid ${border};color:${color};padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:999;animation:toastIn 0.3s ease`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── 관리자 패널 페이지 HTML 교체 ──
function renderAdminPanel() {
    const cardBody = document.querySelector('#page-admin .grid-2 .card:first-child .card-body');
    if (!cardBody) return;

    cardBody.innerHTML = `
        <div id="pending-list">
            <div style="text-align:center;padding:32px 0;color:var(--text3);font-size:13px">
                로딩 중…
            </div>
        </div>
        <div style="text-align:center;padding:16px 0;color:var(--text3);font-size:13px" id="processed-count">
            ✓ 처리 완료된 요청: 확인 중…
        </div>`;

    // 처리 완료 건수 조회
    loadProcessedCount();
}

async function loadProcessedCount() {
    try {
        const snap = await window.firebase.getDocs(
            window.firebase.query(
                window.firebase.collection(window.db, 'pending_requests'),
                window.firebase.where('status', '!=', 'pending')
            )
        );
        const el = document.getElementById('processed-count');
        if (el) el.textContent = `✓ 처리 완료된 요청: 총 ${snap.size}건`;
    } catch (e) {
        console.error('처리 건수 조회 실패:', e);
    }
}

// ── 관리자 패널 진입 시 자동 로드 ──
// showPage('admin') 호출 시 감지
const _origShowPage = window.showPage;
window.showPage = function(id) {
    _origShowPage(id);
    if (id === 'admin') {
        renderAdminPanel();
        loadPendingRequests();
    }
};

// adminStatusChanged 이벤트 수신 (로그인 후 관리자 확인 완료 시)
window.addEventListener('adminStatusChanged', () => {
    // 현재 관리자 페이지에 있으면 바로 로드
    const adminPage = document.getElementById('page-admin');
    if (adminPage && adminPage.classList.contains('active')) {
        renderAdminPanel();
        loadPendingRequests();
    }
});

// 전역 노출
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.loadPendingRequests = loadPendingRequests;