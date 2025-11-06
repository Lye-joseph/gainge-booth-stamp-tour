/**
 * 부스 스탬프 투어 - 리워드 신청 관리 Apps Script
 * 
 * 사용 방법:
 * 1. Google Sheets에서 새 스프레드시트 생성
 * 2. 확장 프로그램 > Apps Script 열기
 * 3. 이 코드를 붙여넣기
 * 4. 배포 > 새 배포 > 유형: 웹 앱 선택
 * 5. 실행 사용자: 나, 액세스 권한: 모든 사용자로 설정
 * 6. 배포 후 웹 앱 URL 복사
 */

// 리워드 한도 설정 (시트에서 관리하거나 여기서 하드코딩)
const REWARD_LIMITS = {
    tier11: 5,   // 치킨 (11개 완주)
    tier9: 10,   // 커피 (9개 이상)
    tier7: 50    // 에너지드링크 (7개 이상)
};

// 시트 이름 설정
const SHEET_NAME = '리워드신청';

/**
 * GET 요청 처리 (선착순 확인, 목록 조회)
 */
function doGet(e) {
    // e가 undefined일 수 있으므로 안전하게 처리
    e = e || {};
    e.parameter = e.parameter || {};

    const action = e.parameter.action;

    try {
        if (action === 'list') {
            // 전체 제출 목록 조회
            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: true,
                    rows: getAllSubmissions()
                })
            ).setMimeType(ContentService.MimeType.JSON);

        } else if (action === 'remaining') {
            // 남은 수량 조회
            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: true,
                    remaining: getRemainingCounts()
                })
            ).setMimeType(ContentService.MimeType.JSON);

        } else if (action === 'check') {
            // 특정 티어의 선착순 가능 여부 확인
            const tier = e.parameter.tier; // 'tier11', 'tier9', 'tier7'
            if (!tier) {
                return ContentService.createTextOutput(
                    JSON.stringify({ ok: false, error: 'tier 파라미터가 필요합니다.' })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            const remaining = getRemainingCounts();
            const available = (remaining[tier] || 0) > 0;

            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: true,
                    available: available,
                    remaining: remaining[tier] || 0
                })
            ).setMimeType(ContentService.MimeType.JSON);

        } else if (action === 'reset') {
            // 관리자 전용: 데이터 초기화 (key 파라미터 필요)
            const key = e.parameter.key;
            if (key !== 'RESET_KEY_2024') { // 실제 사용 시 더 강력한 키로 변경
                return ContentService.createTextOutput(
                    JSON.stringify({ ok: false, error: '인증 실패' })
                ).setMimeType(ContentService.MimeType.JSON);
            }

            clearAllData();
            return ContentService.createTextOutput(
                JSON.stringify({ ok: true, message: '데이터가 초기화되었습니다.' })
            ).setMimeType(ContentService.MimeType.JSON);

        } else {
            return ContentService.createTextOutput(
                JSON.stringify({ ok: false, error: '알 수 없는 action입니다.' })
            ).setMimeType(ContentService.MimeType.JSON);
        }
    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * POST 요청 처리 (리워드 신청 제출)
 */
function doPost(e) {
    // e가 undefined일 수 있으므로 안전하게 처리
    e = e || {};

    try {
        if (!e.postData || !e.postData.contents) {
            return ContentService.createTextOutput(
                JSON.stringify({ ok: false, error: 'POST 데이터가 없습니다.' })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        const data = JSON.parse(e.postData.contents);

        // 필수 필드 검증
        if (!data.name || !data.company || !data.phone || !data.email || !data.rewardLevel) {
            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: false,
                    error: '필수 필드가 누락되었습니다. (name, company, phone, email, rewardLevel)'
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // rewardLevel을 tier로 변환
        const tier = getTierFromRewardLevel(data.rewardLevel);
        if (!tier) {
            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: false,
                    error: '유효하지 않은 rewardLevel입니다.'
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 선착순 가능 여부 확인
        const remaining = getRemainingCounts();
        if ((remaining[tier] || 0) <= 0) {
            return ContentService.createTextOutput(
                JSON.stringify({
                    ok: false,
                    error: '선착순이 마감되었습니다.',
                    remaining: remaining
                })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // 데이터 저장
        const result = saveSubmission(data);

        return ContentService.createTextOutput(
            JSON.stringify({
                ok: true,
                message: '리워드 신청이 완료되었습니다.',
                remaining: getRemainingCounts()
            })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: error.toString() })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 시트 가져오기 (없으면 생성)
 */
function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        // 헤더 설정
        sheet.getRange(1, 1, 1, 8).setValues([[
            '이름', '직급', '회사명', '연락처', '이메일', '완료개수', '리워드등급', '제출시간'
        ]]);
        sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
        sheet.setFrozenRows(1);
    } else {
        // 기존 시트의 헤더 확인 및 업데이트
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const expectedHeaders = ['이름', '직급', '회사명', '연락처', '이메일', '완료개수', '리워드등급', '제출시간'];
        
        // 헤더가 다르면 업데이트 (직급 컬럼이 없는 경우 대비)
        if (headers.length < expectedHeaders.length || headers[1] !== '직급') {
            // 기존 데이터 백업
            const data = sheet.getDataRange().getValues();
            
            // 헤더 업데이트
            sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
            sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
            
            // 기존 데이터가 있으면 재정렬 (직급 컬럼 추가)
            if (data.length > 1) {
                const newData = [];
                for (let i = 0; i < data.length; i++) {
                    if (i === 0) continue; // 헤더는 건너뛰기
                    const oldRow = data[i];
                    // 기존 형식: [이름, 회사명, 연락처, 이메일, 완료개수, 리워드등급, 제출시간]
                    // 새 형식: [이름, 직급, 회사명, 연락처, 이메일, 완료개수, 리워드등급, 제출시간]
                    const newRow = [
                        oldRow[0] || '', // 이름
                        '', // 직급 (기존 데이터에는 없으므로 빈 값)
                        oldRow[1] || '', // 회사명
                        oldRow[2] || '', // 연락처
                        oldRow[3] || '', // 이메일
                        oldRow[4] || 0, // 완료개수
                        oldRow[5] || '', // 리워드등급
                        oldRow[6] || '' // 제출시간
                    ];
                    newData.push(newRow);
                }
                if (newData.length > 0) {
                    // 기존 데이터 삭제 (헤더 제외)
                    sheet.deleteRows(2, data.length - 1);
                    // 새 형식으로 데이터 추가
                    sheet.getRange(2, 1, newData.length, expectedHeaders.length).setValues(newData);
                }
            }
        }
    }

    return sheet;
}

/**
 * 모든 제출 데이터 가져오기
 */
function getAllSubmissions() {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return []; // 헤더만 있는 경우

    const rows = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // 빈 행 건너뛰기

        rows.push({
            name: row[0] || '',
            position: row[1] || '',
            company: row[2] || '',
            phone: row[3] || '',
            email: row[4] || '',
            completedCount: row[5] || 0,
            rewardLevel: row[6] || '',
            timestamp: row[7] || ''
        });
    }

    return rows;
}

/**
 * 남은 수량 계산
 */
function getRemainingCounts() {
    const submissions = getAllSubmissions();

    const counts = { tier11: 0, tier9: 0, tier7: 0 };

    for (const sub of submissions) {
        const tier = getTierFromRewardLevel(sub.rewardLevel);
        if (tier) {
            counts[tier]++;
        }
    }

    return {
        tier11: Math.max(0, REWARD_LIMITS.tier11 - counts.tier11),
        tier9: Math.max(0, REWARD_LIMITS.tier9 - counts.tier9),
        tier7: Math.max(0, REWARD_LIMITS.tier7 - counts.tier7)
    };
}

/**
 * rewardLevel을 tier로 변환
 */
function getTierFromRewardLevel(rewardLevel) {
    const level = (rewardLevel || '').trim();
    if (level === '치킨') return 'tier11';
    if (level === '커피') return 'tier9';
    if (level === '에너지드링크') return 'tier7';
    return null;
}

/**
 * 제출 데이터 저장
 */
function saveSubmission(data) {
    const sheet = getSheet();
    const timestamp = data.timestamp || new Date().toISOString();

    sheet.appendRow([
        data.name,
        data.position || '',
        data.company,
        data.phone,
        data.email,
        data.completedCount || 0,
        data.rewardLevel,
        timestamp
    ]);

    return { success: true };
}

/**
 * 모든 데이터 초기화 (관리자 전용)
 */
function clearAllData() {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
    }
}

/**
 * 테스트 함수 (편집기에서 직접 실행 가능)
 * 실행: 함수 선택에서 testFunctions 선택 후 실행
 */
function testFunctions() {
    Logger.log('=== 테스트 시작 ===');

    // 시트 초기화 테스트
    try {
        const sheet = getSheet();
        Logger.log('✓ 시트 가져오기 성공');
    } catch (e) {
        Logger.log('✗ 시트 가져오기 실패: ' + e.toString());
    }

    // 남은 수량 조회 테스트
    try {
        const remaining = getRemainingCounts();
        Logger.log('✓ 남은 수량 조회 성공:');
        Logger.log('  - tier11 (치킨): ' + remaining.tier11);
        Logger.log('  - tier9 (커피): ' + remaining.tier9);
        Logger.log('  - tier7 (에너지드링크): ' + remaining.tier7);
    } catch (e) {
        Logger.log('✗ 남은 수량 조회 실패: ' + e.toString());
    }

    // 전체 제출 목록 조회 테스트
    try {
        const submissions = getAllSubmissions();
        Logger.log('✓ 전체 제출 목록 조회 성공: ' + submissions.length + '건');
    } catch (e) {
        Logger.log('✗ 전체 제출 목록 조회 실패: ' + e.toString());
    }

    Logger.log('=== 테스트 완료 ===');
}

