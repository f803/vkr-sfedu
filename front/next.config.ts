import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002',
    NEXT_PUBLIC_PRODUCTION_BACKEND_URL: process.env.NEXT_PUBLIC_PRODUCTION_BACKEND_URL || 'https://api.nevermoxsw.tech'
  },
};

export default nextConfig;
