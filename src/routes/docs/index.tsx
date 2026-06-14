import { Navigate } from "@solidjs/router";

import { useI18n } from "~/lib/i18n/context.tsx";

export default function DocsIndexRoute() {
  const { localizeHref } = useI18n();

  return <Navigate href={localizeHref("/docs/overview")} />;
}
