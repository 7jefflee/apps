---
name: pwa-app
description: 이 저장소에서 폰용 웹앱(PWA)을 새로 만들거나 고칠 때 쓴다. "~ 만들어줘", "~ 앱", "게임 만들어", "버튼 바꿔", "기능 추가" 같은 지시 모두 해당. 앱 하나 = 폴더 하나, 단일 index.html PWA를 만들고 테스트 후 push해서 GitHub Pages로 배포한다.
---

# PWA 앱 만들기·고치기

사용자는 폰(갤럭시 S23 울트라 / Z폴드5 / 갤럭시 탭)의 Claude 앱에서 지시하고, 결과를 폰 브라우저에서 열어 "앱 설치"로 쓴다. PC는 없다고 가정한다.

## 저장소 구조
- 앱 하나 = 최상위 폴더 하나: `<app-id>/index.html, manifest.json, sw.js, icon.svg, icon-*.png`
- `apps.json`: 앱 목록(첫 화면 `index.html`이 이걸 읽어 보여준다). id, name, description.
- `_template/`: 새 앱의 원본. **직접 고치지 않는다**(구조 개선이 목적일 때만).
- 주소: `https://<owner>.github.io/<repo>/<app-id>/` — owner/repo는 `git remote get-url origin`에서 읽는다.

## 0. 어느 앱인가
- "새로 만들어"면 → 1번.
- 고치는 지시면 `apps.json`에서 해당 앱을 찾는다. 앱이 하나뿐이면 그것, 애매하면 목록을 보여주고 한 번만 묻는다.
- 지시가 모호해도 **질문은 최소화**하고 합리적인 기본값으로 먼저 만든다. 정말 갈리는 결정 1~2개만 묻는다.

## 1. 새 앱 만들기
1. 짧은 영문 kebab-case id와 한국어 표시 이름을 정한다(사용자가 안 주면 직접 정하고 알려준다).
2. `node tools/new-app.mjs <id> "<이름>" "<한 줄 설명>"` — 폴더 복사, apps.json 등록, 테스트 파일 생성, 아이콘 생성까지 한다.
3. `<id>/index.html`의 시작 화면을 실제 앱으로 교체한다. `<id>/manifest.json`의 `theme_color`, `background_color`, index.html의 `theme-color` meta도 앱에 맞게.
4. 아이콘: `<id>/icon.svg`를 앱에 맞게 다시 그리고(단순한 도형, 배경은 가장자리까지 꽉 채움) `node tools/make-icons.mjs <id>`.
5. `tests/<id>.test.js`의 자리표시 테스트를 실제 로직 테스트로 바꾼다. 로직은 `<script>` 안 최상위 순수 함수로 두고, DOM 코드는 `if (typeof document !== 'undefined') main();` 안에 둔다 → 테스트에서 `loadAppScript('<id>')`로 꺼내 쓸 수 있다.

## 2. 구조 규칙 (꼭 지킬 것)
- 앱마다 **`index.html` 한 파일**에 HTML·CSS·JS를 모두 넣는다. 빌드 도구·npm 의존성 없음.
- 경로는 항상 `./` 상대경로. `/`로 시작하는 절대경로 금지.
- 외부 CDN 금지(오프라인에서 깨짐). 라이브러리가 꼭 필요하면 `<id>/vendor/`에 파일로 넣고 `sw.js`의 `ASSETS`에 추가.
- 이미지·소리는 가능하면 SVG/코드로 그리거나 Web Audio로 만든다. 파일을 추가하면 `ASSETS`에 넣는다.
- 저장은 `localStorage`, 키는 반드시 `<app-id>:` 로 시작(모든 앱이 같은 주소라 저장소를 공유한다). 기록이 중요한 앱이면 내보내기/가져오기를 둔다.
- 다른 앱 폴더는 건드리지 않는다.

## 3. 모바일 우선 UI
- 기준 화면: 폰 세로(약 412×915), 폴드 펼침(약 884×1104), 탭 가로(1280×800 이상)까지 깨지지 않게.
- 터치 영역 최소 48px, hover에 기대지 않기, `env(safe-area-inset-*)` 반영. 글자 16px 이상, 아이용이면 더 크게.
- 게임류: 더블탭 확대·길게 눌러 메뉴 막기(`touch-action: manipulation`, `user-select: none`, `contextmenu` 차단).
- 소리는 첫 터치 이후에만 재생. 한국어 음성은 `speechSynthesis`에서 `ko-KR` 음성 선택.

## 4. 매번 변경 후 (빠짐없이)
1. **버전 올리기**: 그 앱의 `index.html` `APP_VERSION`과 `sw.js` `VERSION`을 **같은 값**으로(작은 수정 patch, 기능 추가 minor). 안 올리면 폰에 옛 화면이 남는다. 테스트가 둘이 같은지 검사한다.
2. 새 파일을 만들었으면 그 앱 `sw.js`의 `ASSETS`에 추가. 설명이 바뀌었으면 `apps.json`도.
3. `node --test tests/*.test.js` 통과 확인. 실패하면 고치고 다시.
4. 가능하면 Playwright(클라우드에 설치돼 있음)로 폰 크기 스크린샷을 찍어 직접 확인한다: `require('playwright')`의 `chromium.launch()`로 `<id>/index.html`을 `file://`로 연다.
5. 커밋하고 push한다.
   - 먼저 `git push origin HEAD:main` 시도.
   - 거부되면 현재 브랜치(`claude/...`)에 push한다. workflow가 테스트 후 main에 자동 병합하고 배포한다. **PR은 만들지 않는다.**
   - 예외: `.github/workflows/`를 고친 커밋은 자동 병합이 거부된다(GitHub 권한 제한). 이때만 PR을 만들고 사용자에게 "GitHub 앱에서 Merge" 요청.
   - push 후 앱 주소를 열어 `APP_VERSION`이 새 값인지 확인할 수 있으면 확인한다(1~2분 걸림).

## 5. 마지막 답변 (짧게, 결론부터)
- 앱 주소 `https://<owner>.github.io/<repo>/<app-id>/`
- 바뀐 점 한두 줄, 버전
- 새 앱이면 "주소 열고 ⋮ → 앱 설치". 고친 거면 "1~2분 뒤 반영, 옛 화면이면 앱을 완전히 닫았다 다시 열기".
