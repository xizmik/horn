import { api } from "./api.js";

const FALLBACK_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#14171d"/>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#e5e7eb" stroke-width="4.5"/>
      <line x1="18" y1="46" x2="46" y2="18" stroke="#e5e7eb" stroke-width="4.5" stroke-linecap="round"/>
    </svg>`
  );

let cachedLogoUrl = null;

export async function resolveBrandLogo() {
  if (cachedLogoUrl) return cachedLogoUrl;
  try {
    const rustDataUrl = await api.getBrandLogo();
    if (rustDataUrl) {
      cachedLogoUrl = rustDataUrl;
      return cachedLogoUrl;
    }
  } catch (e) {}
  return "assets/app-icon.png";
}

export async function hydrateBrandLogos() {
  const resolved = await resolveBrandLogo();
  document.querySelectorAll("img[data-brand-logo]").forEach((img) => {
    img.onerror = () => {
      if (img.src !== FALLBACK_SVG) img.src = FALLBACK_SVG;
    };
    img.src = resolved;
  });
}