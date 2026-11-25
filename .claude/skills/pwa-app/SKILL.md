---
name: pwa-app
description: 이 저장소에서 폰용 웹앱(PWA)을 새로 만들거나 고칠 때 쓴다. "~ 만들어줘", "~ 앱", "게임 만들어", "버튼 바꿔", "기능 추가" 같은 지시 모두 해당. 단일 index.html PWA를 만들고 테스트 후 push해서 GitHub Pages로 배포한다.
---

# PWA 앱 만들기·고치기

사용자는 폰(갤럭시 S23 울트라 / Z폴드5 / 갤럭시 탭)의 Claude 앱에서 지시하고, 결과를 폰 브라우저에서 열어 "앱 설치"로 쓴다. PC는 없다고 가정한다.

## 0. 시작할 때
- 지시가 모호해도 **질문은 최소화**하고 합리적인 기본값으로 먼저 만든다. 정말 갈리는 결정(대상 나이, 핵심 규칙 등) 1~2개만 묻는다.
- 처음 만드는 앱이면(템플릿 그대로면) 아래 "새 앱 초기화"부터.

## 1. 구조 규칙 (꼭 지킬 것)
- **`index.html` 한 파일**에 HTML·CSS·JS를 모두 넣는다. 빌드 도구·npm 의존성 없음.
- 외부 CDN은 쓰지 않는다(오프라인에서 깨짐). 라이브러리가 꼭 필요하면 `vendor/`에 파일로 넣고 `sw.js`의 `ASSETS`에 추가한다.
- 이미지·소리는 가능하면 SVG/코드로 그리거나 Web Audio로 만든다. 파일을 추가하면 `ASSETS`에 넣는다.
- 저장은 `localStorage`, 키는 `<앱이름>:v1` 처럼 버전을 붙인다. 기록이 중요한 앱이면 내보내기/가져오기(JSON 복사·붙여넣기)를 둔다.

## 2. 모바일 우선 UI
- 기준 화면: 폰 세로(약 412×915), 폴드 펼침(약 884×1104), 탭 가로(1280×800 이상)까지 깨지지 않게.
- 터치 영역 최소 48px, hover에 기대지 않기, `env(safe-area-inset-*)` 반영.
- 글자는 16px 이상. 아이용이면 더 크게.
- 게임류: 더블탭 확대·길게 눌러 메뉴 뜨는 것 막기(`touch-action: manipulation`, `user-select: none`, `contextmenu` 차단).
- 소리는 첫 터치 이후에만 재생(브라우저 정책). 한국어 음성은 `speechSynthesis`에서 `ko-KR` 음성 선택.

## 3. 새 앱 초기화 (템플릿에서 처음 만들 때)
1. 앱 이름(한국어 표시명, 짧은 이름)과 색을 정한다.
2. `manifest.json`의 `name`, `short_name`, `description`, `theme_color`, `background_color` 수정.
3. `index.html`의 `<title>`, `theme-color` meta, `APP_NAME` 수정. 템플릿 안내 화면은 지우고 실제 앱으로 교체.
4. 아이콘: `icon.svg`를 앱에 맞게 다시 그린 뒤(단순한 도형, 가장자리 10%는 여백 없이 배경색으로 채움) `node tools/make-icons.mjs` 실행 → `icon-192.png`, `icon-512.png` 생성.
5. `README.md` 맨 위를 앱 소개로 바꾸고 접속 주소를 적는다.
6. `tests/app.test.js`에 앱 핵심 로직 테스트를 추가한다(로직은 `<script>` 안의 순수 함수로 두면 테스트에서 꺼내 쓸 수 있다 — 기존 테스트의 `loadAppScript` 참고).

## 4. 매번 변경 후 (빠짐없이)
1. **버전 올리기**: `index.html`의 `APP_VERSION`과 `sw.js`의 `VERSION`을 **같은 값**으로 올린다(작은 수정 patch, 기능 추가 minor). 안 올리면 사용자 폰에 옛 화면이 남는다. 테스트가 둘이 같은지 검사한다.
2. 새 파일을 만들었으면 `sw.js`의 `ASSETS`에 추가.
3. `node --test tests/*.test.js` 통과 확인. 실패하면 고치고 다시.
4. 가능하면 Playwright(클라우드에 설치돼 있음)로 폰 크기 스크린샷을 찍어 직접 확인한다: `npx --no-install playwright` 대신 `require('playwright')`로 `chromium.launch()` 후 `index.html`을 `file://`로 연다.
5. 커밋하고 push한다.
   - 먼저 `git push origin HEAD:main` 시도.
   - 거부되면 현재 브랜치(`claude/...`)에 push한다. workflow가 테스트 후 main에 자동 병합하고 배포한다. **PR은 만들지 않는다.**
   - 예외: `.github/workflows/`를 고친 커밋은 자동 병합이 거부된다(GitHub 권한 제한). 이때만 PR을 만들고 사용자에게 "GitHub 앱에서 Merge" 요청.
   - push 후 접속 주소를 열어 `APP_VERSION`이 새 값인지 확인할 수 있으면 확인한다(1~2분 걸림).

## 5. 마지막 답변 (짧게, 결론부터)
- 접속 주소: `https://<owner>.github.io/<repo>/` (`git remote get-url origin`에서 owner/repo를 읽는다)
- 바뀐 점 한두 줄, 버전
- "1~2분 뒤 반영. 옛 화면이면 앱을 완전히 닫았다 다시 열기"
- 처음 배포라면: "저장소 Settings → Pages → Source를 **GitHub Actions**로 바꾼 뒤 Actions 탭에서 실패한 실행을 Re-run" 안내(템플릿에서 만든 저장소는 Pages가 꺼져 있다).
