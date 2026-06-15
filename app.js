// ==========================================================
// Tsukurou ブラウザ側スクリプト
// ==========================================================

// ---------- チップ（タップ式ボタン）の選択切り替え ----------
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
    ingredientsInput.value = ingredientsInput.value
      ? `${ingredientsInput.value}、${text}`
      : text;
  });

  recognition.addEventListener("end", () => micButton.classList.remove("is-listening"));
  recognition.addEventListener("error", () => micButton.classList.remove("is-listening"));
} else {
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

// ---------- 状態管理 ----------
let currentDishes = [];
let currentIngredients = "";
const recipeCache = new Map();

// ---------- 献立の取得（Phase 1：名前・説明のみ） ----------
async function fetchMenu(input) {
  currentIngredients = input.ingredients;
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

// ---------- レシピの取得（Phase 2：1品ずつ） ----------
async function fetchRecipe(dish) {
  const res = await fetch("/api/recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dishName: dish.name,
      category: dish.category,
      description: dish.description,
      mainIngredients: dish.mainIngredients,
      originalIngredients: currentIngredients,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "レシピの取得に失敗しました");
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
  recipeCache.clear();

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

// ---------- レシピボタンのクリック（イベント委譲） ----------
document.getElementById("result").addEventListener("click", async (e) => {
  const btn = e.target.closest(".recipe-btn");
  if (!btn || btn.disabled) return;

  const index = parseInt(btn.dataset.index, 10);
  const dish = currentDishes[index];
  const card = btn.closest(".dish-card");
  const recipeArea = card.querySelector(".recipe-area");

  if (recipeCache.has(dish.name)) {
    renderRecipe(recipeArea, recipeCache.get(dish.name), dish.name);
    btn.hidden = true;
    return;
  }

  btn.disabled = true;
  btn.textContent = "取得中…";
  recipeArea.innerHTML = '<p class="recipe-loading">レシピを考えてるよ🍳</p>';

  try {
    const recipe = await fetchRecipe(dish);
    recipeCache.set(dish.name, recipe);
    renderRecipe(recipeArea, recipe, dish.name);
    btn.hidden = true;
  } catch (err) {
    recipeArea.innerHTML = "";
    btn.disabled = false;
    btn.textContent = "このレシピを見る 🍳";
    alert("レシピの取得に失敗しました。もう一度試してください。");
    console.error(err);
  }
});

// ---------- 結果の描画 ----------
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function dishCardHtml(dish, index) {
  const labelClass =
    dish.category === "主菜" ? " dish-label--main"
    : dish.category === "デザート" ? " dish-label--dessert"
    : "";

  return `
    <article class="dish-card" data-index="${index}">
      <span class="dish-label${labelClass}">${escapeHtml(dish.category)}</span>
      <h3 class="dish-name">${escapeHtml(dish.name)}</h3>
      <p class="dish-desc">${escapeHtml(dish.description)}</p>
      <p class="dish-ingredients">使う食材：${dish.mainIngredients.map(escapeHtml).join("・")}</p>
      <button class="recipe-btn" data-index="${index}">このレシピを見る 🍳</button>
      <div class="recipe-area"></div>
    </article>`;
}

function renderRecipe(areaEl, recipe, dishName) {
  const query = encodeURIComponent(dishName);
  areaEl.innerHTML = `
    <div class="recipe-body">
      <h4>材料（${escapeHtml(recipe.servings)}）</h4>
      <ul>${recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <h4>手順</h4>
      <ol>${recipe.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    </div>
    <div class="dish-links">
      <a href="https://www.kurashiru.com/search?query=${query}" target="_blank" rel="noopener">クラシルで検索</a>
      <a href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener">YouTubeで検索</a>
    </div>`;
}

function renderMenu(menu) {
  currentDishes = menu.dishes;
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
