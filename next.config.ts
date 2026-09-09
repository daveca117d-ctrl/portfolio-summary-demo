import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The proxy (password gate) buffers request bodies; the weekly master
    // workbook upload runs to a few MB — raise the cap so /update can ingest it.
    proxyClientMaxBodySize: "64mb",
  },
};

export default nextConfig;
