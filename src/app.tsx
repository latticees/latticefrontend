import { MetaProvider, Title } from "@solidjs/meta";
import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";

import { I18nProvider } from "./lib/i18n/context.tsx";
import {
  extractLocaleFromPathname,
  resolveClientPreferredLocale,
  resolveServerPreferredLocale,
  stripLocalePrefix,
} from "./lib/i18n/config.ts";
import "./app.css";

function resolvePreferredLocaleForRequest(pathname: string) {
  const localeFromPath = extractLocaleFromPathname(pathname);

  if (localeFromPath) {
    return localeFromPath;
  }

  if (typeof window !== "undefined") {
    return resolveClientPreferredLocale();
  }

  const requestEvent = getRequestEvent();
  return requestEvent ? resolveServerPreferredLocale(requestEvent.request.headers) : resolveClientPreferredLocale();
}

function AppRoot(props: { children: any }) {
  const location = useLocation();
  const localeFromPath = extractLocaleFromPathname(location.pathname);

  const activeLocale = localeFromPath ?? resolvePreferredLocaleForRequest(location.pathname);

  if (typeof document !== "undefined") {
    document.documentElement.lang = activeLocale;
  }

  return <I18nProvider forcedLocale={activeLocale}>{props.children}</I18nProvider>;
}

export default function App() {
  return (
    <Router
      root={props => (
        <MetaProvider>
          <Title>Lattice</Title>
          <Suspense>
            <AppRoot>{props.children}</AppRoot>
          </Suspense>
        </MetaProvider>
      )}
      transformUrl={url => stripLocalePrefix(url)}
    >
      <FileRoutes />
    </Router>
  );
}
