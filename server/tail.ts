/**
 * ログファイルをtailして新しい行をyieldする
 */
export async function* tailFile(
  filePath: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const file = await Deno.open(filePath, { read: true });
  const decoder = new TextDecoder();

  // ファイルの末尾に移動
  await file.seek(0, Deno.SeekMode.End);

  let buffer = "";

  while (!signal?.aborted) {
    const chunk = new Uint8Array(1024);
    const bytesRead = await file.read(chunk);

    if (bytesRead === null || bytesRead === 0) {
      // 新しいデータがなければ少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    buffer += decoder.decode(chunk.subarray(0, bytesRead));
    const lines = buffer.split("\n");

    // 最後の要素は不完全な行かもしれないので保持
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  }

  file.close();
}
