# PWA 템플릿 — 폰만으로 웹앱 만들기

Claude 앱 **Code 탭(클라우드)** 에서 말로 지시하면, Claude가 코드를 쓰고 push → GitHub Actions가 테스트 → GitHub Pages로 배포합니다. 폰에서 주소를 열고 "앱 설치"하면 끝.

## 새 앱 만들기 (처음 한 번)
1. 이 저장소 위쪽 **Use this template → Create a new repository**
   - 이름: 영문 kebab-case (예: `nyang-gugudan`)
   - **Public** 선택 (무료 계정은 public만 Pages 배포 가능)
2. 새 저장소 **Settings → Pages → Source: GitHub Actions**
3. Claude 앱 **Code 탭** → 환경: 클라우드, 저장소: 방금 만든 것 → 예: *"아이용 구구단 게임 만들어줘, 고양이 테마로"*
4. 몇 분 뒤 `https://<계정>.github.io/<저장소>/` 접속 → ⋮ → **앱 설치**

> 2번을 빼먹어 첫 배포가 실패했다면: Pages를 켠 뒤 **Actions** 탭에서 실패한 실행을 **Re-run**.

## 고치기
같은 저장소로 Code 세션을 열고 *"버튼 더 크게"* 처럼 말하면 됩니다. 1~2분 뒤 반영되고, 옛 화면이면 앱을 완전히 닫았다 다시 여세요.

## 구성
| 파일 | 역할 |
|---|---|
| `index.html` | 앱 전체 (HTML·CSS·JS 한 파일) |
| `manifest.json` / `sw.js` | 설치·오프라인 |
| `icon.svg` → `tools/make-icons.mjs` | 아이콘 생성 |
| `tests/` | `node --test tests/*.test.js` — 통과해야 배포 |
| `.claude/skills/pwa-app` · `CLAUDE.md` | Claude 작업 규칙 |
| `.github/workflows/pages.yml` | main push → 배포 / `claude/**` push → 테스트 후 main 자동 병합 → 배포 |
