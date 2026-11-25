/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server routes read the prebuilt Bible data from ./data at runtime.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*"],
  },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: "/data/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }];
  },
};
export default nextConfig;
