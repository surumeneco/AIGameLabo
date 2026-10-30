# ゲーム制作の研究・設計ノート

出典に基づく研究知見と、今作への適用仮説を分ける。2026-10-30確認。

## 根拠のある設計視点

- Hunicke et al. (2004) *MDA: A Formal Approach to Game Design and Game Research*: ルール（Mechanics）とプレイヤーの振る舞い（Dynamics）、体験（Aesthetics）を区別する。https://www.cs.northwestern.edu/~hunicke/MDA.pdf
- Ryan, Rigby, Przybylski (2006) *The Motivational Pull of Video Games*: 自律性・有能感・関係性とゲーム享受の関連を検討。DOI: 10.1007/s11031-006-9051-8
- Sweetser & Wyeth (2005) *GameFlow*: 挑戦と技能、明瞭な目標、フィードバック、操作を整理。DOI: 10.1145/1077246.1077253
- To et al. (2016) *Integrating Curiosity and Uncertainty in Game Design*: 情報の欠落と好奇心に関する設計フレーム。https://dl.digra.org/index.php/dl/article/view/793
- Subset Games開発者インタビュー（2018）: 『Into the Breach』の敵行動可視化とパズル性。https://www.gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-
- 『Slay the Spire』制作者インタビュー: 敵意図の可視化、ランダム性と構築選択。https://www.nintendo.com/jp/topics/article/1f6d2f1e-b7ea-11e9-b641-063b7ac45a6d
- Phaser 3 ScaleManager公式: https://docs.phaser.io/api-documentation/3.90.0/class/scale-scalemanager
- ViteおよびGitHub Pagesの静的配信: https://vite.dev/guide/static-deploy.html / https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 適用は仮説

- A：予測できる因果の操作が有能感を作るか。対象生物の振る舞いが単純すぎればただの手順暗記になる。
- B：攻撃予告とビルド分岐が選択を生むか。長期的なビルド相乗効果は現在の3戦闘では未確証。
- C：自分で考えて組む楽しさがあるか。鏡が事前指定の台座でしか置けない仕様では自由な創作の代替とは言えない。
- メカニクスだけでなくUI、演出、画面密度、ターン速度も体験に影響する。プロトタイプの比較は作品の優劣の証明ではない。

## 追加検証の優先度

1. Aは全ステージで解法存在性と徒歩でのバイパスを検査する。
2. Bは3戦で実際に遺物の選択が攻略を変えるか確認する。
3. Cは解法が単純すぎないかと、自由配置版へのピボット可能性を確認する。
4. スマホ縦画面での表示、色覚非依存の危険表示、タップ失敗率を実測する。
