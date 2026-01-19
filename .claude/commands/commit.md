---
name: commit
description: 日本語Conventional Commit。確認フロー必須。
color: blue
---

# このリポジトリのコミットルール

## 必須ルール

- `git add -A` / `git add .` 禁止 → ファイル個別に add
- コミット前にユーザー確認を取る
- 日本語でメッセージを書く
- **作業の実感を必ず書く**
- **Co-authored-by: Claude Code <noreply@anthropic.com> を末尾に追加**

## スコープ

| スコープ | 対象 |
|----------|------|
| `server` | server/ 配下 |
| `ui` | ui/ 配下 |
| `hooks` | hooks/ 配下 |

## 作業の実感について

コミットメッセージの body に、作業時の感想や気づきを書く。

```
feat(server): セッション管理機能を追加

複数セッションを個別に追跡できるようにした。

テスト書くの意外と楽しかった。

Co-authored-by: Claude Code <noreply@anthropic.com>
```

実感があると、後から見て当時の状況が察せる：
- 「思ったより大変だった」→ 要注意箇所がある
- 「楽に書けた」→ メンテしやすい
- 「眺めてて楽しい」→ プロジェクトの目的達成
