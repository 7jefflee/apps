# 내 웹앱 모음 — 폰만으로 만드는 PWA

Claude 앱 **Code 탭(클라우드)** 에서 이 저장소를 고르고 말로 지시하면, Claude가 앱을 만들어 push → GitHub Actions가 테스트 → GitHub Pages로 배포합니다.

- 앱 목록: https://7jefflee.github.io/apps/
- 앱 주소: `https://7jefflee.github.io/apps/<앱 이름>/` → 폰에서 열고 ⋮ → **앱 설치**

## 쓰는 법
- 새 앱: *"아이용 구구단 게임 만들어줘, 고양이 테마로"*
- 고치기: *"구구단 앱 버튼 더 크게"*
- 1~2분 뒤 반영됩니다. 옛 화면이 보이면 앱을 완전히 닫았다 다시 여세요.

## 구성
| 경로 | 역할 |
|---|---|
| `<앱>/` | 앱 하나 (index.html 한 파일 + manifest·sw·아이콘) |
| `apps.json` · `index.html` | 앱 목록 첫 화면 |
| `_template/` · `tools/new-app.mjs` | 새 앱 원본과 생성 스크립트 |
| `tests/` | `node --test tests/*.test.js` — 통과해야 배포 |
| `.claude/skills/pwa-app` · `CLAUDE.md` | Claude 작업 규칙 |
| `.github/workflows/pages.yml` | main push → 배포 / `claude/**` push → 테스트 후 main 자동 병합 → 배포 |
