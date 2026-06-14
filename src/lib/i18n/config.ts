export const DEFAULT_LOCALE = "en" as const;
export const LOCALE_COOKIE_KEY = "NEXT_LOCALE";
export const LOCALE_STORAGE_KEY = "pm-locale";

export const SUPPORTED_LOCALES = [
  { code: "en", intl: "en-US", label: "English", nativeLabel: "English", flagAsset: "/usa.png" },
  { code: "es", intl: "es-ES", label: "Spanish", nativeLabel: "Español", flagAsset: "/esp.png" },
  { code: "fr", intl: "fr-FR", label: "French", nativeLabel: "Français", flagAsset: "/fra.png" },
  { code: "de", intl: "de-DE", label: "German", nativeLabel: "Deutsch", flagAsset: "/deu.png" },
  { code: "ja", intl: "ja-JP", label: "Japanese", nativeLabel: "日本語", flagAsset: "/jpn.png" },
  { code: "zh", intl: "zh-CN", label: "Chinese", nativeLabel: "中文", flagAsset: "/chn.png" },
  {
    code: "id",
    intl: "id-ID",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    flagAsset: "/idn.png",
  },
  { code: "bn", intl: "bn-BD", label: "Bengali", nativeLabel: "বাংলা", flagAsset: "/bgd.png" },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES.map(locale => locale.code));
const TECHNICAL_PATH_PREFIXES = ["/google/callback"];

export function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  if (!value) {
    return false;
  }

  return SUPPORTED_LOCALE_SET.has(value.toLowerCase());
}

export function normalizeLocale(value: string | null | undefined): SupportedLocale | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  return isSupportedLocale(normalizedValue) ? normalizedValue : null;
}

export function getIntlLocale(locale: SupportedLocale): string {
  return SUPPORTED_LOCALES.find(entry => entry.code === locale)?.intl ?? "en-US";
}

export function getLanguageLabel(locale: SupportedLocale): string {
  return SUPPORTED_LOCALES.find(entry => entry.code === locale)?.nativeLabel ?? "English";
}

export function getLanguageFlagAsset(locale: SupportedLocale): string {
  return SUPPORTED_LOCALES.find(entry => entry.code === locale)?.flagAsset ?? "/usa.png";
}

export function extractLocaleFromPathname(pathname: string): SupportedLocale | null {
  const [, firstSegment = ""] = pathname.split("/");
  return normalizeLocale(firstSegment);
}

export function stripLocalePrefix(pathname: string): string {
  const locale = extractLocaleFromPathname(pathname);

  if (!locale) {
    return pathname || "/";
  }

  const withoutLocale = pathname.slice(locale.length + 1);
  return withoutLocale.length > 0 ? withoutLocale : "/";
}

export function isTechnicalUnlocalizedPath(pathname: string): boolean {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return TECHNICAL_PATH_PREFIXES.some(prefix => normalizedPathname === prefix);
}

export function localizePath(inputPath: string, locale: SupportedLocale): string {
  void locale;

  if (!inputPath || inputPath.startsWith("#")) {
    return inputPath;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(inputPath) || inputPath.startsWith("mailto:")) {
    return inputPath;
  }

  const normalizedInput = inputPath.startsWith("/") ? inputPath : `/${inputPath}`;

  if (isTechnicalUnlocalizedPath(normalizedInput)) {
    return normalizedInput;
  }

  const hashIndex = normalizedInput.indexOf("#");
  const queryIndex = normalizedInput.indexOf("?");
  const pathEndIndex =
    hashIndex === -1
      ? queryIndex === -1
        ? normalizedInput.length
        : queryIndex
      : queryIndex === -1
        ? hashIndex
        : Math.min(hashIndex, queryIndex);
  const pathname = normalizedInput.slice(0, pathEndIndex);
  const suffix = normalizedInput.slice(pathEndIndex);
  const canonicalPath = stripLocalePrefix(pathname);

  return `${canonicalPath === "/" ? "/" : canonicalPath}${suffix}`;
}

export function buildLocaleRedirectPath(
  pathname: string,
  search = "",
  hash = "",
  locale: SupportedLocale,
): string {
  return localizePath(`${pathname}${search}${hash}`, locale);
}

function readCookieLocale(cookieValue: string | null | undefined): SupportedLocale | null {
  if (!cookieValue) {
    return null;
  }

  for (const cookiePart of cookieValue.split(";")) {
    const [rawName, rawValue = ""] = cookiePart.trim().split("=");

    if (rawName !== LOCALE_COOKIE_KEY) {
      continue;
    }

    return normalizeLocale(decodeURIComponent(rawValue));
  }

  return null;
}

function readAcceptLanguageLocale(headerValue: string | null | undefined): SupportedLocale | null {
  if (!headerValue) {
    return null;
  }

  for (const languagePart of headerValue.split(",")) {
    const baseLanguage = languagePart.split(";")[0]?.trim().toLowerCase();

    if (!baseLanguage) {
      continue;
    }

    const directMatch = normalizeLocale(baseLanguage);

    if (directMatch) {
      return directMatch;
    }

    const primaryTag = normalizeLocale(baseLanguage.split("-")[0]);

    if (primaryTag) {
      return primaryTag;
    }
  }

  return null;
}

export function resolveClientPreferredLocale(): SupportedLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  try {
    const storedLocale = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));

    if (storedLocale) {
      return storedLocale;
    }
  } catch {
    // Ignore storage failures and continue to cookie/browser fallback.
  }

  const cookieLocale = readCookieLocale(document.cookie);

  if (cookieLocale) {
    return cookieLocale;
  }

  const browserLanguages = [
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language,
  ];

  for (const language of browserLanguages) {
    const directMatch = normalizeLocale(language);

    if (directMatch) {
      return directMatch;
    }

    const primaryTag = normalizeLocale(language?.split("-")[0]);

    if (primaryTag) {
      return primaryTag;
    }
  }

  return DEFAULT_LOCALE;
}

export function resolveServerPreferredLocale(headers: Headers): SupportedLocale {
  const cookieLocale = readCookieLocale(headers.get("cookie"));

  if (cookieLocale) {
    return cookieLocale;
  }

  const acceptLanguageLocale = readAcceptLanguageLocale(headers.get("accept-language"));

  if (acceptLanguageLocale) {
    return acceptLanguageLocale;
  }

  return DEFAULT_LOCALE;
}

export function persistLocale(locale: SupportedLocale) {
  if (typeof document === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures.
  }

  document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
