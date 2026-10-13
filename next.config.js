/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.148.248'],

  // @sparticuz/chromium 是运行时动态 import 的，Next.js 的依赖追踪（NFT）
  // 静态分析看不到它，整个包都不会进函数产物，运行时报
  // "The input directory .../node_modules/@sparticuz/chromium/bin does not exist"。
  // 标记为外部包让它在运行时从 node_modules 加载，再用 outputFileTracingIncludes
  // 把二进制目录显式带上。
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    // 注意：Next.js 14 里 outputFileTracingIncludes 必须放在 experimental 下，
    // 放顶层会被静默忽略（构建时只报 "Unrecognized key(s)" 警告）。
    // Next 15 才移到顶层 —— 升级时记得搬。
    outputFileTracingIncludes: {
      '/api/video-parse': ['./node_modules/@sparticuz/chromium/bin/**/*'],
      '/api/video-parse/route': ['./node_modules/@sparticuz/chromium/bin/**/*'],
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        zlib: false,
        path: false,
        stream: false,
        crypto: false,
      };
      // Handle node: scheme imports from pptxgenjs
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
    }
    return config;
  },
}

module.exports = nextConfig
