# CI/CD Test Report — Beleqet

- **Task:** Admin & Control — CI/CD Pipeline
- **Author:** Nathnael Mesfin (`Nathnaelmesfin`)
- **Report generated:** 2026-07-18 (UTC) — updated through final verification

Environment for all local runs:

| Item | Value |
| --- | --- |
| OS | Windows 11 Pro 10.0.26200 (Docker Desktop, Linux containers) |
| Node | v20.20.2 (repo targets Node 20; checksum-verified distribution) |
| npm | 10.8.2 |
| Docker | 29.2.1 · Compose v5.1.0 |
| Git | 2.54.0.windows.1 |
| Baseline commit | `389ca9eec7815ad66ba7ae8f842111958558d8b9` (upstream `main`) |

All timestamps UTC. No real credentials were used anywhere; every environment
value in every run is synthetic.

---

## 1. Baseline (before changes) — 2026-07-18

Commands run from a clean clone at the baseline commit.

| Check | Command | Result |
| --- | --- | --- |
| Backend install | `npm ci` | ✅ 1053 packages |
| Prisma generate | `npm run prisma:generate` | ✅ |
| Backend build | `npm run build` | ✅ |
| Backend unit tests | `npm test -- --runInBand` | ✅ 49 suites, 469 tests, ~116 s |
| Backend coverage | `npm run test:cov -- --runInBand` | ✅ 44.64 % stmts / 44.4 % branch / 39.56 % funcs / 44.94 % lines |
| Backend E2E | `npm run test:e2e -- --runInBand` | ✅ 1 suite, 4 tests |
| Backend ESLint (non-mutating) | `npx eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0` | ❌ **fatal** — `eslint-plugin-prettier` referenced by `.eslintrc.js` but not installed |
| Backend Prettier check | `npx prettier --check "src/**/*.ts" "test/**/*.ts"` | ❌ 128 files non-conforming |
| Admin frontend install | `npm ci` (frontend/) | ❌ lockfile out of sync (`lucide-react@0.499.0` missing from lock) |
| Jobs frontend install | `npm ci` (beleqet-jobs-nextjs/) | ❌ committed lockfile is **corrupt JSON** (parse error at offset 10003 — bad manual merge, duplicated unclosed `engines` block) |
| Admin frontend lint | `npm run lint` | ❌ inherits backend `.eslintrc.js`; every file fails parsing |
| Admin frontend types | `npx tsc --noEmit` | ❌ TS7016 — `qrcode` used but not declared (resolves only via hoisted root `node_modules`) |
| Admin frontend build | `npm run build` | ❌ (lint parse failures during `next build`) |
| Jobs frontend lint | `npm run lint` | ❌ 7 errors: `Toaster` undefined in `app/layout.tsx`, 5 × conditional-hook violations in `app/profile/page.tsx`, unescaped entity in `AvailabilityCard.tsx` |
| Jobs frontend types | `npx tsc --noEmit` | ❌ 2 errors (`Toaster` undefined; invalid cast in `lib/__tests__/seo.test.ts`) |
| Jobs frontend Vitest | `npm run test` | ✅ |
| Jobs frontend Jest | `npm run test:unit -- --runInBand` | ✅ |
| Jobs frontend build | `npm run build` | ❌ (lint errors during `next build`) |
| Compose build | `docker compose build` | ❌ `beleqet-jobs-nextjs/Dockerfile` referenced by compose but **does not exist** |
| npm audit (critical, prod deps) | all 3 packages | ✅ exit 0 — no CRITICAL findings (moderate/high exist, reported not gated) |

After the fixes on this branch, every ❌ above is green — see §2/§3.

Also verified at baseline: `nestjs-i18n@10.8.5` declares `engines.node >= 22`
while the whole repo targets Node 20 (EBADENGINE warning only; app builds and
tests pass on Node 20 — noted, no dependency change made).

## 2. Post-change local verification — 2026-07-18

Same machine, Node 20.20.2, at the head of `feat/ci-cd-pipeline-nathnael`.

| Check | Command | Result |
| --- | --- | --- |
| Backend ESLint | `npm run lint` (now non-mutating, `--max-warnings=0`) | ✅ 0 problems |
| Backend Prettier | `npm run format:check` | ✅ all files conform |
| Backend TypeScript | `npx tsc --noEmit` (src + test + tools) | ✅ |
| Backend build | `npm run build` | ✅ |
| Backend unit tests | `npm test -- --runInBand` | ✅ 51 suites, 478 tests (49→51 suites, 469→478 tests: health module added) |
| Backend E2E | `npm run test:e2e -- --runInBand` | ✅ 2 suites, 8 tests (ai-feed + health) |
| CI/CD helper tests | `npm run test:ci-cd` | ✅ 7 suites, 95 tests (78 unit + 17 integration: mocked-executable deploy-script runs + real `docker compose config` renders) |
| `npm ci` reproducibility | root, frontend, jobs | ✅ all three install clean from the repaired lockfiles |
| Admin frontend | lint / tsc / build | ✅ / ✅ / ✅ |
| Jobs frontend | lint / tsc / vitest / jest / build | ✅ / ✅ / ✅ / ✅ / ✅ |
| Workflow lint | `actionlint 1.7.7` (container) | ✅ 0 findings (both workflows) |
| Shell scripts | `shellcheck v0.10.0` (container, all 6 scripts) | ✅ 0 findings |

(unit-test count differences vs baseline: +9 health service/controller unit
tests and +4 health e2e tests added by this branch; pre-existing spec files
lost only dead code, no test cases.)

## 3. Live Docker verification — 2026-07-18

_This section is completed below after the full staging simulation._

## 4. GitHub Actions verification

_Run IDs, URLs, and per-job results recorded below after execution._

## 5. Remote staging deployment

Remote staging deployment was **not executed**: no staging server credentials
(`STAGING_HOST`, `STAGING_SSH_PRIVATE_KEY`, …) exist in this fork —
`gh secret list --repo Nathnaelmesfin/beleqet-ecosystem-updated --env staging`
returns HTTP 404 (the `staging` environment has never been created), and the
repository has no repository-level secrets either. The deployment path was
verified instead by:

1. the mocked-executable integration suite (§2),
2. the full local live staging simulation including rollback (§3), and
3. the real GitHub Actions dry-run of `deploy-staging.yml` (§4).

No claim of a real staging deployment is made anywhere in this submission.
