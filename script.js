// 스탬프 상태 관리 (localStorage 사용)
const StorageManager = {
    STORAGE_KEY: 'boothStamps',
    
    // localStorage에서 스탬프 상태 가져오기
    getStampStatus() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('스탬프 상태 불러오기 실패:', e);
        }
        return {};
    },

    // localStorage에 스탬프 상태 저장하기
    setStampStatus(boothId, isStamped) {
        try {
            const stamps = this.getStampStatus();
            stamps[boothId] = isStamped;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stamps));
            console.log('스탬프 저장됨:', stamps);
            return stamps;
        } catch (e) {
            console.error('스탬프 상태 저장 실패:', e);
            return {};
        }
    },

    // 모든 스탬프 초기화
    resetAllStamps() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('모든 스탬프 초기화됨');
        } catch (e) {
            console.error('스탬프 초기화 실패:', e);
        }
    }
};

// 앱 초기화
class StampTourApp {
    constructor() {
        this.currentBoothId = null;
        this.cameraInput = document.getElementById('cameraInput');
        this.completeModal = document.getElementById('completeModal');
        this.stampCount = document.getElementById('stampCount');
        this.rewardSection = document.getElementById('rewardSection');
        this.rewardBtn = document.getElementById('rewardBtn');
        this.rewardModal = document.getElementById('rewardModal');
        this.closeRewardModal = document.getElementById('closeRewardModal');
        this.rewardForm = document.getElementById('rewardForm');
        this.rewardLevel = document.getElementById('rewardLevel');
        this.assignedTier = null; // 11 | 9 | 7
        
        this.init();
    }

    init() {
        // URL 파라미터로 초기화 처리 (?reset=1)
        this.handleResetParam();

        // 페이지 로드 시 쿠키에서 스탬프 상태 복원
        this.loadStampStatus();
        
        // 선착순 재고 초기화
        this.initializeQuotas();

        // 부스 클릭 이벤트 등록
        this.attachBoothClickEvents();
        
        // 카메라 입력 이벤트 등록
        this.attachCameraEvent();
        
        // URL path 기반 자동 스탬프 처리
        this.handlePathBasedStamp();
        
        // 상품수령 정보 등록 이벤트 등록
        this.attachRewardEvents();
    }

    // URL 파라미터 reset=1 이면 모든 스탬프 초기화
    handleResetParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const reset = urlParams.get('reset');
        if (reset === '1') {
            StorageManager.resetAllStamps();
        }
    }

    // 선착순 재고 초기화 (없을 때만)
    initializeQuotas() {
        const defaultQuotas = { tier11: 5, tier9: 10, tier7: 50 };
        const raw = localStorage.getItem('rewardQuotas');
        if (!raw) {
            localStorage.setItem('rewardQuotas', JSON.stringify(defaultQuotas));
        }
    }

    getQuotas() {
        try {
            return JSON.parse(localStorage.getItem('rewardQuotas') || '{"tier11":5,"tier9":10,"tier7":50}');
        } catch (_) {
            return { tier11: 5, tier9: 10, tier7: 50 };
        }
    }

    setQuotas(q) {
        localStorage.setItem('rewardQuotas', JSON.stringify(q));
    }

    getEligibleTier(count) {
        if (count >= 11) return 11;
        if (count >= 9) return 9;
        if (count >= 7) return 7;
        return null;
    }

    getNextAvailableTier(count) {
        const quotas = this.getQuotas();
        const eligible = this.getEligibleTier(count);
        const order = [11, 9, 7];
        const startIdx = eligible ? order.indexOf(eligible) : -1;
        const scan = startIdx >= 0 ? order.slice(startIdx) : order; // if not eligible, scan all
        for (const tier of scan) {
            const key = tier === 11 ? 'tier11' : tier === 9 ? 'tier9' : 'tier7';
            if (quotas[key] > 0) return tier;
        }
        return null;
    }

    // localStorage에서 스탬프 상태 불러와서 UI 업데이트
    loadStampStatus() {
        const stamps = StorageManager.getStampStatus();
        console.log('불러온 스탬프:', stamps);
        const booths = document.querySelectorAll('.booth');
        
        booths.forEach(booth => {
            const boothId = booth.getAttribute('data-booth-id');
            if (stamps[boothId]) {
                this.markBoothAsStamped(booth, false);
            }
        });
        
        this.updateStampCounter();
        this.checkRewardEligibility();
    }

    // 부스 클릭 이벤트 등록
    attachBoothClickEvents() {
        const booths = document.querySelectorAll('.booth');
        
        booths.forEach(booth => {
            booth.addEventListener('click', () => {
                this.currentBoothId = booth.getAttribute('data-booth-id');
                
                // 이미 스탬프가 찍힌 부스인지 확인
                if (booth.classList.contains('stamped')) {
                    // 현재 완료된 부스 개수 계산
                    const stamps = StorageManager.getStampStatus();
                    const completedCount = Object.values(stamps).filter(v => v === true).length;
                    
                    alert(`이미 스탬프를 찍은 부스입니다! 😊\n\n현재 ${completedCount}/11번째 부스 완료했습니다.`);
                    return;
                }
                
                // 카메라 실행
                this.openCamera();
            });
        });
    }

    // 카메라 열기
    openCamera() {
        this.cameraInput.click();
    }

    // 카메라 입력 이벤트
    attachCameraEvent() {
        this.cameraInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0] && this.currentBoothId) {
                // 사진이 선택되면 스탬프 찍기
                this.stampBooth(this.currentBoothId);
                
                // 파일 입력 초기화
                this.cameraInput.value = '';
            }
        });
    }

    // 부스에 스탬프 찍기
    stampBooth(boothId) {
        // localStorage에 저장
        StorageManager.setStampStatus(boothId, true);
        
        // UI 업데이트
        const booth = document.querySelector(`[data-booth-id="${boothId}"]`);
        if (booth) {
            this.markBoothAsStamped(booth, true);
        }
        
        // 카운터 업데이트
        this.updateStampCounter();
        
        // 상품수령 자격 확인
        this.checkRewardEligibility();
        
        // 모든 스탬프를 모았는지 확인
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
        const stamps = StorageManager.getStampStatus();
        const count = Object.values(stamps).filter(v => v === true).length;
        this.stampCount.textContent = count;
    }

    // 모든 스탬프 완료 확인
    checkCompletion() {
        const stamps = StorageManager.getStampStatus();
        const completedCount = Object.values(stamps).filter(v => v === true).length;
        
        if (completedCount === 11) {
            setTimeout(() => {
                this.completeModal.classList.add('show');
                // 완료 후에는 모달을 자동으로 닫지 않음 (영구 축하 화면)
            }, 500);
        }
    }


    // URL 파라미터 기반 자동 스탬프 처리 (?booth=3)
    handlePathBasedStamp() {
        // URL 파라미터 확인 (?booth=3)
        const urlParams = new URLSearchParams(window.location.search);
        const boothParam = urlParams.get('booth');
        
        if (boothParam) {
            const boothId = `booth${boothParam}`;
            
            // 해당 부스가 존재하는지 확인
            const booth = document.querySelector(`[data-booth-id="${boothId}"]`);
            if (booth && !booth.classList.contains('stamped')) {
                // 자동으로 스탬프 찍기
                setTimeout(() => {
                    this.stampBooth(boothId);
                    
                    // 현재 완료된 부스 개수 계산
                    const stamps = StorageManager.getStampStatus();
                    const completedCount = Object.values(stamps).filter(v => v === true).length;
                    
                    // 알림 메시지 생성
                    const message = `부스 ${boothParam} 스탬프가 자동으로 찍혔습니다! 🎉\n\n현재 ${completedCount}/11번째 부스 완료했습니다.`;
                    alert(message);
                }, 500);
            }
        }
    }

    // 상품수령 자격 확인
    checkRewardEligibility() {
        const stamps = StorageManager.getStampStatus();
        const completedCount = Object.values(stamps).filter(v => v === true).length;
        
        // 항상 표시하되, 7개 미만일 때 버튼 비활성화
        this.rewardSection.style.display = 'block';
        const shouldDisable = completedCount < 7;
        this.rewardBtn.disabled = shouldDisable;
    }

    // 상품수령 정보 등록 이벤트 등록
    attachRewardEvents() {
        this.rewardBtn.addEventListener('click', () => {
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
    openRewardModal() {
        const stamps = StorageManager.getStampStatus();
        const completedCount = Object.values(stamps).filter(v => v === true).length;
        
        const eligibleTier = this.getEligibleTier(completedCount);
        const nextTier = this.getNextAvailableTier(completedCount);

        if (!nextTier) {
            alert('스탬프 투어에 참여해주셔서 감사합니다!\n아쉽게도 선착순 이벤트가 모두 종료되었습니다.');
            return;
        }

        // 안내 팝업: 상위 등급 마감 시 다운그레이드 안내
        if (eligibleTier && nextTier !== eligibleTier) {
            if (eligibleTier === 11) {
                alert('11개 완주자 상품 수령 선착순 5명 등록이 마감되었습니다.\n9개 이상 상품 수령 등록으로 안내드립니다.');
            } else if (eligibleTier === 9) {
                alert('9개 이상 상품 수령 선착순 10명 등록이 마감되었습니다.\n7개 이상 상품 수령 등록으로 안내드립니다.');
            }
        }

        this.assignedTier = nextTier; // 제출 시 사용할 티어
        let rewardText = '';
        if (nextTier === 11) rewardText = '🎉 11개 완주 - 치킨 기프티콘 수령';
        else if (nextTier === 9) rewardText = '☕ 9개 이상 - 커피 기프티콘 수령';
        else if (nextTier === 7) rewardText = '⚡ 7개 이상 - 에너지 드링크 기프티콘 수령';

        this.rewardLevel.textContent = rewardText;
        this.rewardModal.classList.add('show');
    }

    // 상품수령 모달 닫기
    closeRewardModalFunc() {
        this.rewardModal.classList.remove('show');
        this.rewardForm.reset();
    }

    // 상품수령 정보 제출
    async submitRewardForm() {
        const formData = new FormData(this.rewardForm);
        const stamps = StorageManager.getStampStatus();
        const completedCount = Object.values(stamps).filter(v => v === true).length;
        
        // assignedTier가 없거나, 제출 시점에 재고가 없으면 방어
        const nextTier = this.getNextAvailableTier(completedCount);
        if (!this.assignedTier || this.assignedTier !== nextTier) {
            alert('제출 중 재고가 변경되었습니다. 다시 시도해주세요.');
            this.closeRewardModalFunc();
            return;
        }

        const rewardData = {
            name: formData.get('userName'),
            company: formData.get('companyName'),
            phone: formData.get('phoneNumber'),
            completedCount: completedCount,
            rewardLevel: this.assignedTier === 11 ? '치킨' : this.assignedTier === 9 ? '커피' : '에너지드링크',
            timestamp: new Date().toISOString()
        };

        try {
            // 재고 차감
            const quotas = this.getQuotas();
            const key = this.assignedTier === 11 ? 'tier11' : this.assignedTier === 9 ? 'tier9' : 'tier7';
            quotas[key] = Math.max(0, (quotas[key] || 0) - 1);
            this.setQuotas(quotas);

            // 구글 시트에 데이터 전송 (추후 구현)
            await this.submitToGoogleSheets(rewardData);
            
            alert('상품수령 정보가 성공적으로 등록되었습니다! 🎉\n\n곧 연락드리겠습니다.');
            this.closeRewardModalFunc();
        } catch (error) {
            console.error('상품수령 정보 등록 실패:', error);
            alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    // 구글 시트에 데이터 전송 (Apps Script Web App 사용)
    async submitToGoogleSheets(data) {
        const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxQ32yHv2mOpxH8tQ294uxy1DlwOaw25FgTLVkmTGNxQ_dFPXBbAaYCJH-NxILThfLh/exec';
        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                mode: 'no-cors'
            });
        } catch (err) {
            console.warn('웹앱 전송 실패, 로컬 백업에 저장합니다:', err);
            const submissions = JSON.parse(localStorage.getItem('rewardSubmissions') || '[]');
            submissions.push({ ...data, fallbackSaved: true });
            localStorage.setItem('rewardSubmissions', JSON.stringify(submissions));
        }
    }
}

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    new StampTourApp();
});

