# AIGameLabo — こもれび島の開拓記

以前の「野の法則」「遺物の迷宮」「機構工房」の試遊で得た問題（操作が分からない／説明の意味が分からない／表示した操作ができない／正解探しで楽しくない）から、**企画を白紙に戻して作成した新しいプロトタイプ**です。

## 30秒で始める

1. **光っている木を3本タップ**し、木材を集める。
2. 画面に現れる **「橋を架ける」** を押すと、新しい土地へ行ける。
3. **花を2輪タップ**し、好きな色の庭を作る。
4. **光る石を2個タップ**し、灯台を灯す。

タップすると主人公が動き、持ち物が増え、景色が変化します。移動ボタンはありません。失敗・時間制限もありません。操作に迷った場合は右上の「遊び方」を開いてください。

## 開発と検証

```bash
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

テストは純粋な状態遷移のユニットテストと、Phaserの**実際のcanvasをタップする**ブラウザスモークテストを分けて実施します。GitHub Actionsでも両者を走らせる構成です。

## 制約

Phaser 3 / スマートフォン縦画面 / 静的GitHub Pages / LocalStorage。ゲーム性そのものが面白いかは本人の試遊に委ねる。最初の受入条件は「説明通りに実際に遊べるか」。

詳しい根拠と現在の仮説は [企画書](docs/CONCEPT.md) を参照。旧版ソースはGitの履歴に保存されています。

## GitHub上での試遊

GitHub Pagesの公開元を **GitHub Actions** に設定すると、`main`への反映後に静的サイトがビルド・配信されます。公開設定・URL・ビルドの状態は[Actions](https://github.com/surumeneco/AIGameLabo/actions)と[Pages設定](https://github.com/surumeneco/AIGameLabo/settings/pages)で確認してください。公開成功は実際のデプロイ結果が出るまで未確認です。
