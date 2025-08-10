/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deployment configuration
  output: 'standalone',
  
  // Enable experimental features for better performance
  experimental: {
    // Enable Server Components optimization
    serverComponentsExternalPackages: ['ws', 'nodemailer'],
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Optimize for deployment
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack configuration for dependencies
  webpack: (config, { isServer }) => {
    // Handle WebSocket server for development
    if (isServer) {
      config.externals.push('ws');
    }
    
    // Handle bcrypt native bindings
    config.externals.push('bcrypt');
    
    return config;
  },

  // Custom headers for security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // Redirects for better SEO and user experience
  async redirects() {
    return [
      // Redirect old admin paths to new virus paths
      {
        source: '/admin/:path*',
        destination: '/virus/:path*',
        permanent: true,
      },
      // Redirect common bot-related paths
      {
        source: '/bots',
        destination: '/store',
        permanent: true,
      },
      {
        source: '/products',
        destination: '/store',
        permanent: true,
      },
      // Redirect old contact paths
      {
        source: '/contact',
        destination: '/page/contact',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/page/about',
        permanent: true,
      },
    ];
  },

  // Rewrites for dynamic routing and file serving
  async rewrites() {
    // Development-only legacy API proxy (mirrors previous next.config.mjs)
    const devOnlyBeforeFiles = process.env.NODE_ENV !== 'production' ? [
      {
        source: '/api/legacy/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ] : [];

    return {
      beforeFiles: [
        ...devOnlyBeforeFiles,
        // API rewrites for backward compatibility
        {
          source: '/api/order-status/:item/:refCode',
          destination: '/api/orders/:item/:refCode',
        },
        {
          source: '/download/:fileId',
          destination: '/api/download/:fileId',
        },
      ],
      afterFiles: [
        // Static page rewrites
        {
          source: '/privacy',
          destination: '/terms/privacy-policy',
        },
        {
          source: '/terms',
          destination: '/terms/custom-bot-policy',
        },
      ],
      fallback: [],
    };
  },

  // Environment variable configuration
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Enable strict mode for better development
  reactStrictMode: true,

  // Enable SWC minification for better performance
  swcMinify: true,

  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Disable x-powered-by header
  poweredByHeader: false,

  // Enable compression
  compress: true,

  // Trailing slash handling
  trailingSlash: false,

  // Base path configuration (useful for subdirectory deployments)
  // basePath: process.env.BASE_PATH || '',

  // Asset prefix for CDN
  // assetPrefix: process.env.ASSET_PREFIX || '',

  // Generate build ID for cache busting
  generateBuildId: async () => {
    // Return a unique build ID for deployment
    return `build-${Date.now()}`;
  },
};

module.exports = nextConfig;