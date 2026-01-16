import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { tailFile } from "./tail.ts";

Deno.test({
  name: "tailFile は新しく追記された行を読み取る",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  // テスト用の一時ファイルを作成
  const tempFile = await Deno.makeTempFile({ suffix: ".ndjson" });

  try {
    // 初期内容を書き込み
    await Deno.writeTextFile(tempFile, "initial line\n");

    // AbortController でキャンセル可能にする
    const controller = new AbortController();
    const lines: string[] = [];

    // tailFile を開始（バックグラウンドで実行）
    const tailPromise = (async () => {
      for await (const line of tailFile(tempFile, controller.signal)) {
        lines.push(line);
        // 2行読んだら終了
        if (lines.length >= 2) {
          controller.abort();
          break;
        }
      }
    })();

    // 少し待ってから新しい行を追記
    await new Promise((r) => setTimeout(r, 200));
    await Deno.writeTextFile(tempFile, "line 1\nline 2\n", { append: true });

    // tail が完了するのを待つ（タイムアウト付き）
    await Promise.race([
      tailPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]).catch(() => {
      // タイムアウトまたはアボートは正常
      controller.abort();
    });

    // 追記した行が読み取れたか確認
    assertEquals(lines.length >= 1, true);
    assertEquals(lines[0], "line 1");
  } finally {
    // クリーンアップ
    await Deno.remove(tempFile);
  }
  },
});

Deno.test({
  name: "tailFile は空行をスキップする",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const tempFile = await Deno.makeTempFile({ suffix: ".ndjson" });

  try {
    await Deno.writeTextFile(tempFile, "");

    const controller = new AbortController();
    const lines: string[] = [];

    const tailPromise = (async () => {
      for await (const line of tailFile(tempFile, controller.signal)) {
        lines.push(line);
        if (lines.length >= 1) {
          controller.abort();
          break;
        }
      }
    })();

    await new Promise((r) => setTimeout(r, 200));
    // 空行を含むデータを追記
    await Deno.writeTextFile(tempFile, "\n\nactual line\n\n", { append: true });

    await Promise.race([
      tailPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 2000)
      ),
    ]).catch(() => {
      controller.abort();
    });

    // 空行はスキップされて "actual line" だけが取れる
    assertEquals(lines[0], "actual line");
  } finally {
    await Deno.remove(tempFile);
  }
  },
});
