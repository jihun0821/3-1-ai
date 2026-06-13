// Firebase 설정 및 인증 관련 기능(다른 거랑 충동날 가능성 가장 높은거)

// Firebase 설정(아 몰라 뭐 돈관련 된것도 아니고 털어갈 개인정보도 없는데 그냥 쓰자
const firebaseConfig = {
    apiKey: "AIzaSyC_YES_I20XByZpXjCN2p1Vp5gueS4Op24",
    authDomain: "hsp-auth-22845.firebaseapp.com",
    projectId: "hsp-auth-22845",
    storageBucket: "hsp-auth-22845.firebasestorage.app",
    messagingSenderId: "1034282361573",
    appId: "1:1034282361573:web:a15b970a18ae7033552a0c",
    measurementId: "G-EQZ1QFGDZ2"
};

// Firebase 초기화 및 전역 변수 설정
let app, db, auth, storage;

// 현재 사용자 프로필 데이터
let currentUserProfile = null;
let isAdmin = false;

function initializeFirebase() {
    if (window.firebase && window.firebase.initializeApp) {
        app = window.firebase.initializeApp(firebaseConfig);
        db = window.firebase.getFirestore(app);
        auth = window.firebase.getAuth(app);
        storage = window.firebase.getStorage(app);
        
        window.db = db;
        window.auth = auth;
        window.storage = storage;

        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('firebase-ready'));
        }, 0);
        
        console.log("Firebase 초기화 완료");
        return true;
    }
    return false;
}

// Firebase 초기화 대기
function waitForFirebaseInit() {
    return new Promise((resolve) => {
        const checkInit = () => {
            if (initializeFirebase()) {
                resolve();
            } else {
                setTimeout(checkInit, 100);
            }
        };
        checkInit();
    });
}

// 인증 관련 함수들 모임 

// 로그인 함수
async function handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('이메일과 비밀번호를 입력해주세요.');
        return;
    }
    
    try {
        const userCredential = await window.firebase.signInWithEmailAndPassword(auth, email, password);
        console.log('로그인 성공:', userCredential.user.email);
        closeAllModals();
        showUserProfile();
    } catch (error) {
        console.error('로그인 실패:', error);
        alert('로그인에 실패했습니다: ' + error.message);
    }
}

// 회원가입 1단계 (이메일 주소 및 비밀번호 검증)
async function handleSignupNext() {
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // 이메일 검증
    if (!email.endsWith('@hanilgo.cnehs.kr')) {
        alert('한일고 이메일(@hanilgo.cnehs.kr)을 사용해주세요.');
        return;
    }
    
    // 비밀번호 검증
    if (password.length < 6) {
        alert('비밀번호는 6자 이상이어야 합니다.');
        return;
    }
    
    // 임시로 저장
    window.tempSignupData = { email, password };
    
    // 완료시 프로필 설정 모달로 이동
    openProfileModal();
}

// 회원가입 완료
async function handleSignupComplete() {
    const nicknameInput = document.getElementById('nickname');
    
    if (!nicknameInput) return;
    
    const nickname = nicknameInput.value.trim();
    
    if (!nickname) {
        alert('닉네임을 입력해주세요.');
        return;
    }
    
    if (nickname.length < 2 || nickname.length > 20) {
        alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
        return;
    }
    
    if (!window.tempSignupData) {
        alert('회원가입 정보가 없습니다. 다시 시도해주세요.');
        return;
    }
    
    try {
        // Firebase Auth용 회원가입(사이트 회원가입이랑 다름)
        const userCredential = await window.firebase.createUserWithEmailAndPassword(
            auth, 
            window.tempSignupData.email, 
            window.tempSignupData.password
        );
        
        const user = userCredential.user;
        
        // 프로필 업데이트
        await window.firebase.updateProfile(user, {
            displayName: nickname
        });
        
        // Firestore에 프로필 저장
        await window.firebase.setDoc(window.firebase.doc(db, 'profiles', user.uid), {
            nickname: nickname,
            email: user.email,
            createdAt: new Date()
        });
        
        // 포인트 초기화
        await window.firebase.setDoc(window.firebase.doc(db, 'user_points', user.uid), {
            points: 0,
            uid: user.uid,
            createdAt: new Date()
        });
        
        console.log('회원가입 성공:', user.email);
        closeAllModals();
        showUserProfile();
        
        // 임시 데이터 삭제
        delete window.tempSignupData;
        
        alert('회원가입이 완료되었습니다!');
        
    } catch (error) {
        console.error('회원가입 실패:', error);
        alert('회원가입에 실패했습니다: ' + error.message);
    }
}

// 비밀번호 재설정 이메일로 보내는 코드 
async function handlePasswordReset() {
    const emailInput = document.getElementById('resetEmail');
    
    if (!emailInput) return;
    
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('이메일을 입력해주세요.');
        return;
    }
    
    try {
        await window.firebase.sendPasswordResetEmail(auth, email);
        alert('비밀번호 재설정 이메일을 보냈습니다. 이메일을 확인해주세요.');
        closeAllModals();
    } catch (error) {
        console.error('비밀번호 재설정 실패:', error);
        alert('비밀번호 재설정에 실패했습니다: ' + error.message);
    }
}

// 프로필 저장
async function saveProfile() {
    const user = auth.currentUser;
    if (!user) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const newNicknameInput = document.getElementById('newNickname');
    const imageFileInput = document.getElementById('imageFileInput');
    
    if (!newNicknameInput) return;
    
    const newNickname = newNicknameInput.value.trim();
    const selectedFile = imageFileInput?.files[0];
    
    // 변경사항이 없으면 경고
    if (!newNickname && !selectedFile) {
        alert('변경할 닉네임을 입력하거나 새 프로필 사진을 선택해주세요.');
        return;
    }
    
    // 닉네임 길이 체크
    if (newNickname && (newNickname.length < 2 || newNickname.length > 20)) {
        alert('닉네임은 2자 이상 20자 이하로 입력해주세요.');
        return;
    }
    
    try {
        // 업로드 진행 표시
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) uploadProgress.style.display = 'block';
        
        let newAvatarUrl = null;
        
        // 이미지 업로드 처리
        if (selectedFile) {
            console.log('이미지 업로드 시작:', selectedFile.name);
            
            const imageRef = window.firebase.ref(storage, `profile_images/${user.uid}/${Date.now()}_${selectedFile.name}`);
            
            try {
                const uploadResult = await window.firebase.uploadBytes(imageRef, selectedFile);
                newAvatarUrl = await window.firebase.getDownloadURL(uploadResult.ref);
                console.log('이미지 업로드 성공:', newAvatarUrl);
            } catch (uploadError) {
                console.error('이미지 업로드 실패:', uploadError);
                alert('이미지 업로드에 실패했습니다.');
                return;
            }
        }
        
        // 업데이트할 데이터 준비
        const updateData = {};
        if (newNickname) updateData.nickname = newNickname;
        if (newAvatarUrl) updateData.avatar_url = newAvatarUrl;
        
        // Firestore 프로필 업데이트
        await window.firebase.setDoc(window.firebase.doc(db, 'profiles', user.uid), updateData, { merge: true });
        
        // Firebase Auth 프로필 업데이트
        const authUpdateData = {};
        if (newNickname) authUpdateData.displayName = newNickname;
        if (newAvatarUrl) authUpdateData.photoURL = newAvatarUrl;
        
        if (Object.keys(authUpdateData).length > 0) {
            await window.firebase.updateProfile(user, authUpdateData);
        }
        
        // 성공 메시지 표시
        const successMessage = document.getElementById('editSuccessMessage');
        if (successMessage) successMessage.style.display = 'block';
        
        // 프로필 새로고침
        await showUserProfile();
        
        console.log('프로필 저장 완료');
        
        // 1.5초 후 모달 닫기
        setTimeout(() => {
            closeAllModals();
        }, 1500);
        
    } catch (error) {
        console.error('프로필 저장 실패:', error);
        alert('프로필 저장에 실패했습니다.');
    } finally {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) uploadProgress.style.display = 'none';
    }
}

// 로그아웃
async function logout() {
    try {
        await window.firebase.signOut(auth);
        console.log('로그아웃 성공');
        currentUserProfile = null;

        // ── 관리자 상태 초기화 ──────────────────────────────────────
        isAdmin = false;
        window.isAdmin = false;
        window.dispatchEvent(new CustomEvent('adminStatusChanged'));
        // ────────────────────────────────────────────────────────────

        updateUIForAuthState(false);
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
}

// ── 관리자 여부 확인 (Firestore admins 컬렉션 기준) ──────────────────────────
async function checkAdminStatus(user) {
    try {
        const adminDocRef = window.firebase.doc(db, 'admins', user.email);
        const adminDoc = await window.firebase.getDoc(adminDocRef);
        return adminDoc.exists();
    } catch (error) {
        console.error('관리자 권한 확인 실패:', error);
        return false;
    }
}

// 사용자 프로필 관련 함수들 

// 사용자 프로필 표시
async function showUserProfile() {
    const user = auth.currentUser;
    
    if (user) {
        try {
            // Firestore에서 프로필 정보 가져오기(로그인시)
            const profileDocRef = window.firebase.doc(db, 'profiles', user.uid);
            const profileDoc = await window.firebase.getDoc(profileDocRef);
            
            let profileData = {
                email: user.email,
                nickname: user.displayName || user.email.split('@')[0],
                avatar_url: user.photoURL
            };
            
            if (profileDoc.exists()) {
                profileData = { ...profileData, ...profileDoc.data() };
            }
            
            // 포인트 정보 가져오기
            const pointsDocRef = window.firebase.doc(db, 'user_points', user.uid);
            const pointsDoc = await window.firebase.getDoc(pointsDocRef);
            profileData.points = pointsDoc.exists() ? pointsDoc.data().points || 0 : 0;

            // ── 관리자 여부 확인 후 전역 세팅 ──────────────────────────
            const adminResult = await checkAdminStatus(user);
            isAdmin = adminResult;
            window.isAdmin = adminResult;
            console.log('관리자 여부:', window.isAdmin);
            // adminStatusChanged 이벤트로 다른 모듈에 알림
            window.dispatchEvent(new CustomEvent('adminStatusChanged'));
            // ────────────────────────────────────────────────────────────
            
            currentUserProfile = profileData;
            updateUIForAuthState(true, profileData);
            
            console.log('프로필 로드 완료:', profileData);
            
        } catch (error) {
            console.error('프로필 로드 실패:', error);
            updateUIForAuthState(false);
        }
    } else {
        currentUserProfile = null;

        // ── 로그아웃 상태면 관리자 false ───────────────────────────
        isAdmin = false;
        window.isAdmin = false;
        // ────────────────────────────────────────────────────────────

        updateUIForAuthState(false);
    }
}

// UI 상태 업데이트
function updateUIForAuthState(isLoggedIn, profileData = null) {
    const loginBtn = document.querySelector('.login-btn');
    const profileCard = document.querySelector('.profile-card');
    
    if (isLoggedIn && profileData) {
        // 로그인 상태 - 로그인 버튼을 로그아웃 버튼으로 변경
        if (loginBtn) {
            loginBtn.textContent = '로그아웃';
            loginBtn.onclick = logout;
        }
        
        // 프로필 카드 업데이트
        if (profileCard) {
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.nickname || 'USER')}&background=27AE60&color=fff&size=80&bold=true`;
            const avatarUrl = profileData.avatar_url || defaultAvatar;
            
            profileCard.innerHTML = `
                <div class="profile-img" onclick="openProfileEditModal(currentUserProfile)" style="cursor: pointer; position: relative; transition: transform 0.3s ease;" title="프로필 편집하기">
                    <img src="${avatarUrl}" alt="프로필" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8rem;" class="edit-overlay">
                        편집
                    </div>
                </div>
                <div id="profileName">${profileData.nickname || '사용자'}</div>
                <div class="profile-stats">
                    <div class="points" id="userPoints">${profileData.points || 0}</div>
                    <div>포인트 순위: <span id="pointRank">-</span></div>
                    <div><span id="classRank">-</span>/<span id="totalRank">-</span></div>
                </div>
            `;
            
            // 프로필 이미지 호버 효과 추가
            const profileImg = profileCard.querySelector('.profile-img');
            const editOverlay = profileCard.querySelector('.edit-overlay');
            
            if (profileImg && editOverlay) {
                profileImg.addEventListener('mouseenter', () => {
                    profileImg.style.transform = 'scale(1.05)';
                    editOverlay.style.opacity = '1';
                });
                
                profileImg.addEventListener('mouseleave', () => {
                    profileImg.style.transform = 'scale(1)';
                    editOverlay.style.opacity = '0';
                });
            }
        }
        
    } else {
        // 로그아웃 상태
        if (loginBtn) {
            loginBtn.textContent = '로그인';
            loginBtn.onclick = openLoginModal;
        }
        
        // 프로필 카드 기본 상태로 복원
        if (profileCard) {
            profileCard.innerHTML = `
                <div class="profile-img"></div>
                <h4 id="profileName">게스트</h4>
                <div class="profile-stats">
                    <div class="points" id="userPoints">0</div>
                    <div>포인트 순위: <span id="pointRank">-</span></div>
                    <div><span id="classRank">-</span>/<span id="totalRank">-</span></div>
                </div>
            `;
        }
    }
}

// 상태 변경 감지(오류났을 때 디버깅용으로 개발자 도구에서 확인 가능) 

function setupAuthListener() {
    window.firebase.onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('사용자 로그인됨:', user.email);
            await showUserProfile();
        } else {
            console.log('사용자 로그아웃됨');
            currentUserProfile = null;

            // ── 로그아웃 시 관리자 상태 초기화 ────────────────────
            isAdmin = false;
            window.isAdmin = false;
            window.dispatchEvent(new CustomEvent('adminStatusChanged'));
            // ────────────────────────────────────────────────────────

            updateUIForAuthState(false);
        }
    });
}

// 전역 함수 노출 (인증 관련)
window.handleLogin = handleLogin;
window.handleSignupNext = handleSignupNext;
window.handleSignupComplete = handleSignupComplete;
window.handlePasswordReset = handlePasswordReset;
window.saveProfile = saveProfile;
window.logout = logout;
window.showUserProfile = showUserProfile;
window.updateUIForAuthState = updateUIForAuthState;
window.setupAuthListener = setupAuthListener;
window.waitForFirebaseInit = waitForFirebaseInit;
window.currentUserProfile = currentUserProfile;
window.isAdmin = isAdmin; // 초기값 false로 전역 노출