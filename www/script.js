const sourceText = document.querySelector("#sourceText");
const resultText = document.querySelector("#resultText");
const sourceLanguage = document.querySelector("#sourceLanguage");
const targetLanguage = document.querySelector("#targetLanguage");
const translatorForm = document.querySelector("#translatorForm");
const translateButton = document.querySelector("#translateButton");
const swapButton = document.querySelector("#swapLanguages");
const statusMessage = document.querySelector("#statusMessage");
const themeToggle = document.querySelector("#themeToggle");

function setStatus(message, state = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

function applyTheme(theme, persist = false) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  const isDark = selectedTheme === "dark";

  document.documentElement.dataset.theme = selectedTheme;
  document.body.dataset.theme = selectedTheme;
  themeToggle.setAttribute("aria-pressed", String(isDark));

  const icon = themeToggle.querySelector("span");
  icon.textContent = isDark ? "☀" : "☾";

  const actionLabel = isDark
    ? "Aktifkan mode terang"
    : "Aktifkan mode gelap";

  themeToggle.setAttribute("aria-label", actionLabel);
  themeToggle.title = actionLabel;

  if (persist) {
    try {
      localStorage.setItem("translator-theme", selectedTheme);
    } catch {
      setStatus(
        "Tema berubah, tetapi preferensi tidak dapat disimpan di perangkat ini.",
        "error"
      );
    }
  }
}

function initializeTheme() {
  let savedTheme = "light";

  try {
    const storedTheme = localStorage.getItem("translator-theme");

    if (storedTheme === "light" || storedTheme === "dark") {
      savedTheme = storedTheme;
    }
  } catch {
    setStatus(
      "Preferensi tema tidak dapat dimuat. Tema terang digunakan.",
      "error"
    );
  }

  applyTheme(savedTheme);
}

function populateLanguages() {
  if (typeof countries === "undefined") {
    setStatus("Daftar bahasa gagal dimuat. Periksa file countries.js.", "error");
    translateButton.disabled = true;
    return;
  }

  for (const [code, name] of Object.entries(countries)) {
    const sourceOption = document.createElement("option");
    sourceOption.value = code;
    sourceOption.textContent = name;
    sourceLanguage.append(sourceOption);

    const targetOption = document.createElement("option");
    targetOption.value = code;
    targetOption.textContent = name;
    targetLanguage.append(targetOption);
  }

  sourceLanguage.value = countries["en-GB"]
    ? "en-GB"
    : Object.keys(countries)[0];

  targetLanguage.value = countries["id-ID"]
    ? "id-ID"
    : countries["hi-IN"]
      ? "hi-IN"
      : Object.keys(countries)[1];
}

async function translateText(event) {
  event.preventDefault();

  const text = sourceText.value.trim();
  const from = sourceLanguage.value;
  const to = targetLanguage.value;

  if (!text) {
    resultText.value = "";
    setStatus("Masukkan teks yang ingin diterjemahkan.", "error");
    sourceText.focus();
    return;
  }

  if (!from || !to) {
    setStatus("Pilih bahasa sumber dan bahasa tujuan.", "error");
    return;
  }

  if (from === to) {
    setStatus("Pilih bahasa tujuan yang berbeda.", "error");
    return;
  }

  translateButton.disabled = true;
  translateButton.textContent = "Menerjemahkan…";
  resultText.value = "";
  resultText.placeholder = "Sedang menerjemahkan...";
  setStatus("Menghubungi layanan terjemahan…");

  try {
    const params = new URLSearchParams({
      q: text,
      langpair: `${from}|${to}`
    });

    const response = await fetch(
      `https://api.mymemory.translated.net/get?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Layanan terjemahan merespons dengan status ${response.status}.`
      );
    }

    const data = await response.json();
    const translatedText = data.responseData?.translatedText;

    if (data.responseStatus && Number(data.responseStatus) !== 200) {
      throw new Error(
        data.responseDetails || "Layanan tidak dapat menerjemahkan teks ini."
      );
    }

    if (typeof translatedText !== "string" || !translatedText.trim()) {
      throw new Error("Layanan tidak mengirim hasil terjemahan.");
    }

    resultText.value = translatedText;
    resultText.placeholder = "Hasil terjemahan akan muncul di sini.";
    setStatus("Terjemahan selesai.", "success");
  } catch (error) {
    resultText.value = "";
    resultText.placeholder = "Terjemahan gagal.";

    setStatus(
      error instanceof TypeError
        ? "Tidak dapat terhubung. Periksa koneksi internet lalu coba lagi."
        : error.message || "Terjadi kesalahan saat menerjemahkan.",
      "error"
    );
  } finally {
    translateButton.disabled = false;
    translateButton.innerHTML = `Terjemahkan
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14m-6-6 6 6-6 6"/>
      </svg>`;
  }
}

function swapLanguages() {
  const oldSourceLanguage = sourceLanguage.value;
  sourceLanguage.value = targetLanguage.value;
  targetLanguage.value = oldSourceLanguage;

  const oldSourceText = sourceText.value;
  sourceText.value = resultText.value;
  resultText.value = oldSourceText;

  if (sourceText.value.trim()) {
    setStatus("Bahasa dan teks berhasil ditukar.");
  }
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const temporaryTextArea = document.createElement("textarea");
  temporaryTextArea.value = text;
  temporaryTextArea.setAttribute("readonly", "");
  temporaryTextArea.style.position = "fixed";
  temporaryTextArea.style.opacity = "0";
  document.body.append(temporaryTextArea);
  temporaryTextArea.select();

  const copied = document.execCommand("copy");
  temporaryTextArea.remove();

  if (!copied) {
    throw new Error("Clipboard tidak tersedia di perangkat ini.");
  }
}

async function handleCopy(target) {
  const text = target === "source" ? sourceText.value : resultText.value;

  if (!text.trim()) {
    setStatus("Tidak ada teks untuk disalin.", "error");
    return;
  }

  try {
    await copyText(text);
    setStatus("Teks berhasil disalin.", "success");
  } catch (error) {
    setStatus(error.message || "Teks gagal disalin.", "error");
  }
}

function handleSpeak(target) {
  const text = target === "source" ? sourceText.value : resultText.value;
  const language =
    target === "source" ? sourceLanguage.value : targetLanguage.value;

  if (!text.trim()) {
    setStatus("Tidak ada teks untuk dibacakan.", "error");
    return;
  }

  if (
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    setStatus("Fitur suara tidak didukung oleh perangkat ini.", "error");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  window.speechSynthesis.speak(utterance);
}

translatorForm.addEventListener("submit", translateText);
swapButton.addEventListener("click", swapLanguages);

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme;
  applyTheme(currentTheme === "dark" ? "light" : "dark", true);
});

sourceText.addEventListener("input", () => {
  if (!sourceText.value.trim()) {
    resultText.value = "";
    setStatus("Terjemahan memerlukan koneksi internet.");
  }
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const { action, target } = button.dataset;

    if (action === "copy") {
      handleCopy(target);
    } else if (action === "speak") {
      handleSpeak(target);
    }
  });
});

initializeTheme();
populateLanguages();