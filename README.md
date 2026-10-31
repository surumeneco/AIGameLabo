# AIGameLabo

ブラウザで遊べる小さなゲームの試作集。トップページはタワーディフェンス『双路の砦』です。公開URLの内容は `main` のGitHub Pagesデプロイ結果に従います。

- [双路の砦](https://surumeneco.github.io/AIGameLabo/) — 左右2本の進軍路、6地点の配置、弓塔・霜塔、3ウェーブの防衛と強化。候補プロトタイプであり、面白さは試遊で検証します。
- [灯火の砦](https://surumeneco.github.io/AIGameLabo/beacon.html) — 移動・斬撃・盾で灯火を守るアクション試作。
- [こもれび島](https://surumeneco.github.io/AIGameLabo/island.html) — 島の開拓と収集を行う旧試作。

## 開発と検証

```sh
npm install
npm test
npm run build
npm run test:browser
npm run dev
```

`npm run dev` は `http://127.0.0.1:5173/` で3作品を配信し、JS変更を監視します。HTML/CSSを変更した場合は開発サーバーを再起動してコピーを更新してください。

`scripts/build.mjs` は `dist/app.js`（双路の砦）、`dist/beacon.js`（灯火の砦）、`dist/island.js`（こもれび島）をそれぞれ生成し、各HTML/CSSを同梱します。GitHub Pagesは `main` への反映後にこの `dist/` を公開します。

- `src/games/dualkeep.js` / `tests/dualkeep.test.mjs`: 決定論的なタワーディフェンスルールと回帰試験
- `src/dualkeep-main.js` / `scripts/dualkeep-smoke.mjs`: Phaser表示、タッチ配置、進捗保存、モバイル操作検証
- `scripts/beacon-smoke.mjs` / `scripts/browser-smoke.mjs`: 旧2作品のブラウザ回帰試験
- `docs/DUALKEEP-CONCEPT.md`: 企画仮説と受入条件

## 検証の限界

ロジックテスト、Playwright、CI、ビルドの成功は、ゲームの面白さ・難易度・実機の全環境での動作を保証しません。CAT-TDDの正式GateはCIとは別に確認します。

## 公開GitHub PagesのHTTP検証

```sh
node --test tests/pages-live-smoke.test.mjs
node scripts/pages-live-smoke.mjs
```

後者は **公開済みの `main` のPagesサイト**をHTTPSで取得し、3作品のHTMLタイトル・参照先と、JS/CSS計6資産のHTTPステータス・MIME type・最終URLを検証します。PRのfeatureブランチ自体をデプロイするものではありません。

`.github/workflows/pages-live-http.yml` はPRと手動実行に加え、`main` の「Test and deploy prototypes」が成功した後にも検証します。CIの成功はゲーム操作・主観的な面白さ・正式CAT-TDD Gateの合格を保証しません。
