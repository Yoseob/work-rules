# work-rules — 공통 작업 규칙 플러그인

프로젝트와 무관한 Claude Code 작업 방식을 담은 플러그인이다. 이 폴더 하나로 완결되므로 통째로 다른 저장소로 옮겨도 그대로 동작한다.

## 들어 있는 것

- `rules/work-rules.md` — 공통 규칙 23개(소통·진행 순서·검증·배포·외부 채널·git). 세션을 시작할 때 자동으로 대화에 들어간다.
- `skills/e2e-checklist/` — 화면 E2E 체크리스트 스킬(`work-rules:e2e-checklist`)과 글자·UI 깨짐 자동 검사기(`text-layout-check.js`), UI 검수 측정기(`ui-audit.js`). 개발 완료 전 Claude 내장 브라우저로 PC·모바일 둘 다 눌러 보며 버튼·글자 크기·여백까지 검수한다.
- `skills/naver-cafe-read/` — 네이버 카페 글 읽기 스킬(`work-rules:naver-cafe-read`). 로그인 없이 되는 범위·주소·수집 절차.

프로젝트의 CLAUDE.md·규칙·스킬과 어긋나면 프로젝트 쪽이 우선한다. 프로젝트 전용 절차(배포 명령, 서버 주소 등)는 여기에 넣지 않고 각 프로젝트의 스킬에 둔다.

처음 쓰는 사람에게는 [설치-안내.md](설치-안내.md)를 건넨다.

## 설치

공개 저장소 https://github.com/Yoseob/work-rules 에서 받는다.

```bash
claude plugin marketplace add Yoseob/work-rules
claude plugin install work-rules@work-rules --scope user
```

`--scope user` 는 내 컴퓨터의 모든 프로젝트에 켠다. 특정 프로젝트에만 켜려면 그 폴더에서 `--scope project`.

## 고치는 법

규칙은 `rules/work-rules.md`, 체크리스트는 `skills/e2e-checklist/SKILL.md` 를 고친다. 고친 뒤 설치한 쪽에서 `claude plugin update work-rules@work-rules` 를 실행한다.
