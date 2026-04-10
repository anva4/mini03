// Placement: artifacts/api-server/src/lib/placeholder-image.ts
//
// Генерирует фирменный placeholder-изображение для товаров без фото.
// Возвращает data URI (base64 SVG) — сохраняется прямо в поле images[].

const CATEGORY_ICONS: Record<string, { icon: string; label: string }> = {
  games:   { icon: "🎮", label: "Игры" },
  mobile:  { icon: "📱", label: "Мобильные" },
  apps:    { icon: "💻", label: "Приложения" },
  default: { icon: "🛍️", label: "Товар" },
};

const SUBCATEGORY_ICONS: Record<string, string> = {
  currency:  "💰",
  accounts:  "👤",
  items:     "⚔️",
  boosting:  "🚀",
  subs:      "📋",
  keys:      "🔑",
  ingame:    "🎯",
  coaching:  "🏆",
  loot:      "🎁",
  services:  "⚙️",
};

const GRADIENTS: Array<[string, string]> = [
  ["#1a1f3a", "#2d1b4e"],  // тёмно-синий → фиолетовый
  ["#0f2027", "#203a43"],  // тёмный морской
  ["#1a0a2e", "#16213e"],  // глубокий фиолет
  ["#0d1117", "#1c2434"],  // почти чёрный синий
  ["#12100e", "#2b4162"],  // антрацит → синий
];

// Детерминированный выбор градиента по строке (чтобы один товар всегда имел одинаковый цвет)
function pickGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Обрезаем длинные названия
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export function generatePlaceholderImage(opts: {
  title: string;
  category?: string;
  subcategory?: string;
  game?: string;
}): string {
  const { title, category = "default", subcategory, game } = opts;

  const [gradFrom, gradTo] = pickGradient(title + category);

  // Иконка: приоритет subcategory > category > default
  const mainIcon =
    (subcategory && SUBCATEGORY_ICONS[subcategory]) ||
    CATEGORY_ICONS[category]?.icon ||
    CATEGORY_ICONS.default.icon;

  const safeTitle = escapeXml(truncate(title, 28));
  const safeGame  = game ? escapeXml(truncate(game, 22)) : "";

  // SVG 600×600 — квадрат, как у товарных карточек
  const svg = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradFrom}"/>
      <stop offset="100%" stop-color="${gradTo}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="42%" r="48%">
      <stop offset="0%" stop-color="#FF3C00" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#FF3C00" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="22"/>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="600" fill="url(#bg)"/>

  <!-- Subtle glow behind icon -->
  <circle cx="300" cy="252" r="160" fill="url(#glow)" filter="url(#blur)"/>

  <!-- Decorative grid lines -->
  <g opacity="0.06" stroke="#ffffff" stroke-width="1">
    <line x1="0" y1="150" x2="600" y2="150"/>
    <line x1="0" y1="300" x2="600" y2="300"/>
    <line x1="0" y1="450" x2="600" y2="450"/>
    <line x1="150" y1="0" x2="150" y2="600"/>
    <line x1="300" y1="0" x2="300" y2="600"/>
    <line x1="450" y1="0" x2="450" y2="600"/>
  </g>

  <!-- Corner accent dots -->
  <circle cx="40" cy="40" r="4" fill="#FF3C00" opacity="0.6"/>
  <circle cx="560" cy="40" r="4" fill="#FF3C00" opacity="0.6"/>
  <circle cx="40" cy="560" r="4" fill="#FF3C00" opacity="0.6"/>
  <circle cx="560" cy="560" r="4" fill="#FF3C00" opacity="0.6"/>

  <!-- Logo badge top-left -->
  <rect x="20" y="20" width="88" height="32" rx="10" fill="#FF3C00" opacity="0.92"/>
  <text x="64" y="41" text-anchor="middle" font-family="Arial Black, Arial, sans-serif"
        font-size="14" font-weight="900" fill="#ffffff" letter-spacing="1">MM</text>

  <!-- Main emoji icon -->
  <text x="300" y="290" text-anchor="middle" font-size="130" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
        filter="url(#shadow)">${mainIcon}</text>

  <!-- Divider line -->
  <rect x="180" y="336" width="240" height="2" rx="1" fill="#FF3C00" opacity="0.5"/>

  <!-- Game label (если есть) -->
  ${safeGame ? `<text x="300" y="374" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="18" font-weight="600" fill="#FF3C00" opacity="0.9">${safeGame}</text>` : ""}

  <!-- Product title -->
  <text x="300" y="${safeGame ? "410" : "386"}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="22" font-weight="700" fill="#ffffff" opacity="0.95">${safeTitle}</text>

  <!-- Bottom brand watermark -->
  <text x="300" y="565" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="13" fill="#ffffff" opacity="0.22" letter-spacing="3">MINIONS MARKET</text>
</svg>`;

  // Кодируем в base64 data URI
  const b64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}
