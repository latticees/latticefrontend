import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";

import { solidStart } from "@solidjs/start/config";

type SolidStartOptionsWithDevOverlay = Parameters<typeof solidStart>[0] & {
  devOverlay?: boolean;
};

const solidStartOptions: SolidStartOptionsWithDevOverlay = {
  devOverlay: false,
};

export default defineConfig({
  plugins: [
    solidStart(solidStartOptions),
    nitro({
      preset: process.env.VERCEL ? "vercel" : "node-server",
    }),
  ],
});
