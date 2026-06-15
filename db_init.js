// db-init.js
// Firestore에 초기 샘플 데이터를 한 번만 넣는 스크립트
// 콘솔에서 initSampleData() 호출하면 실행됨

async function initSampleData() {
    if (!window.db || !window.firebase) {
        alert('Firebase가 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    console.log('샘플 데이터 입력 시작...');

    try {
        // ── 시간표 ──
        const timetableData = {
            '월요일': { 1: '국어', 2: '수학', 3: '영어', 4: '과학', 5: '사회', 6: '미술', 7: '가정' },
            '화요일': { 1: '수학', 2: '영어', 3: '사회', 4: '체육', 5: '음악', 6: '가정', 7: '국어' },
            '수요일': { 1: '영어', 2: '사회', 3: '수학', 4: '국어', 5: '체육', 6: '음악', 7: '미술' },
            '목요일': { 1: '과학', 2: '수학', 3: '영어', 4: '미술', 5: '가정', 6: '과학', 7: '음악' },
            '금요일': { 1: '국어', 2: '과학', 3: '사회', 4: '수학', 5: '체육', 6: '영어', 7: '창체' }
        };

        for (const [day, periods] of Object.entries(timetableData)) {
            await window.firebase.setDoc(
                window.firebase.doc(window.db, 'timetable', day),
                periods
            );
            console.log(`시간표 저장: ${day}`);
        }

        // ── 공지사항 ──
        const noticesData = [
            {
                id: '시간표변경안내',
                data: { title: '내일 수업 시간표 변경 안내 (5·6교시 교체)', content: '내일 5교시와 6교시 수업이 서로 교체됩니다. 해당 과목 선생님께 확인 바랍니다.', date: '2025.06.09', author: '담임선생님', tag: '긴급', createdAt: new Date('2025-06-09') }
            },
            {
                id: '국어독서감상문마감',
                data: { title: '국어 독서 감상문 제출 마감 D-3', content: '장편소설 1권 이상을 읽고 A4 2매 이상으로 제출하세요.', date: '2025.06.08', author: '국어 담당', tag: '수행', createdAt: new Date('2025-06-08') }
            },
            {
                id: '체육대회일정확정',
                data: { title: '학교 체육대회 6월 20일 일정 확정', content: '6월 20일(금) 운동장에서 체육대회가 진행됩니다. 체육복 착용 필수.', date: '2025.06.07', author: '학생부', tag: '행사', createdAt: new Date('2025-06-07') }
            },
            {
                id: '수강신청안내',
                data: { title: '2학기 수강신청 관련 안내사항', content: '2학기 수강신청 기간은 6월 24일~28일입니다. 교무실에 문의하세요.', date: '2025.06.06', author: '교무실', tag: '공지', createdAt: new Date('2025-06-06') }
            },
            {
                id: '수학서술형범위',
                data: { title: '수학 단원 서술형 평가 범위 공지', content: 'III단원(수열) 전체 범위입니다. 교과서 p.120~165 참고하세요.', date: '2025.06.05', author: '수학 담당', tag: '수행', createdAt: new Date('2025-06-05') }
            }
        ];

        for (const notice of noticesData) {
            await window.firebase.setDoc(
                window.firebase.doc(window.db, 'notices', notice.id),
                notice.data
            );
            console.log(`공지 저장: ${notice.id}`);
        }

        // ── 수행평가 ──
        const assessmentsData = [
            {
                id: '국어_독서감상문',
                data: { subject: '국어', title: '독서 감상문 제출', date: '2025-06-12', range: '장편소설 1권 이상', dday: 3, order: 1 }
            },
            {
                id: '수학_단원서술형',
                data: { subject: '수학', title: '단원 서술형 평가', date: '2025-06-16', range: 'III단원 (수열)', dday: 7, order: 2 }
            },
            {
                id: '영어_말하기평가',
                data: { subject: '영어', title: '영어 말하기 평가', date: '2025-06-18', range: '주제: 환경 보호', dday: 9, order: 3 }
            },
            {
                id: '과학_탐구보고서',
                data: { subject: '과학', title: '탐구 실험 보고서', date: '2025-06-20', range: '화학 반응 단원', dday: 11, order: 4 }
            },
            {
                id: '사회_프로젝트발표',
                data: { subject: '사회', title: '사회 프로젝트 발표', date: '2025-06-26', range: '모둠별 발표 (10분)', dday: 17, order: 5 }
            }
        ];

        for (const assess of assessmentsData) {
            await window.firebase.setDoc(
                window.firebase.doc(window.db, 'assessments', assess.id),
                assess.data
            );
            console.log(`수행평가 저장: ${assess.id}`);
        }

        console.log('✅ 샘플 데이터 입력 완료!');
        alert('샘플 데이터가 Firestore에 저장되었습니다!');

    } catch (error) {
        console.error('데이터 입력 실패:', error);
        alert('데이터 입력 실패: ' + error.message);
    }
}

window.initSampleData = initSampleData;