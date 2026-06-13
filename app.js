// ==========================================================
// Tsukurou ブラウザ側スクリプト
// ==========================================================

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
async function fetchMenu(input) {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "AI の提案に失敗しました");
  }
  return res.json();
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
    alert(`エラー: ${error.message}`);
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
    <div class="ai-message">
      <span class="ai-avatar">🧑‍🍳</span>
      <p>${escapeHtml(menu.message)}</p>
    </div>
    ${menu.dishes.map(dishCardHtml).join("")}`;

  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}
