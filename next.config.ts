import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded from node_modules at run time rather than bundled: @sparticuz/chromium
  // unpacks its own browser binary, which bundling would leave behind.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The PDF route reads its fonts from node_modules on disk (see lib/pdf.ts),
  // and Vercel only ships files a function is traced to use.
  outputFileTracingIncludes: {
    "/api/render-pdf": [
      "./node_modules/@fontsource/arimo/files/*.woff2",
      "./node_modules/@fontsource/noto-sans-arabic/files/*.woff2",
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
};

export default nextConfig;
