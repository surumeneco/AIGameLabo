# CAT Draft — GitHub Pages 有効なHTML資産参照の検証

- Work: AIGameLabo PR #5 / TASK-20261031-003
- Status: Draft (not Confirmed; formal CAT machine Gates not run)
- Source: 既存受入条件「公開3ページのJS/CSSが一致し、旧作品ルートを保持する」
- Scope: `scripts/pages-live-smoke.mjs` と `tests/pages-live-smoke.test.mjs` の公開HTTP検証

## Process / invariant

HTTP 200・MIME・titleが一致しても、HTMLコメントや別要素の属性にJS/CSSの文字列があるだけでは実際の資産参照とみなさない。対象ページの有効な `<script src="./...">` と `<link rel="stylesheet" href="./...">` を確認し、対象ファイルの取得・MIME・URL検証は既存どおり継続する。タグの属性順・引用符の種類によって正しい参照を誤拒否しない。

## PI / TCE候補

| Case | Input | Expected |
| --- | --- | --- |
| HTML-REF-01 | コメント内にのみscriptとlinkが存在 | 拒否 |
| HTML-REF-02 | 別要素のsrc/hrefに資産名が存在 | 拒否 |
| HTML-REF-03 | linkは存在するがrel=stylesheetでない | CSS参照として拒否 |
| HTML-REF-04 | 有効なscript/link、属性順変更、単引用符 | 受理 |
| HTML-REF-05 | 既存3ページの現行HTML | 受理 |

## 検証境界

このDraftは正式Confirmedではない。単体テストのRed/GreenとPR CIは実測して記録するが、CAT正規process-closure、TestModel、vectors、Queue、implementation-conformanceを通過したと扱わない。ブラウザ実行と人間の面白さ評価も別工程。

## 追加のHTMLタイトル境界（同一Work）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-TITLE-01 | 正しいtitle文字列がコメント内にのみ存在 | 拒否 |
| HTML-TITLE-02 | 有効なtitleタグの前後に空白・属性がある | 受理 |

titleはHTML内の任意の文字列一致ではなく、コメント外の有効なtitle要素の内容として検証する。空白の正規化を許すが、別作品名は受理しない。

## 追加の属性字句解析境界（同一Work）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-ATTR-01 | `data-note="src='./app.js'"` の値内にのみ資産参照文字列が存在 | `src` とみなさず拒否 |
| HTML-ATTR-02 | `data-note="href='./styles.css'"` の値内にのみCSS参照文字列が存在 | `href` とみなさず拒否 |
| HTML-ATTR-03 | 有効な `src` 属性の前に `data-note="x > y"` が存在 | 引用符内の `>` でタグを途中終了せず受理 |

属性名の検出は引用符内の属性値を飛ばす。単なる `\\s+src=` 正規表現検索では、別属性の値に含まれる文字列を誤って本物の属性と判定する。タグ境界も引用符内の `>` を考慮する。既存の公開3ページ、MIME、URL、title、旧ルートの受入条件は維持する。正式CAT機械Gateは未実行のまま。

## 追加の未終端HTMLコメント境界（同一Work）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-COMMENT-01 | `<!--` が閉じられず、以降の文字列に正しいtitleが存在 | titleを有効要素とみなさず拒否 |
| HTML-COMMENT-02 | 正しいtitleの後に未終端コメントが始まり、コメント内にのみscript/linkが存在 | 資産参照として拒否 |
| HTML-COMMENT-03 | 正しく閉じたコメントの後に有効なtitle/script/linkが存在 | 受理 |

HTMLコメントの除去は `-->` がない場合にも文末までをコメントとして扱う。閉じられたコメントの後の有効な要素は除去しない。検証器の対象は公開HTTPのHTML構造確認であり、ブラウザでのJS実行や正式CAT Gateを代替しない。

## 追加のscript type境界（同一Work、2026-11-01）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-SCRIPT-TYPE-01 | `<script type="application/json" src="./app.js">` だけが存在 | JavaScript実行資産として拒否 |
| HTML-SCRIPT-TYPE-02 | `<script type="importmap" src="./app.js">` だけが存在 | JavaScript実行資産として拒否 |
| HTML-SCRIPT-TYPE-03 | `<script type="module" src="./app.js">` | 受理 |
| HTML-SCRIPT-TYPE-04 | type省略の従来scriptタグ | 受理 |

HTMLのscript要素にsrcが存在しても、typeが非実行データブロックやimport mapならゲームJSの読み込み証拠ではない。許容するJavaScript MIME essenceとmoduleのみを実行用scriptとして扱う。形式的CAT機械Gateは未実行であり、本DraftはConfirmedではない。

## 追加のdocument base URL境界（同一Work、2026-11-01）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-BASE-01 | 正しいscript/linkと `<base href="https://other.example/">` が共存 | 参照先が別ホストへ変わるため拒否 |
| HTML-BASE-02 | 正しいscript/linkと `<base href="/other/">` が共存 | 参照先が別ディレクトリへ変わるため拒否 |
| HTML-BASE-03 | `<base href="./">` で現在の公開ディレクトリを指す | 受理 |
| HTML-BASE-04 | base要素なしの既存3ページ | 受理 |

HTMLの `<base href>` は相対 `src` / `href` の実解決先を変える。テキスト上の `./app.js` が一致していても、ブラウザの解決先が公開ページと異なる場合はゲーム資産が一致したと判定しない。HTTP検証は期待する公開ディレクトリ以外への資産参照をfail-closedで拒否する。CAT正式機械Gateはnot-run、Draftのまま維持。

## 追加の不活性HTMLコンテナ境界（同一Work、2026-11-01）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-INERT-01 | `<template>` 内にのみscript/link参照 | 実行・適用されないため拒否 |
| HTML-INERT-02 | `<noscript>` 内にのみscript/link参照（通常のJS有効ページ） | ゲーム資産として拒否 |
| HTML-INERT-03 | ネストしたtemplateの内側にのみ参照 | 拒否 |
| HTML-INERT-04 | 閉じたtemplateの後に実際のscript/link参照 | 受理 |
| HTML-INERT-05 | 未終端templateの後続に参照 | 拒否 |

公開HTTP検証ではJS有効の通常ブラウザを対象とする。template内容はDOMへ挿入されるまで不活性、noscriptのフォールバック内容はJS有効時に実行用資産参照としない。HTMLの限定的な字句検証であり、完全なブラウザDOM解析や実際のJS実行の代替ではない。正式CAT機械Gateはnot-run。

## 追加の有効スタイルシート境界（同一Work、2026-11-01）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-STYLESHEET-ACTIVE-01 | `<link rel="stylesheet" disabled href="./styles.css">` のみ | 無効化されたCSSを有効参照とみなさず拒否 |
| HTML-STYLESHEET-ACTIVE-02 | `<link rel="stylesheet" media="print" href="./styles.css">` のみ | 画面表示用CSSとして扱わず拒否 |
| HTML-STYLESHEET-ACTIVE-03 | `media="screen"` または `media="all"` の有効link | 受理 |

検証対象は画面表示を行う3作品である。HTML上にCSSのhrefが存在するだけでなく、画面で適用される有効なstylesheet linkを確認する。一般的な複合media queryの完全評価はこの限定HTTPチェッカーの対象外とし、明白なprint-only/disabledをfail-closedにする。既存のtitle、script、HTTP/MIME、URLの検証は維持する。正式CAT機械Gateは未実行でDraftのまま。


## 印刷専用メディアクエリの境界（同一Draft）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-STYLESHEET-MEDIA-01 | \`media="only print"\` のlinkのみ | 画面用CSSとして拒否 |
| HTML-STYLESHEET-MEDIA-02 | \`media="print and (color)"\` のlinkのみ | 画面用CSSとして拒否 |
| HTML-STYLESHEET-MEDIA-03 | \`media="print, screen"\` のlink | 画面用CSSとして受理 |

コンマ区切りのうち画面へ適用可能なクエリが少なくとも一つあれば、CSS参照を有効とみなす。一般的なメディア特性・論理式の完全評価は行わず、明白な印刷専用条件を拒否する限定検査とする。正式CAT機械Gateはnot-run、Draftのまま維持する。


## 代替スタイルシートの境界（同一Draft）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-STYLESHEET-ALTERNATE-01 | \`rel="alternate stylesheet"\` のlinkのみ | 初期画面の有効CSSとして拒否 |
| HTML-STYLESHEET-ALTERNATE-02 | \`rel="stylesheet alternate"\` のlinkのみ | トークン順に依存せず拒否 |
| HTML-STYLESHEET-ALTERNATE-03 | \`rel="stylesheet"\` のlink | 受理 |

代替スタイルシートは通常の初期画面で適用されるCSSの証拠として数えない。HTMLの全ての動的なスタイル切替を解析するものではなく、公開初期表示の有効CSS参照に限定する。正式CAT機械Gateはnot-run、Draftのまま。


## 明白に画面非適用のmedia条件（同一Draft）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-STYLESHEET-NOT-01 | \`media="not screen"\` | 画面では適用されないため拒否 |
| HTML-STYLESHEET-NOT-02 | \`media="not all"\` | いずれの媒体にも適用されないため拒否 |
| HTML-STYLESHEET-NOT-03 | \`media="not print"\` | 画面には適用可能なので受理 |
| HTML-STYLESHEET-NOT-04 | \`media="print, not screen"\` | 全クエリが画面非適用なので拒否 |

媒体タイプに関する明白な否定条件のみ判定し、ビューポート・色深度等の複合条件の完全評価は行わない。複数のクエリはOR条件とする。正式CAT機械Gateはnot-run、Draftのまま。

## モダンブラウザで実行されないnomoduleスクリプト（同一Draft）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-SCRIPT-NOMODULE-01 | `<script nomodule src="./app.js">` のみ | 現行ブラウザで実行されないため拒否 |
| HTML-SCRIPT-NOMODULE-02 | `<script src="./app.js">` | 受理 |
| HTML-SCRIPT-NOMODULE-03 | `<script type="module" src="./app.js">` | 受理 |

検証対象のモダンブラウザでは `nomodule` が付いた従来型スクリプトは実行されない。属性値の有無ではなく属性の存在を検出する。既存のmoduleと通常scriptを維持し、ブラウザ実機検証・正式CAT機械Gateと区別する。Draftのまま維持。

## title文字列を含むraw-text/RCDATA要素（同一Draft）

| Case | Input | Expected |
| --- | --- | --- |
| HTML-TITLE-RAWTEXT-01 | script要素内の文字列にのみ正しいtitleタグが存在 | ページタイトルとして拒否 |
| HTML-TITLE-RAWTEXT-02 | style要素内の文字列にのみ正しいtitleタグが存在 | ページタイトルとして拒否 |
| HTML-TITLE-RAWTEXT-03 | textarea要素内の文字列にのみ正しいtitleタグが存在 | ページタイトルとして拒否 |
| HTML-TITLE-RAWTEXT-04 | 上記要素の後に有効なtitle要素が存在 | 受理 |

HTMLのscript/styleはraw-text、textareaはRCDATAとして扱われ、内部の `<title>` 文字列はHTMLのtitle要素にならない。タイトル検証時のみこれらの要素を除外し、資産参照のscriptタグ自体の検査は維持する。正式CAT機械Gateはnot-run、Draftのまま。
