module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { dishName, category, description, mainIngredients, originalIngredients } = req.body ?? {};

  if (!dishName) {
    return res.status(400).json({ error: "料理名が必要です" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const ingredientsList = Array.isArray(mainIngredients) ? mainIngredients.join("、") : "";

  const prompt = `以下の料理のレシピを2人分で考えてください。

料理名：${dishName}
カテゴリ：${category || ""}
一言説明：${description || ""}
使う主な食材：${ingredientsList}
ユーザーの手持ち食材：${originalIngredients || ""}

ルール：
- 手持ち食材を最大限活用し、足りないものは代用案を出す
- 分量は2人分で具体的に書く（例：「豚こま肉 … 200g」）
- 手順は簡潔に、1ステップ1文で書く

以下のJSON形式のみで返してください（コードブロック不要）:
{
  "servings": "2人分",
  "ingredients": ["食材名 … 分量"],
  "steps": ["手順1", "手順2"]
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
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return res.status(502).json({ error: "レシピの取得に失敗しました" });
    }

    const data = await geminiRes.json();
    const raw = data.candidates[0].content.parts[0].text;
    const recipe = JSON.parse(raw);

    return res.status(200).json(recipe);
  } catch (err) {
    console.error("recipe handler error:", err);
    return res.status(500).json({ error: "サーバーエラーが発生しました" });
  }
};
