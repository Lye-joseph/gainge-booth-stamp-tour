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
        
        this.init();
    }

    init() {
        // 페이지 로드 시 쿠키에서 스탬프 상태 복원
        this.loadStampStatus();
        
        // 부스 클릭 이벤트 등록
        this.attachBoothClickEvents();
        
        // 카메라 입력 이벤트 등록
        this.attachCameraEvent();
        
        // URL path 기반 자동 스탬프 처리
        this.handlePathBasedStamp();
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
}

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
    new StampTourApp();
});

