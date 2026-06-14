import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";

import DocsPageLayout from "~/components/docs/DocsPageLayout.tsx";
import Navbar from "~/components/Navbar";
import PublicState from "~/components/public-browser/PublicState.tsx";
import { getDocsPage } from "~/lib/docs/content.ts";

export default function DocsDetailRoute() {
  const params = useParams<{ slug: string }>();
  const page = () => getDocsPage(params.slug);

  return (
    <div class="pm-page pm-docs-page">
      <Title>{`${page()?.label ?? "Docs"} | Sabimarket`}</Title>
      <Navbar />

      {page() ? (
        <DocsPageLayout page={page()!} />
      ) : (
        <main class="pm-detail">
          <PublicState
            title="Doc page not found"
            copy="The requested documentation page does not exist."
          />
        </main>
      )}
    </div>
  );
}
