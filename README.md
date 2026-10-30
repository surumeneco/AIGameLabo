# AIGameLabo

[灯火の砦 — 最新プロトタイプ](https://surumeneco.github.io/AIGameLabo/) / [こもれび島（旧試作）](https://surumeneco.github.io/AIGameLabo/island.html)

## 何を遊ぶのか

3回の襲撃から灯火を守る短編アクション。地面のタップで移動し、斬撃と盾で敵に対応。各波の後で好きな強化を一つ選び、異なる戦い方を試す。単純な一本道のクラフト操作から、上達と選択による結果の違いへ検証対象を変更。

- `src/games/beacon.js`: 決定論的な戦闘ルール
- `src/beacon-main.js`: Phaser 3の画面と入力
- `tests/beacon.test.mjs`: 進行・選択・勝敗・シード回帰テスト
- `scripts/beacon-smoke.mjs`: Chromiumによる実画面操作
- `island.html`: 前回の「こもれび島の開拓記」。以前の試作の検証結果を維持
- `docs/BEACON-CONCEPT.md`: 遊びの動機を中心にした企画と反証基準

## ローカル実行

```sh
npm install
npm test
npm run dev
npm run build
npm run test:browser
```

このプロジェクトはPhaser 3で静的ビルドし、GitHub Pagesで配信します。サーバー側処理・認証・DBはありません。

## 検証と限界

自動テスト・ビルド成功は面白さの証明ではありません。ゲームとしての魅力は試遊者による評価で判断します。CAT-TDDの公式Gate完了とCIを混同しません。
