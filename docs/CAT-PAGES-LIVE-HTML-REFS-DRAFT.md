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
