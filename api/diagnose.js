module.exports = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ ok: false, reason: "GEMINI_API_KEY が設定されていません" });
  }

  // キーの先頭5文字だけ返す（漏洩防止）
  const keyPrefix = apiKey.slice(0, 8) + "…";

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const body = await listRes.json();

    if (!listRes.ok) {
      return res.status(200).json({
        ok: false,
        keyPrefix,
        httpStatus: listRes.status,
        error: body,
        hint: listRes.status === 403
          ? "APIキーが無効か、Generative Language API が有効化されていない可能性があります"
          : listRes.status === 404
          ? "エンドポイントが見つかりません。APIキーの種類を確認してください（AI Studio キーが必要）"
          : "不明なエラーです",
      });
    }

    const modelNames = (body.models || []).map((m) => m.name);
    return res.status(200).json({ ok: true, keyPrefix, modelCount: modelNames.length, models: modelNames });
  } catch (err) {
    return res.status(200).json({ ok: false, keyPrefix, error: err.message });
  }
};
