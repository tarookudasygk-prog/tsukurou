module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { ingredients, genre, mood, time, request } = req.body ?? {};

  if (!ingredients) {
    return res.status(400).json({ error: "食材を入力してください" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const prompt = `あなたは献立を提案してくれる親しみやすいAIです。以下の条件で最適な献立セットを提案してください。

【ユーザーの入力】
- 手持ちの食材：${ingredients}
- 料理ジャンル：${genre || "指定なし"}
- 気分：${mood || "指定なし"}
- 調理時間：${time || "指定なし"}
- こだわり・リクエスト：${request || "なし"}

【ルール】
1. 手持ちの食材を最大限に活用する。足りない材料は代用案を出す（例：豚バラがなければ豚こまで代用）
2. 必ず「主菜1品・副菜2品・汁物1品・デザート1品」の5品セットで提案する
3. 冒頭にひとこと共感メッセージを添える（友達口調・短く・例「今日疲れたよね、ラクなのいこ」）
4. 各料理に料理名・一言説明・主な食材・材料（分量付き）・作り方を含める

【出力形式】以下のJSON形式のみで返してください（コードブロック不要）:
{
  "message": "共感メッセージ（友達口調・ひとこと）",
  "dishes": [
    {
      "category": "主菜",
      "name": "料理名",
      "description": "一言説明",
      "mainIngredients": ["食材1", "食材2"],
      "recipe": {
        "servings": "2人分",
        "ingredients": ["食材名 … 分量"],
        "steps": ["手順1", "手順2"]
      }
    },
    { "category": "副菜1", "name": "...", "description": "...", "mainIngredients": [], "recipe": { "servings": "2人分", "ingredients": [], "steps": [] } },
    { "category": "副菜2", "name": "...", "description": "...", "mainIngredients": [], "recipe": { "servings": "2人分", "ingredients": [], "steps": [] } },
    { "category": "汁物",  "name": "...", "description": "...", "mainIngredients": [], "recipe": { "servings": "2人分", "ingredients": [], "steps": [] } },
    { "category": "デザート", "name": "...", "description": "...", "mainIngredients": [], "recipe": { "servings": "2人分", "ingredients": [], "steps": [] } }
  ]
}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return res.status(502).json({ error: "AI の呼び出しに失敗しました。しばらくしてからもう一度試してください。" });
    }

    const data = await geminiRes.json();
    const raw = data.candidates[0].content.parts[0].text;
    const menu = JSON.parse(raw);

    return res.status(200).json(menu);
  } catch (err) {
    console.error("suggest handler error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
}
