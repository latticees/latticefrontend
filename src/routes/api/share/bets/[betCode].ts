import { Resvg } from "@resvg/resvg-js";
import type { APIEvent } from "@solidjs/start/server";

import { marketClient } from "~/lib/market/index.ts";
import {
  buildStackShareImageSvg,
  buildStackShareSnapshot,
} from "~/lib/share/stack-share.ts";

export async function GET(event: APIEvent) {
  const betCode = event.params.betCode?.trim();

  if (!betCode) {
    return new Response("Missing bet code.", { status: 400 });
  }

  try {
    const bet = await marketClient.fetchStackBet(betCode);
    const svg = buildStackShareImageSvg(buildStackShareSnapshot(bet));
    const png = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: 1200,
      },
    })
      .render()
      .asPng();

    return new Response(png, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch {
    return new Response("Unable to render the stack card.", { status: 404 });
  }
}
