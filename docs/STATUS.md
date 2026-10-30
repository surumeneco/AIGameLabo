# こもれび島の開拓記 — 検証状況

## 対象

- リポジトリ：\`surumeneco/AIGameLabo\`
- スマートフォン縦画面・Phaser 3・GitHub Pages専用の静的試作。
- 旧3案は履歴に保持。新企画は木材採集→橋→庭→灯台→自由な花飾り。

## ローカルで実行済み

- Node v22.16.0で新ルールテスト9件成功（保存データ検証の回帰テストを追加）。旧3案のテスト11件は旧リポジトリで成功済み。統合後の全テストはGitHub CIで確認する。
- JavaScript構文チェック成功。
- 単体HTML（Phaserではない独立のCanvas版）をChromiumモバイル相当で終端まで操作確認済み。

## CIによる検証の受入条件

- \`npm test\`、\`npm run build\`、\`npm run test:browser\` がすべて成功。
- E2Eはビルド済みの実Phaser canvasをタップし、資材収集・建築・色選択・保存/リロードを検証。
- CI成功とGitHub Pagesデプロイ成功は別に扱う。デプロイの404はPagesが有効化されていないことが原因の可能性があり、環境設定を確認する。
- 本人の「ゲームとして面白い」という評価は未検証。

[Actions一覧](https://github.com/surumeneco/AIGameLabo/actions) / [Pages設定](https://github.com/surumeneco/AIGameLabo/settings/pages)
