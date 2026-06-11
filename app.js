// ==========================================================
// Tsukurou ブラウザ側スクリプト
// Step 2：タップ選択・音声入力・献立の表示（仮データ）
// Step 3 で fetchMenu() の中身を本物の AI（api/suggest.js）に差し替える
// ==========================================================

// ---------- 仮の献立データ（Step 3 で AI の応答に置き換わる） ----------
const DUMMY_MENU = {
  message: "今日も一日おつかれさま。疲れた日はね、フライパンひとつでいけるやつにしよ。",
  dishes: [
    {
      category: "主菜",
      name: "豚こまとキャベツのうま塩炒め",
      description: "豚バラがなくても豚こまでOK。にんにく塩だれで間違いないやつ。",
      mainIngredients: ["豚こま", "キャベツ", "にんにく"],
      recipe: {
        servings: "2人分",
        ingredients: [
          "豚こま肉 … 200g",
          "キャベツ … 1/4玉",
          "にんにく … 1かけ",
          "ごま油 … 大さじ1",
          "鶏ガラスープの素 … 小さじ1",
          "塩こしょう … 少々",
        ],
        steps: [
          "キャベツはざく切り、にんにくはみじん切りにする",
          "フライパンにごま油とにんにくを熱し、豚こまを炒める",
          "肉の色が変わったらキャベツを加えて強火でさっと炒める",
          "鶏ガラスープの素と塩こしょうで味をととのえて完成",
        ],
      },
    },
    {
      category: "副菜1",
      name: "にんじんとツナの無限サラダ",
      description: "レンジ2分。あえるだけで一品増える優秀なやつ。",
      mainIngredients: ["にんじん", "ツナ缶"],
      recipe: {
        servings: "2人分",
        ingredients: [
          "にんじん … 1本",
          "ツナ缶 … 1缶",
          "ごま油 … 小さじ2",
          "鶏ガラスープの素 … 小さじ1/2",
          "白ごま … 適量",
        ],
        steps: [
          "にんじんを細切りにして耐熱ボウルに入れる",
          "ふんわりラップをして電子レンジ（600W）で2分加熱",
          "油を切ったツナと調味料を混ぜ、白ごまをふって完成",
        ],
      },
    },
    {
      category: "副菜2",
      name: "やみつき塩だれきゅうり",
      description: "たたいて和えるだけ。火を使わないからゼロ労力。",
      mainIngredients: ["きゅうり", "ごま油", "塩昆布"],
      recipe: {
        servings: "2人分",
        ingredients: [
          "きゅうり … 2本",
          "塩昆布 … ひとつまみ",
          "ごま油 … 小さじ2",
          "塩 … 少々",
        ],
        steps: [
          "きゅうりをめん棒などでたたき、食べやすい大きさに割る",
          "ポリ袋に材料をすべて入れて振り混ぜる",
          "5分ほどなじませて完成",
        ],
      },
    },
    {
      category: "汁物",
      name: "キャベツと卵のふわたまスープ",
      description: "余ったキャベツはスープへ。卵でやさしい味に。",
      mainIngredients: ["キャベツ", "卵", "鶏ガラスープの素"],
      recipe: {
        servings: "2人分",
        ingredients: [
          "キャベツ … 2枚",
          "卵 … 1個",
          "水 … 400ml",
          "鶏ガラスープの素 … 大さじ1/2",
          "塩こしょう … 少々",
        ],
        steps: [
          "鍋に水と鶏ガラスープの素を入れて沸かす",
          "ざく切りにしたキャベツを加えて2分ほど煮る",
          "溶き卵を回し入れ、ふんわり浮いてきたら塩こしょうでととのえる",
        ],
      },
    },
    {
      category: "デザート",
      name: "はちみつレモンヨーグルト",
      description: "のせるだけ。疲れた日のごほうびはこれで十分。",
      mainIngredients: ["ヨーグルト", "はちみつ", "レモン汁"],
      recipe: {
        servings: "2人分",
        ingredients: [
          "プレーンヨーグルト … 200g",
          "はちみつ … 大さじ1",
          "レモン汁 … 小さじ1",
        ],
        steps: ["器にヨーグルトを盛る", "はちみつとレモン汁をかけて完成"],
      },
    },
  ],
};

// ---------- チップ（タップ式ボタン）の選択切り替え ----------
// 各グループ内で選べるのは1つだけ。選択中のものをもう一度タップすると解除
document.querySelectorAll(".chip-group").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const wasSelected = chip.classList.contains("is-selected");
    group.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-selected"));
    if (!wasSelected) chip.classList.add("is-selected");
  });
});

// ---------- 音声入力（Web Speech API：ブラウザ標準の音声認識） ----------
const micButton = document.getElementById("mic-button");
const ingredientsInput = document.getElementById("ingredients");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;

  micButton.addEventListener("click", () => {
    recognition.start();
    micButton.classList.add("is-listening");
  });

  recognition.addEventListener("result", (event) => {
    const text = event.results[0][0].transcript;
    // すでに入力があれば「、」でつなげて追記する
    ingredientsInput.value = ingredientsInput.value
      ? `${ingredientsInput.value}、${text}`
      : text;
  });

  recognition.addEventListener("end", () => micButton.classList.remove("is-listening"));
  recognition.addEventListener("error", () => micButton.classList.remove("is-listening"));
} else {
  // Firefox など未対応ブラウザ向けのフォールバック
  micButton.addEventListener("click", () => {
    alert("このブラウザは音声入力に対応していないみたい。手入力でお願いします🙏");
  });
}

// ---------- 入力内容の収集 ----------
function getSelectedChip(groupId) {
  const selected = document.querySelector(`#${groupId} .chip.is-selected`);
  return selected ? selected.textContent : null;
}

function collectInput() {
  return {
    ingredients: ingredientsInput.value.trim(),
    genre: getSelectedChip("genre-chips"),
    mood: getSelectedChip("mood-chips"),
    time: getSelectedChip("time-chips"),
    request: document.getElementById("free-request").value.trim(),
  };
}

// ---------- 献立の取得 ----------
// Step 3 ではここを fetch("/api/suggest", ...) に差し替える
async function fetchMenu(input) {
  console.log("AI に送る予定の入力:", input);
  await new Promise((resolve) => setTimeout(resolve, 800)); // AI が考えている風の間
  return DUMMY_MENU;
}

// ---------- 「献立を提案する」ボタン ----------
const suggestButton = document.getElementById("suggest-button");

suggestButton.addEventListener("click", async () => {
  const input = collectInput();

  if (!input.ingredients) {
    alert("食材をひとつ以上入力してね🥕");
    ingredientsInput.focus();
    return;
  }

  suggestButton.disabled = true;
  suggestButton.textContent = "考え中…🍳";

  try {
    const menu = await fetchMenu(input);
    renderMenu(menu);
  } catch (error) {
    alert("ごめんなさい、提案に失敗しました。もう一度試してみてください。");
    console.error(error);
  } finally {
    suggestButton.disabled = false;
    suggestButton.textContent = "献立を提案する";
  }
});

// ---------- 結果の描画 ----------
// AI の応答に変な文字列が混ざっても画面が壊れないようにエスケープする
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function searchLinksHtml(dishName) {
  const query = encodeURIComponent(dishName);
  return `
    <div class="dish-links">
      <a href="https://www.kurashiru.com/search?query=${query}" target="_blank" rel="noopener">クラシルで検索</a>
      <a href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener">YouTubeで検索</a>
    </div>`;
}

function dishCardHtml(dish, index) {
  const labelClass =
    dish.category === "主菜" ? " dish-label--main"
    : dish.category === "デザート" ? " dish-label--dessert"
    : "";

  return `
    <article class="dish-card">
      <span class="dish-label${labelClass}">${escapeHtml(dish.category)}</span>
      <h3 class="dish-name">${escapeHtml(dish.name)}</h3>
      <p class="dish-desc">${escapeHtml(dish.description)}</p>
      <p class="dish-ingredients">使う食材：${dish.mainIngredients.map(escapeHtml).join("・")}</p>
      <details class="recipe"${index === 0 ? " open" : ""}>
        <summary>つくりかたを見る</summary>
        <div class="recipe-body">
          <h4>材料（${escapeHtml(dish.recipe.servings)}）</h4>
          <ul>${dish.recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <h4>手順</h4>
          <ol>${dish.recipe.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </div>
      </details>
      ${searchLinksHtml(dish.name)}
    </article>`;
}

function renderMenu(menu) {
  const result = document.getElementById("result");

  result.innerHTML = `
    <p class="mock-note">※ いまは見本の献立です（Step 3 で本物の AI 提案になります）</p>
    <div class="ai-message">
      <span class="ai-avatar">🧑‍🍳</span>
      <p>${escapeHtml(menu.message)}</p>
    </div>
    ${menu.dishes.map(dishCardHtml).join("")}`;

  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}
