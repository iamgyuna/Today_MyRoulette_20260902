# 디자인 구성요소

`components.html`은 최종 앱 화면이 아니라 개별 요소를 한곳에서 확인하는 카탈로그입니다. 동작을 위한 JavaScript는 포함하지 않습니다.

## 파일

- `components.html`: 구성요소별 HTML 마크업과 확인용 카탈로그
- `components.css`: 색상·글꼴·프레임·룰렛·버튼·결과 팝업 스타일
- `svg/roulette-board.svg`: 6칸 원판, 외곽선과 구분선
- `svg/roulette-pointer.svg`: 상단 노란색 포인터
- `svg/title-rays.svg`: 제목 옆 노란색 장식
- `svg/button-rays.svg`: 시작 버튼 좌우 장식
- `svg/shuffle.svg`: 섞기 아이콘
- `svg/reset.svg`: 초기화 아이콘

## 사용한 원본 이미지

기존 이미지 파일은 수정하거나 복제하지 않고 상대 경로로 직접 참조합니다.

- 룰렛 아이콘: `../icon_images/*.png`
- 결과 삽화: `../result_images/*.jpg`

## 디자인 토큰

- 포인트 색상: `#FFD200`
- 기본 검정: `#111111`
- 제목 웹폰트: `Black Han Sans`
- 본문 웹폰트: `Noto Sans KR`

웹폰트는 `components.css` 상단의 Google Fonts `@import`로 준비되어 있습니다.
