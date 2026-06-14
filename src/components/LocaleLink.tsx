import { A } from "@solidjs/router";
import { splitProps, type JSX } from "solid-js";

import { useI18n } from "~/lib/i18n/context.tsx";

type LocaleLinkProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export default function LocaleLink(props: LocaleLinkProps) {
  const { localizeHref } = useI18n();
  const [local, rest] = splitProps(props, ["href"]);

  return <A {...rest} href={localizeHref(local.href)} />;
}
