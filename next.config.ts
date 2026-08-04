import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=*, microphone=*, geolocation=(self), display-capture=*" },
        { key: "Content-Security-Policy", value: "default-src 'self' https://meet.jit.si https://*.jitsi.net https://*.jit.si; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://meet.jit.si https://*.jitsi.net unpkg.com; style-src 'self' 'unsafe-inline' unpkg.com fonts.googleapis.com; img-src 'self' data: blob: *.tile.openstreetmap.org https://*; connect-src 'self' nominatim.openstreetmap.org https://* wss://*; font-src 'self' fonts.gstatic.com data:; frame-src 'self' https://meet.jit.si https://*.jitsi.net https://*.jit.si; media-src 'self' blob: https://*;" },
      ],
    }];
  },
};

export default nextConfig;
