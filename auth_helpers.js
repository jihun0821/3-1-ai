// auth-helpers.js
// 인증 관련 모달들을 열고/닫고/전환하는 헬퍼 함수
// auth.js 보다 먼저 또는 나중에 로드되어도 무방 (전역 함수로 동작)

const AUTH_MODAL_IDS = [
  'login-modal-overlay',
  'signup-modal-overlay',
  'profile-modal-overlay',
  'reset-modal-overlay',
  'profile-edit-modal-overlay'
];

function openLoginModal() {
  closeAllModals();
  document.getElementById('login-modal-overlay')?.classList.add('open');
}

function openSignupModal() {
  closeAllModals();
  document.getElementById('signup-modal-overlay')?.classList.add('open');
}

function openProfileModal() {
  closeAllModals();
  document.getElementById('profile-modal-overlay')?.classList.add('open');
}

function openResetModal() {
  closeAllModals();
  document.getElementById('reset-modal-overlay')?.classList.add('open');
}

// 로그인된 사용자가 자신의 프로필(닉네임/사진)을 수정할 때
function openProfileEditModal(profileData) {
  closeAllModals();
  const nicknameInput = document.getElementById('newNickname');
  if (nicknameInput && profileData) {
    nicknameInput.placeholder = profileData.nickname
      ? `현재: ${profileData.nickname}`
      : '변경할 닉네임 (2~20자)';
  }
  document.getElementById('profile-edit-modal-overlay')?.classList.add('open');
}

// 모든 인증 관련 모달 닫기
// e가 전달되고 overlay 자체를 클릭한 경우에만 닫음(다른 모달과 동일한 패턴),
// e가 없으면 강제로 모두 닫음
function closeAllModals(e) {
  AUTH_MODAL_IDS.forEach(id => {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    if (!e || e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
  // 정보 등록 요청 모달은 별도 closeModal()에서 처리하므로 여기서는 건드리지 않음
}

// 모달 A를 닫고 모달 B를 여는 전환 (예: 로그인 → 회원가입)
function switchModal(fromId, toId) {
  document.getElementById(fromId)?.classList.remove('open');
  document.getElementById(toId)?.classList.add('open');
}

window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.openProfileModal = openProfileModal;
window.openResetModal = openResetModal;
window.openProfileEditModal = openProfileEditModal;
window.closeAllModals = closeAllModals;
window.switchModal = switchModal;