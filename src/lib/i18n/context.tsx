import { createContext, createMemo, useContext, type JSX } from "solid-js";
import { useLocation } from "@solidjs/router";

import {
  DEFAULT_LOCALE,
  extractLocaleFromPathname,
  getIntlLocale,
  localizePath,
  persistLocale,
  stripLocalePrefix,
  type SupportedLocale,
} from "./config.ts";
import { translate, type TranslationKey } from "./messages.ts";

interface I18nContextValue {
  locale: () => SupportedLocale;
  intlLocale: () => string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  localizeHref: (path: string) => string;
  stripPathname: (pathname: string) => string;
  switchLocale: (nextLocale: SupportedLocale) => void;
}

const I18nContext = createContext<I18nContextValue>();

export function I18nProvider(props: { children: JSX.Element; forcedLocale?: SupportedLocale }) {
  const location = useLocation();
  const locale = createMemo<SupportedLocale>(
    () => props.forcedLocale ?? extractLocaleFromPathname(location.pathname) ?? DEFAULT_LOCALE,
  );
  const intlLocale = createMemo(() => getIntlLocale(locale()));
  const localizeHref = (path: string) => localizePath(path, locale());
  const stripPathname = (pathname: string) => stripLocalePrefix(pathname);
  const switchLocale = (nextLocale: SupportedLocale) => {
    if (nextLocale === locale()) {
      return;
    }

    persistLocale(nextLocale);

    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : `${location.pathname}${location.search}${location.hash}`;
    const nextPath = localizePath(currentPath, nextLocale);

    if (typeof window !== "undefined") {
      window.location.assign(nextPath);
    }
  };

  const contextValue: I18nContextValue = {
    locale,
    intlLocale,
    t: (key, params) => translate(locale(), key, params),
    localizeHref,
    stripPathname,
    switchLocale,
  };

  return <I18nContext.Provider value={contextValue}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return context;
}
