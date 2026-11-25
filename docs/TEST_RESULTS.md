# Admin panel test results

| | |
| --- | --- |
| **Started from** | commit `250b400` (branch `main`) |
| **Tested** | commit `250b400`. No code was changed. The `testing-nov-2026` branch only adds these result files |
| **Date** | 25 November 2026 |
| **Merged to `main`?** | No |

The other two repositories have their own `docs/TEST_RESULTS.md` on the same branch name. They started from server `957a410` and app `2034511`.

## 1. What I ran

| Command | Result | Full output |
| --- | --- | --- |
| `npm test` | **164 passed, 0 failed** (31 files) | [npm_test.txt](test-results/npm_test.txt) |
| `npx tsc --noEmit` | **0 errors** | [typecheck.txt](test-results/typecheck.txt) |
| `npm run build` | Builds | [build.txt](test-results/build.txt) |
| `npm run build:demo` | Builds | [build.txt](test-results/build.txt) |

The build used `VITE_API_BASE_URL=https://api.example.com`. It warns that one file is larger than 500 kB. That is only a size warning.

## 2. What failed and what I fixed

Nothing failed, so nothing was changed here. One problem that showed on the panel's Transactions page was fixed in the server: phone numbers inside descriptions were visible without `view_customers`. See the server's `docs/TEST_RESULTS.md`, 3.2.

## 3. Not tested

- The panel against a live server on Render.

## 4. Before merging or deploying

- **Does a push deploy by itself?** This repository's `render.yaml` does not switch automatic deploys off, and Render's default is to deploy on every push to the linked branch. Please check Settings > Auto-Deploy.
- **Old panel repository:** `sunupay_admin_dashboard` has hidden harmful code in `next.config.mjs`, in a commit from February 2026. The three current repositories are clean for it; I searched them before running anything. Please don't build the old one, and change any key that was on a machine that built it.
