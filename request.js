// requests.js
// 정보 등록 요청(서브DB: pending_requests)을 Firestore에 저장
// auth.js의 window.firebase / window.db / window.auth 패턴을 따른다

async function submitRequest() {
    const user = window.auth?.currentUser;

    if (!user) {
        alert('정보 등록 요청은 로그인 후 이용 가능합니다.');
        return;
    }

    const categorySelect = document.getElementById('req-category');
    const typeSelect = document.getElementById('req-type');
    const titleInput = document.getElementById('req-title');
    const contentInput = document.getElementById('req-content');

    const category = categorySelect.value;
    const type = typeSelect.value;
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert('제목과 상세 내용을 입력해주세요.');
        return;
    }

    const submitBtn = document.getElementById('submit-request-btn');
    const originalHTML = submitBtn ? submitBtn.innerHTML : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '제출 중…';
    }

    try {
        const requesterName =
            window.currentUserProfile?.nickname ||
            user.displayName ||
            user.email?.split('@')[0] ||
            '익명';

        await window.firebase.addDoc(
            window.firebase.collection(window.db, 'pending_requests'),
            {
                category,
                type,
                title,
                content,
                status: 'pending',
                requesterUid: user.uid,
                requesterName,
                createdAt: window.firebase.serverTimestamp()
            }
        );

        document.getElementById('modal-overlay').classList.remove('open');
        titleInput.value = '';
        contentInput.value = '';

        showRequestToast('요청이 서브 DB에 저장되었습니다');
    } catch (error) {
        console.error('요청 제출 실패:', error);
        alert('요청 제출에 실패했습니다: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    }
}

function showRequestToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#1e2a3a;border:1px solid rgba(79,214,160,0.3);color:#4fd6a0;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:999;display:flex;align-items:center;gap:8px;animation:toastIn 0.3s ease';
    toast.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> ' + msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

window.submitRequest = submitRequest;