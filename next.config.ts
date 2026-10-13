import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/api/email-import/parse-pdf': ['./node_modules/pdfjs-dist/package.json', './node_modules/pdfjs-dist/legacy/build/*', './node_modules/pdfjs-dist/standard_fonts/*', './node_modules/pdfjs-dist/cmaps/*'],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
