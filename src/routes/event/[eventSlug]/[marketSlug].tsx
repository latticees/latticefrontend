import { Navigate, useParams } from "@solidjs/router";

import { buildEventHref } from "~/components/market-detail/format.ts";
import { useI18n } from "~/lib/i18n/context.tsx";

export default function EventMarketDetailRoute() {
  const { localizeHref } = useI18n();
  const params = useParams<{ eventSlug: string; marketSlug: string }>();

  return <Navigate href={localizeHref(buildEventHref(params.eventSlug))} />;
}
