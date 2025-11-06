/**
 * 부스 스탬프 투어 앱
 * - 스탬프는 로컬(localStorage)에 저장
 * - 리워드 신청은 Google Apps Script를 통해 서버에 제출
 */

// ==================== 설정 ====================
// Google Apps Script Web App URL (배포 후 여기에 입력)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyQEKkJMFLEZxcA4xfzSUJ40iJRi5zJvDSt9ABbAkrLj4CU6NZgKMcGY1BnDmSZ5Emc/exec';

// 리워드 한도 (Apps Script와 동일하게 유지)
const REWARD_LIMITS = {
    tier11: 5,   // 치킨 (11개 완주)
    tier9: 10,   // 커피 (9개 이상)
    tier7: 50    // 에너지드링크 (7개 이상)
};

// ==================== 유틸리티 함수 ====================

function getWebAppUrl() {
    if (WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
        console.warn('Web App URL이 설정되지 않았습니다. apps-script.js를 배포하고 URL을 입력하세요.');
    }
    return WEB_APP_URL;
}

// ==================== 스탬프 관리 (localStorage) ====================

const StampStorage = {
    STORAGE_KEY: 'boothStamps',

    // 스탬프 상태 가져오기
    getStamps() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('스탬프 불러오기 실패:', e);
            return {};
        }
    },

    // 스탬프 저장
    setStamp(boothId, isStamped) {
        try {
            const stamps = this.getStamps();
            stamps[boothId] = isStamped;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stamps));
            return stamps;
        } catch (e) {
            console.error('스탬프 저장 실패:', e);
            return {};
        }
    },

    // 모든 스탬프 초기화
    reset() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('스탬프 초기화됨');
        } catch (e) {
            console.error('스탬프 초기화 실패:', e);
        }
    },

    // 완료된 스탬프 개수
    getCompletedCount() {
        const stamps = this.getStamps();
        return Object.values(stamps).filter(v => v === true).length;
    }
};

// ==================== 리워드 제출 상태 관리 (localStorage) ====================

const RewardStorage = {
    STORAGE_KEY: 'rewardSubmitted',

    // 제출 완료 여부 확인
    isSubmitted() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data === 'true';
        } catch (e) {
            console.error('제출 상태 확인 실패:', e);
            return false;
        }
    },

    // 제출 완료로 표시
    markAsSubmitted() {
        try {
            localStorage.setItem(this.STORAGE_KEY, 'true');
            console.log('리워드 제출 완료 상태로 저장됨');
        } catch (e) {
            console.error('제출 상태 저장 실패:', e);
        }
    },

    // 제출 상태 초기화 (개발 모드용)
    reset() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('리워드 제출 상태 초기화됨');
        } catch (e) {
            console.error('제출 상태 초기화 실패:', e);
        }
    }
};

// ==================== 카메라 관리 ====================

class CameraManager {
    constructor(inputElement) {
        this.input = inputElement;
    }

    open() {
        this.input.click();
    }

    reset() {
        this.input.value = '';
    }
}

// ==================== API 통신 ====================

/**
 * 전체 제출 목록 조회
 */
async function fetchAllSubmissions() {
    try {
        const url = getWebAppUrl() + '?action=list';
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        const json = await res.json();
        if (json && json.ok && Array.isArray(json.rows)) {
            return json.rows;
        }
    } catch (e) {
        console.warn('시트 목록 조회 실패:', e);
    }
    return [];
}

/**
 * 남은 수량 조회
 */
async function fetchRemainingCounts() {
    try {
        const url = getWebAppUrl() + '?action=remaining';
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        const json = await res.json();
        if (json && json.ok && json.remaining) {
            return json.remaining;
        }
    } catch (e) {
        console.warn('남은 수량 조회 실패:', e);
    }
    return null;
}

/**
 * 목록 기반 남은 수량 계산 (fallback)
 */
function calcRemainingFromList(rows) {
    const counts = { tier11: 0, tier9: 0, tier7: 0 };
    for (const r of rows) {
        const lv = (r.rewardLevel || '').trim();
        if (lv === '치킨') counts.tier11++;
        else if (lv === '커피') counts.tier9++;
        else if (lv === '에너지드링크') counts.tier7++;
    }
    return {
        tier11: Math.max(0, REWARD_LIMITS.tier11 - counts.tier11),
        tier9: Math.max(0, REWARD_LIMITS.tier9 - counts.tier9),
        tier7: Math.max(0, REWARD_LIMITS.tier7 - counts.tier7)
    };
}

/**
 * 리워드 신청 제출
 */
async function submitReward(data) {
    try {
        const url = getWebAppUrl();
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            mode: 'no-cors' // CORS 이슈 방지
        });

        // no-cors 모드에서는 응답을 읽을 수 없으므로, 항상 성공으로 간주
        // 실제 검증은 제출 전에 수행
        return { ok: true };
    } catch (err) {
        console.warn('웹앱 전송 실패:', err);
        // 로컬 백업 저장
        const submissions = JSON.parse(localStorage.getItem('rewardSubmissions') || '[]');
        submissions.push({ ...data, fallbackSaved: true, timestamp: new Date().toISOString() });
        localStorage.setItem('rewardSubmissions', JSON.stringify(submissions));
        throw err;
    }
}

// ==================== 메인 앱 클래스 ====================

class StampTourApp {
    constructor() {
        // DOM 요소
        this.stampCount = document.getElementById('stampCount');
        this.rewardSection = document.getElementById('rewardSection');
        this.rewardBtn = document.getElementById('rewardBtn');
        this.rewardModal = document.getElementById('rewardModal');
        this.closeRewardModal = document.getElementById('closeRewardModal');
        this.rewardForm = document.getElementById('rewardForm');
        this.rewardLevel = document.getElementById('rewardLevel');
        this.completeModal = document.getElementById('completeModal');
        this.closeCompleteModalBtn = document.getElementById('closeCompleteModal');
        this.devResetBtn = document.getElementById('devResetBtn');
        this.cameraInput = document.getElementById('cameraInput');

        // 상태
        this.currentBoothId = null;
        this.assignedTier = null; // 11 | 9 | 7
        this.camera = new CameraManager(this.cameraInput);
        this.isSubmitting = false; // 제출 중 플래그

        this.init();
    }

    init() {
        // URL 파라미터 처리
        this.handleResetParam();
        this.handleDevMode();

        // 스탬프 상태 복원
        this.loadStampStatus();

        // 이벤트 등록
        this.attachBoothClickEvents();
        this.attachCameraEvent();
        this.attachRewardEvents();
        this.attachPathBasedStamp();
        this.attachCompleteModal();

        // 초기 UI 업데이트
        this.updateStampCounter();
        this.checkRewardEligibility();
    }

    // URL 파라미터: reset=1 이면 스탬프 초기화
    handleResetParam() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('reset') === '1') {
            StampStorage.reset();
            RewardStorage.reset(); // 리워드 제출 상태도 초기화
            localStorage.removeItem('rewardSubmissions');
            location.replace(window.location.pathname);
        }
    }

    // 개발 모드: ?dev=1
    handleDevMode() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('dev') === '1' && this.devResetBtn) {
            this.devResetBtn.style.display = 'inline-block';
            this.devResetBtn.addEventListener('click', () => this.resetAllData());
        }
    }

    // 스탬프 상태 로드 및 UI 업데이트
    loadStampStatus() {
        const stamps = StampStorage.getStamps();
        const booths = document.querySelectorAll('.booth');

        booths.forEach(booth => {
            const boothId = booth.getAttribute('data-booth-id');
            if (stamps[boothId]) {
                this.markBoothAsStamped(booth, false);
            }
        });
    }

    // 부스 클릭 이벤트
    attachBoothClickEvents() {
        const booths = document.querySelectorAll('.booth');

        booths.forEach(booth => {
            booth.addEventListener('click', () => {
                this.currentBoothId = booth.getAttribute('data-booth-id');

                // 이미 스탬프가 찍힌 부스인지 확인
                if (booth.classList.contains('stamped')) {
                    const completedCount = StampStorage.getCompletedCount();
                    alert(`이미 스탬프를 찍은 부스입니다! 😊\n\n현재 ${completedCount}/11번째 부스 완료했습니다.`);
                    return;
                }

                // 카메라 실행
                this.camera.open();
            });
        });
    }

    // 카메라 입력 이벤트
    attachCameraEvent() {
        this.cameraInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0] && this.currentBoothId) {
                this.stampBooth(this.currentBoothId);
                this.camera.reset();
            }
        });
    }

    // 부스에 스탬프 찍기
    stampBooth(boothId) {
        StampStorage.setStamp(boothId, true);

        const booth = document.querySelector(`[data-booth-id="${boothId}"]`);
        if (booth) {
            this.markBoothAsStamped(booth, true);
        }

        this.updateStampCounter();
        this.checkRewardEligibility();
        this.checkCompletion();
    }

    // 부스를 스탬프 찍힌 상태로 표시
    markBoothAsStamped(booth, animate = true) {
        booth.classList.add('stamped');
        if (animate) {
            booth.classList.add('just-stamped');
            setTimeout(() => {
                booth.classList.remove('just-stamped');
            }, 500);
        }
    }

    // 스탬프 카운터 업데이트
    updateStampCounter() {
        const count = StampStorage.getCompletedCount();
        this.stampCount.textContent = count;
    }

    // 모든 스탬프 완료 확인
    checkCompletion() {
        const completedCount = StampStorage.getCompletedCount();
        if (completedCount === 11) {
            setTimeout(() => {
                this.completeModal.classList.add('show');
            }, 500);
        }
    }

    // 완료 모달 닫기
    attachCompleteModal() {
        if (this.closeCompleteModalBtn) {
            this.closeCompleteModalBtn.addEventListener('click', () => {
                this.completeModal.classList.remove('show');
            });
        }
    }

    // URL 파라미터 기반 자동 스탬프 (?booth=3)
    attachPathBasedStamp() {
        const params = new URLSearchParams(window.location.search);
        const boothParam = params.get('booth');

        if (boothParam) {
            const boothId = `booth${boothParam}`;
            const booth = document.querySelector(`[data-booth-id="${boothId}"]`);

            if (booth && !booth.classList.contains('stamped')) {
                setTimeout(() => {
                    this.stampBooth(boothId);
                    const completedCount = StampStorage.getCompletedCount();
                    alert(`부스 ${boothParam} 스탬프가 자동으로 찍혔습니다! 🎉\n\n현재 ${completedCount}/11번째 부스 완료했습니다.`);
                }, 500);
            }
        }
    }

    // 상품수령 자격 확인
    checkRewardEligibility() {
        const completedCount = StampStorage.getCompletedCount();
        const isSubmitted = RewardStorage.isSubmitted();

        console.log('상품수령 자격 확인:', { completedCount, isSubmitted });

        this.rewardSection.style.display = 'block';
        // 스탬프 7개 미만이거나 이미 제출한 경우 버튼 비활성화
        this.rewardBtn.disabled = completedCount < 7 || isSubmitted;

        // 이미 제출한 경우 버튼 텍스트 변경
        if (isSubmitted) {
            this.rewardBtn.textContent = '이미 상품수령 정보를 등록하셨습니다';
        } else {
            this.rewardBtn.textContent = '상품수령 정보 등록하기';
        }
    }

    // 자격 있는 티어 계산
    getEligibleTier(count) {
        if (count >= 11) return 11;
        if (count >= 9) return 9;
        if (count >= 7) return 7;
        return null;
    }

    // 상품수령 이벤트 등록
    attachRewardEvents() {
        this.rewardBtn.addEventListener('click', () => {
            // 버튼이 비활성화되어 있거나 이미 제출한 경우 클릭 무시
            if (this.rewardBtn.disabled || RewardStorage.isSubmitted()) {
                return;
            }
            this.openRewardModal();
        });

        this.closeRewardModal.addEventListener('click', () => {
            this.closeRewardModalFunc();
        });

        this.rewardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRewardForm();
        });

        // 모달 외부 클릭 시 닫기
        this.rewardModal.addEventListener('click', (e) => {
            if (e.target === this.rewardModal) {
                this.closeRewardModalFunc();
            }
        });
    }

    // 상품수령 모달 열기
    async openRewardModal() {
        // 이미 제출한 경우 모달 열기 방지
        if (RewardStorage.isSubmitted()) {
            alert('이미 상품수령 정보를 등록하셨습니다.\n한 기기당 한 번만 신청 가능합니다.');
            return;
        }

        const completedCount = StampStorage.getCompletedCount();
        const eligibleTier = this.getEligibleTier(completedCount);

        // 남은 수량 조회
        let remaining = await fetchRemainingCounts();

        // fallback: 목록 기반 계산
        if (!remaining) {
            const rows = await fetchAllSubmissions();
            remaining = calcRemainingFromList(rows);
        }

        // 네트워크 오류 시 기본값 사용 (한도 전체로 가정)
        if (!remaining) {
            console.warn('네트워크 조회 실패, 기본값 사용');
            remaining = {
                tier11: REWARD_LIMITS.tier11,
                tier9: REWARD_LIMITS.tier9,
                tier7: REWARD_LIMITS.tier7
            };
        }

        // 사용 가능한 티어 결정
        let nextTier;
        const order = [11, 9, 7];
        const startIdx = eligibleTier ? order.indexOf(eligibleTier) : -1;
        const scan = startIdx >= 0 ? order.slice(startIdx) : order;

        for (const tier of scan) {
            const key = tier === 11 ? 'tier11' : tier === 9 ? 'tier9' : 'tier7';
            if ((remaining[key] || 0) > 0) {
                nextTier = tier;
                break;
            }
        }

        if (!nextTier) {
            alert('스탬프 투어에 참여해주셔서 감사합니다!\n아쉽게도 선착순 이벤트가 모두 종료되었습니다.');
            return;
        }

        // 티어 변경 알림
        if (eligibleTier && nextTier !== eligibleTier) {
            if (eligibleTier === 11) {
                alert('11개 완주자 상품 수령 선착순 등록이 마감되었습니다.\n9개 이상 상품 수령 등록으로 안내드립니다.');
            } else if (eligibleTier === 9) {
                alert('9개 이상 상품 수령 선착순 등록이 마감되었습니다.\n7개 이상 상품 수령 등록으로 안내드립니다.');
            }
        }

        this.assignedTier = nextTier;
        let rewardHtml = '';
        if (nextTier === 11) rewardHtml = '🎉 11개 완주<br>- 치킨 기프티콘 수령';
        else if (nextTier === 9) rewardHtml = '☕ 9개 이상<br>- 커피 기프티콘 수령';
        else if (nextTier === 7) rewardHtml = '⚡ 7개 이상<br>- 에너지 드링크 기프티콘 수령';

        this.rewardLevel.innerHTML = rewardHtml;
        this.rewardModal.classList.add('show');
    }

    // 상품수령 모달 닫기
    closeRewardModalFunc() {
        this.rewardModal.classList.remove('show');
        this.rewardForm.reset();
        this.assignedTier = null;
        // 제출 중 플래그 초기화 (모달 닫을 때)
        this.isSubmitting = false;
        // 제출 버튼 상태 복원
        const submitBtn = this.rewardForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '정보 등록하기';
        }
    }

    // 상품수령 정보 제출
    async submitRewardForm() {
        // 이미 제출 중이면 중복 제출 방지
        if (this.isSubmitting) {
            return;
        }

        // 이미 제출한 경우 제출 방지
        if (RewardStorage.isSubmitted()) {
            alert('이미 상품수령 정보를 등록하셨습니다.\n한 기기당 한 번만 신청 가능합니다.');
            this.closeRewardModalFunc();
            return;
        }

        // 제출 버튼 참조
        const submitBtn = this.rewardForm.querySelector('button[type="submit"]');
        
        // 제출 시작: 버튼 비활성화 및 로딩 상태 표시
        this.isSubmitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '등록 중...';
        }

        const formData = new FormData(this.rewardForm);
        const completedCount = StampStorage.getCompletedCount();

        // 제출 직전 재고 재검증
        let remaining = await fetchRemainingCounts();
        if (!remaining) {
            const rows = await fetchAllSubmissions();
            remaining = calcRemainingFromList(rows);
        }

        if (!remaining) {
            alert('시트 목록 조회에 실패했습니다. 잠시 후 다시 시도해주세요.');
            // 제출 실패: 버튼 다시 활성화
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '정보 등록하기';
            }
            this.closeRewardModalFunc();
            return;
        }

        const key = this.assignedTier === 11 ? 'tier11' : this.assignedTier === 9 ? 'tier9' : 'tier7';
        if (!this.assignedTier || (remaining[key] || 0) <= 0) {
            alert('제출 직전에 재고가 소진되었습니다. 다시 열어 확인해주세요.');
            // 제출 실패: 버튼 다시 활성화
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '정보 등록하기';
            }
            this.closeRewardModalFunc();
            return;
        }

        const rewardData = {
            name: formData.get('userName'),
            position: formData.get('position') || '',
            company: formData.get('companyName'),
            phone: formData.get('phoneNumber'),
            email: formData.get('email'),
            completedCount: completedCount,
            rewardLevel: this.assignedTier === 11 ? '치킨' : this.assignedTier === 9 ? '커피' : '에너지드링크',
            timestamp: new Date().toISOString()
        };

        try {
            await submitReward(rewardData);

            // 제출 완료 상태로 표시
            RewardStorage.markAsSubmitted();
            console.log('리워드 제출 완료 상태 저장됨');

            // UI 업데이트 (버튼 비활성화)
            this.checkRewardEligibility();

            alert('상품수령 정보가 성공적으로 등록되었습니다! 🎉\n\n부스 스탬프 투어 리워드는 일주일 내로 지급 예정입니다.');
            this.closeRewardModalFunc();
        } catch (error) {
            console.error('상품수령 정보 등록 실패:', error);
            alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
            // 제출 실패: 버튼 다시 활성화
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '정보 등록하기';
            }
        } finally {
            // 제출 완료/실패 여부와 관계없이 플래그 초기화
            this.isSubmitting = false;
        }
    }

    // 전체 데이터 초기화 (테스트용)
    resetAllData() {
        StampStorage.reset();
        RewardStorage.reset(); // 리워드 제출 상태도 초기화
        localStorage.removeItem('rewardSubmissions');

        document.querySelectorAll('.booth').forEach(booth => {
            booth.classList.remove('stamped', 'just-stamped');
        });

        this.updateStampCounter();
        this.checkRewardEligibility();
        this.completeModal.classList.remove('show');
        alert('테스트 데이터가 초기화되었습니다.\n리워드 제출 상태도 초기화되어 다시 신청할 수 있습니다.');
    }
}

// 기업 소개 버튼 이벤트 (목업)
document.addEventListener('DOMContentLoaded', () => {
    const app = new StampTourApp();

    // 기업 소개 버튼 클릭 이벤트
    document.querySelectorAll('.company-intro-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // 부스 클릭 이벤트 방지
            const booth = btn.getAttribute('data-booth');

            // 부스별 링크 설정
            const companyLinks = {
                '1': 'https://korean.alibaba.com/',
                '2': 'https://www.ksystem.co.kr/?utm_source=gainge',
                '3': 'https://www.crinity.com/',
                '4': 'https://forms.gle/Qf1EavEzYKxoRuqH7',
                '5': 'https://www.notion.com/ko',
                '6': 'https://conta.im/',
                '7': 'https://www.inflearn.com/intro-group',
                '8': 'https://www.nodiit.com/',
                '9': 'https://tigris.cloud/tigris-ai-plus',
                '10': 'https://me-o.co.kr/',
                '11': 'https://gainge.com/contents/products/732'
            };

            // 링크가 있는 경우 새 탭에서 열기
            if (companyLinks[booth]) {
                window.open(companyLinks[booth], '_blank');
            } else {
                // 아직 링크가 없는 경우 알림 표시
                alert(`부스 ${booth} 기업 소개 페이지\n\n(실제 URL이 준비되면 연결됩니다.)`);
            }
        });
    });
});

