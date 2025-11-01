# 🎯 부스 스탬프 투어

모바일 웹에서 동작하는 부스 스탬프 투어 애플리케이션입니다. 11개의 부스를 방문하고 사진을 찍어 스탬프를 모으세요!

## ✨ 주요 기능

### 1. 로드맵 형태의 부스 배치
- 11개의 원형 부스가 세로로 연결된 로드맵 형태
- 각 부스는 고유 ID(`booth1` ~ `booth11`) 보유
- 시각적으로 아름답고 직관적인 UI

### 2. 카메라 기능
- 부스를 클릭하면 모바일 카메라 실행
- `<input type="file" accept="image/*" capture="environment">` 활용
- 사진 촬영 완료 시 자동으로 스탬프 찍힘

### 3. localStorage 기반 스탬프 관리
- 브라우저 localStorage에 스탬프 상태 저장
- 페이지를 새로고침해도 스탬프 상태 유지
- **스탬프는 로컬에만 저장되어 개인정보 수집 없음**

### 4. Google Sheets 기반 선착순 재고 관리
- 리워드 신청 데이터는 Google Apps Script를 통해 Google Sheets에 저장
- 실시간 선착순 재고 확인 및 관리
- 시트 데이터 수정 시 자동 반영

### 5. 리워드 신청 시스템
- 7개 이상: 에너지 드링크 기프티콘 (선착순 50명)
- 9개 이상: 커피 기프티콘 (선착순 10명)
- 11개 완주: 치킨 기프티콘 (선착순 5명)

### 6. URL 파라미터 기반 자동 스탬프
- URL에 `?booth=3` 형태의 파라미터를 붙이면 자동으로 해당 부스 스탬프 찍힘
- QR 코드 등을 통한 자동 체크인 가능

## 🚀 초기 설정

### 1. Google Apps Script 배포

1. **Google Sheets 생성**
   - [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
   - 이름은 자유롭게 설정 (예: "부스 스탬프 투어 - 리워드 신청")

2. **Apps Script 열기**
   - 확장 프로그램 > Apps Script 클릭
   - 새 프로젝트가 열림

3. **코드 복사 및 붙여넣기**
   - `apps-script.js` 파일의 모든 코드를 복사
   - Apps Script 편집기에 붙여넣기
   - 저장 (Ctrl+S 또는 Cmd+S)

4. **웹 앱 배포**
   - 상단 메뉴에서 "배포" > "새 배포" 클릭
   - 톱니바퀴 아이콘(설정) 클릭
   - **유형**: 웹 앱 선택
   - **설명**: "부스 스탬프 투어 API" (선택사항)
   - **실행 사용자**: 나 선택
   - **액세스 권한**: 모든 사용자 선택
   - "배포" 버튼 클릭

5. **웹 앱 URL 복사**
   - 배포 완료 후 "웹 앱 URL" 복사
   - URL 예시: `https://script.google.com/macros/s/AKfycby.../exec`

6. **JavaScript 파일에 URL 입력**
   - `script.js` 파일 열기
   - 상단의 `WEB_APP_URL` 변수에 복사한 URL 입력
   ```javascript
   const WEB_APP_URL = 'https://script.google.com/macros/s/YOUR_URL_HERE/exec';
   ```

### 2. 로컬 테스트

```bash
# Python 사용 시
python -m http.server 8000

# 또는 Node.js 사용 시
npx serve
```

브라우저에서 `http://localhost:8000` 접속

### 3. 기능 테스트

1. **스탬프 수집 테스트**
   - 부스 클릭 → 카메라 실행 → 사진 촬영
   - 스탬프가 찍히는지 확인

2. **리워드 신청 테스트**
   - 7개 이상 스탬프 수집
   - "상품수령 정보 등록하기" 버튼 클릭
   - 정보 입력 후 제출
   - Google Sheets에 데이터가 저장되는지 확인

3. **선착순 재고 확인 테스트**
   - 여러 번 신청하여 재고가 차감되는지 확인
   - Google Sheets에서 데이터를 삭제하면 재고가 복구되는지 확인

## 📱 동작 방식

### 스탬프 관리 (로컬)
- 모든 스탬프 상태는 브라우저 localStorage에 저장
- 서버와 통신하지 않으므로 개인정보 수집 없음
- 오프라인에서도 작동 가능

### 리워드 신청 (서버)
- 리워드 신청 시에만 Google Apps Script API 호출
- 제출 전 실시간 재고 확인
- 제출 직전 재검증으로 경합 상태 방지

### 선착순 재고 관리
- Google Sheets의 실제 데이터를 기반으로 계산
- 새로운 신청 시마다 실시간 재고 확인
- 시트 데이터 수정 시 자동 반영

## 🗂️ 파일 구조

```
Gainge-Test/
├── index.html          # 메인 HTML 파일
├── styles.css          # 스타일시트
├── script.js           # 프론트엔드 JavaScript
├── apps-script.js      # Google Apps Script 코드 (배포용)
├── header-banner.png   # 헤더 배너 이미지
└── README.md           # 프로젝트 설명서
```

## 🔧 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox, Grid, Animations, Gradients
- **Vanilla JavaScript**: ES6+ 문법, 클래스 기반 구조
- **localStorage API**: 스탬프 상태 저장 및 관리
- **Google Apps Script**: 서버 측 데이터 관리 및 선착순 재고 관리
- **Google Sheets API**: 데이터 저장 및 조회

## 📊 Google Sheets 데이터 구조

Apps Script가 자동으로 생성하는 시트 구조:

| 이름 | 회사명 | 연락처 | 완료개수 | 리워드등급 | 제출시간 |
|------|--------|--------|----------|------------|----------|
| 홍길동 | 가인지 | 010-1234-5678 | 11 | 치킨 | 2025-10-30T09:00:00.000Z |
| 김영희 | ABC | 010-2222-3333 | 9 | 커피 | 2025-10-30T09:05:00.000Z |

## 🔐 API 엔드포인트

### GET 요청

1. **전체 제출 목록 조회**
   ```
   GET {WEB_APP_URL}?action=list
   ```
   응답:
   ```json
   {
     "ok": true,
     "rows": [
       {
         "name": "홍길동",
         "company": "가인지",
         "phone": "010-1234-5678",
         "completedCount": 11,
         "rewardLevel": "치킨",
         "timestamp": "2025-10-30T09:00:00.000Z"
       }
     ]
   }
   ```

2. **남은 수량 조회**
   ```
   GET {WEB_APP_URL}?action=remaining
   ```
   응답:
   ```json
   {
     "ok": true,
     "remaining": {
       "tier11": 3,
       "tier9": 8,
       "tier7": 45
     }
   }
   ```

3. **특정 티어 선착순 확인**
   ```
   GET {WEB_APP_URL}?action=check&tier=tier11
   ```
   응답:
   ```json
   {
     "ok": true,
     "available": true,
     "remaining": 3
   }
   ```

### POST 요청

**리워드 신청 제출**
```
POST {WEB_APP_URL}
Content-Type: application/json

{
  "name": "홍길동",
  "company": "가인지",
  "phone": "010-1234-5678",
  "completedCount": 11,
  "rewardLevel": "치킨",
  "timestamp": "2025-10-30T09:00:00.000Z"
}
```

응답:
```json
{
  "ok": true,
  "message": "리워드 신청이 완료되었습니다.",
  "remaining": {
    "tier11": 2,
    "tier9": 8,
    "tier7": 45
  }
}
```

## 🎨 UI/UX 특징

- **반응형 디자인**: 다양한 모바일 기기에 최적화
- **부드러운 애니메이션**: 터치 피드백과 스탬프 애니메이션
- **직관적인 시각 효과**: 그라디언트와 그림자를 활용한 모던한 디자인
- **접근성**: 큰 터치 영역과 명확한 시각적 피드백

## 🌐 브라우저 호환성

- iOS Safari 13+
- Android Chrome 80+
- 모바일 브라우저에서 카메라 접근 권한 필요

## 📝 localStorage 구조

```javascript
{
  "booth1": true,   // 스탬프 찍힘
  "booth2": false,  // 스탬프 안 찍힘
  "booth3": true,
  // ...
}
```

키 이름: `boothStamps`  
저장 위치: 브라우저 localStorage  
만료: 없음 (영구 저장, 수동 삭제 필요)

## 🔒 개인정보 보호

- **스탬프 데이터**: 로컬 브라우저에만 저장, 서버 전송 없음
- **리워드 신청 데이터**: Google Sheets에 저장 (이름, 회사명, 연락처, 리워드 등급)
- 사용자 식별을 위한 추적 기능 없음

## 🛠️ 개발 모드

URL에 `?dev=1` 파라미터를 추가하면 테스트 초기화 버튼이 표시됩니다.

```
http://localhost:8000?dev=1
```

## 🚀 배포

### GitHub Pages 배포

1. GitHub 저장소에 코드 푸시
2. Settings > Pages에서 소스 브랜치 선택
3. 배포 완료 후 URL 확인

### 기업 소개 URL 설정

`script.js` 파일에서 기업 소개 버튼의 URL을 설정할 수 있습니다.
현재는 목업 상태이며, 실제 URL이 준비되면 업데이트 예정입니다.

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.
