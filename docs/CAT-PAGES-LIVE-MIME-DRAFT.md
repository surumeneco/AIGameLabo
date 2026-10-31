# CAT Draft — GitHub Pages HTTP MIME validation

- Work: AIGameLabo PR #5 / TASK-20261031-003
- Status: Draft (not Confirmed; formal CAT machine Gates not run)
- Source: existing PR #5 acceptance to verify published HTML, JavaScript, and CSS media types.
- Scope: `scripts/pages-live-smoke.mjs` and `tests/pages-live-smoke.test.mjs` only.

## Process

1. Fetch each known HTML route and its JS/CSS assets.
2. Verify HTTP success and unchanged canonical final URL.
3. Parse the `Content-Type` media type case-insensitively, ignoring parameters after `;`.
4. Accept `text/html` for HTML, `text/css` for CSS, and recognized JavaScript media types (`text/javascript`, `application/javascript`, `application/x-javascript`).
5. Reject any other media type, including strings merely containing `javascript` or `text/css` as a substring; do not report the route as verified.

## PI / TCE cases

| Case | Input | Expected result |
| --- | --- | --- |
| MIME-01 | `text/html; charset=utf-8` | Accept HTML |
| MIME-02 | `application/javascript; charset=utf-8` | Accept JS |
| MIME-03 | `text/javascript` | Accept JS |
| MIME-04 | `application/notjavascript` | Reject JS |
| MIME-05 | `text/css-bogus` | Reject CSS |
| MIME-06 | `text/css; charset=utf-8` | Accept CSS |
| MIME-07 | missing Content-Type | Reject |

## Verification boundary

The tests are an independently authored regression suite. A GitHub Actions Red/Green result must be tied to its exact commit. This Draft and CI success do not establish formal CAT `process-closure`, TestModel, vectors, Queue, or implementation-conformance success; those remain `not-run` until the verified runtime and approved Artifact are available.
