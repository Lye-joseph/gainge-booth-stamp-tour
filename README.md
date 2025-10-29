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

### 3. localStorage 기반 상태 관리
- 브라우저 localStorage에 스탬프 상태 저장
- 페이지를 새로고침해도 스탬프 상태 유지
- 로컬 파일에서도 완벽하게 작동

### 4. URL 파라미터 기반 자동 스탬프
- URL에 `?booth=3` 형태의 파라미터를 붙이면 자동으로 해당 부스 스탬프 찍힘
- QR 코드 등을 통한 자동 체크인 가능

### 5. 완료 시 축하 모달
- 11개 부스 모두 스탬프 완료 시 축하 메시지 표시
- 완료 후 영구 축하 화면 표시

## 🚀 사용 방법

### 1. 기본 실행
```bash
# 로컬 서버 실행 (Python)
python -m http.server 8000

# 또는 Node.js를 사용할 경우
npx serve
```

브라우저에서 `http://localhost:8000` 접속

### 2. 모바일에서 테스트
- 로컬 네트워크의 IP 주소로 접속 (예: `http://192.168.1.100:8000`)
- 또는 GitHub Pages, Netlify 등에 배포하여 테스트

### 3. URL 파라미터 기반 자동 스탬프 테스트
```
http://localhost:8000/index.html?booth=1   # 부스 1 자동 스탬프
http://localhost:8000/index.html?booth=2   # 부스 2 자동 스탬프
http://localhost:8000/index.html?booth=3   # 부스 3 자동 스탬프
http://localhost:8000/index.html?booth=4   # 부스 4 자동 스탬프
http://localhost:8000/index.html?booth=5   # 부스 5 자동 스탬프
http://localhost:8000/index.html?booth=6   # 부스 6 자동 스탬프
http://localhost:8000/index.html?booth=7   # 부스 7 자동 스탬프
http://localhost:8000/index.html?booth=8   # 부스 8 자동 스탬프
http://localhost:8000/index.html?booth=9   # 부스 9 자동 스탬프
http://localhost:8000/index.html?booth=10  # 부스 10 자동 스탬프
http://localhost:8000/index.html?booth=11  # 부스 11 자동 스탬프
```

## 📱 동작 방식

### 페이지 로드 시
1. localStorage에서 스탬프 상태 읽기
2. 스탬프가 찍힌 부스는 활성화된 상태로 표시
3. 스탬프 카운터 업데이트
4. URL 파라미터 확인하여 자동 스탬프 처리

### 부스 클릭 시
1. 해당 부스의 ID 저장
2. 카메라 입력 열기
3. 사진 선택 시 스탬프 찍기

### 스탬프 찍기
1. localStorage에 부스 ID와 상태 저장
2. UI 업데이트 (애니메이션 효과)
3. 스탬프 카운터 증가
4. 연결선 활성화 (이전/다음 부스도 완료된 경우)
5. 모든 스탬프 완료 시 축하 모달 표시

## 🗂️ 파일 구조

```
Gainge-Test/
├── index.html    # 메인 HTML 파일
├── styles.css    # 스타일시트
├── script.js     # JavaScript 로직
└── README.md     # 프로젝트 설명서
```

## 🎨 UI/UX 특징

- **반응형 디자인**: 다양한 모바일 기기에 최적화
- **부드러운 애니메이션**: 터치 피드백과 스탬프 애니메이션
- **직관적인 시각 효과**: 그라디언트와 그림자를 활용한 모던한 디자인
- **접근성**: 큰 터치 영역과 명확한 시각적 피드백

## 🔧 기술 스택

- **HTML5**: 시맨틱 마크업
- **CSS3**: Flexbox, Grid, Animations, Gradients
- **Vanilla JavaScript**: ES6+ 문법, 클래스 기반 구조
- **localStorage API**: 상태 저장 및 관리

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
  "booth4": false,
  "booth5": true,
  "booth6": false,
  "booth7": true,
  "booth8": false,
  "booth9": true,
  "booth10": false,
  "booth11": true
}
```

키 이름: `boothStamps`  
저장 위치: 브라우저 localStorage  
만료: 없음 (영구 저장, 수동 삭제 필요)

## 🎯 활용 시나리오

1. **이벤트/전시회**: 부스 방문 인증 시스템
2. **관광 명소**: 랜드마크 스탬프 투어
3. **교육**: 학습 진도 체크 시스템
4. **마케팅**: 매장 방문 리워드 프로그램

## 🔒 개인정보 보호

- 촬영한 사진은 서버로 전송되지 않음
- 로컬 브라우저의 localStorage에만 스탬프 상태 저장
- 개인 식별 정보 수집 없음

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🚀 배포 상태

- ✅ GitHub Pages 자동 배포 설정 완료
- ✅ Cursor Git 연동 설정 완료
- 🌐 배포 URL: https://lye-joseph.github.io/gainge-booth-stamp-tour/

