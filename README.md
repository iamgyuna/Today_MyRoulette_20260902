# 오늘 뭐 하지?

오늘 할 일을 여섯 가지 선택지 중에서 정해주는 정적 웹 룰렛입니다.

## 로컬 실행

별도 빌드 과정이나 패키지 설치가 필요하지 않습니다. 프로젝트 루트의 `index.html`을 브라우저에서 열면 실행됩니다.

로컬 HTTP 서버를 사용하는 경우 프로젝트 폴더에서 원하는 정적 서버를 실행한 뒤 `/index.html`에 접속하면 됩니다.

## 배포

프로젝트 폴더 전체를 압축하거나 그대로 정적 호스팅 서비스에 업로드할 수 있습니다. 서버 코드, 데이터베이스, 환경변수가 필요하지 않습니다.

## 주요 파일

- `index.html`: 앱 화면과 접근성 마크업
- `app.js`: 룰렛 회전, 셔플, 초기화, 결과 영상 표시, 사운드 및 축하 효과
- `design/reference/components.css`: 공통 디자인 구성요소
- `design/reference/static-ui.css`: 앱 화면과 반응형·애니메이션 스타일
- `design/icon_images`: 룰렛 아이콘 원본
- `design/result_images`: 결과 삽화 원본
- `design/result_movies`: 결과 영상 원본(JPG 포스터와 오류 대체 화면을 함께 사용)

## 블로그 (`/blog/`)

Markdown으로 글을 쓰면 GitHub Pages에 자동으로 배포되는 블로그가 함께 들어 있습니다.

### 글 쓰기

1. `npm run new-post -- "글 제목" my-slug` 로 `blog/posts/YYYY-MM-DD-my-slug.md` 파일을 만듭니다. (직접 만들어도 됩니다)
2. 맨 위 front matter를 채우고 본문을 Markdown으로 씁니다.

   ```md
   ---
   title: 글 제목
   date: 2026-11-11
   tags: [일기, 코딩]
   description: 목록에 보일 한 줄 요약 (생략하면 첫 문단에서 자동으로 만듦)
   draft: true   # 공개할 때 지우거나 false 로 바꾸기
   ---
   ```

3. 이미지는 `blog/posts/images/` 에 넣고 본문에서 `![설명](images/파일이름.jpg)` 로 씁니다.
4. `main` 브랜치에 푸시하면 GitHub Actions가 빌드해서 배포합니다.

### 로컬에서 미리 보기

```bash
npm install
npm run build            # _site/ 생성 (초안 포함: npm run build -- --drafts)
npm run preview          # 빌드 후 로컬 서버 실행
```

### 처음 한 번만: GitHub Pages 켜기

저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다.
그 뒤로는 `main` 에 푸시할 때마다 `.github/workflows/deploy-pages.yml` 이 실행되어
`https://<아이디>.github.io/<저장소>/` 에 룰렛이, `/blog/` 에 블로그가 올라갑니다.

### 블로그 관련 파일

- `blog/posts/`: 글(Markdown)과 이미지
- `blog/style.css`: 블로그 스타일
- `scripts/build-site.mjs`: 룰렛 + 블로그를 `_site/` 로 빌드
- `scripts/new-post.mjs`: 새 글 파일 생성
