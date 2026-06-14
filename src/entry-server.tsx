// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import {
  extractLocaleFromPathname,
  resolveServerPreferredLocale,
} from "./lib/i18n/config.ts";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => {
      const requestEvent = getRequestEvent();
      const requestUrl = requestEvent ? new URL(requestEvent.request.url) : null;
      const htmlLocale =
        extractLocaleFromPathname(requestUrl?.pathname ?? "") ??
        (requestEvent ? resolveServerPreferredLocale(requestEvent.request.headers) : "en");

      return (
      <html lang={htmlLocale}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
      );
    }}
  />
));
