import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import tsconfigPaths from 'vite-tsconfig-paths';
import { addRenderIds } from './plugins/addRenderIds';
import { aliases } from './plugins/aliases';
import consoleToParent from './plugins/console-to-parent';
import { layoutWrapperPlugin } from './plugins/layouts';
import { loadFontsFromTailwindSource } from './plugins/loadFontsFromTailwindSource';
import { nextPublicProcessEnv } from './plugins/nextPublicProcessEnv';
import { restart } from './plugins/restart';
import { restartEnvFileChange } from './plugins/restartEnvFileChange';

export default defineConfig({
  // Keep them available via import.meta.env.NEXT_PUBLIC_*
  envPrefix: 'NEXT_PUBLIC_',
  optimizeDeps: {
    // Explicitly include fast-glob, since it gets dynamically imported and we
    // don't want that to cause a re-bundle.
    include: ['fast-glob', 'lucide-react'],
    exclude: [
      '@hono/auth-js/react',
      '@hono/auth-js',
      '@auth/core',
      '@hono/auth-js',
      'hono/context-storage',
      '@auth/core/errors',
      'fsevents',
      'lightningcss',
      '@ledgerhq/errors',
      '@ledgerhq/devices',
      '@ledgerhq/hw-transport',
      '@ledgerhq/hw-transport-webhid',
      '@particle-network/solana-wallet',
      '@particle-network/auth',
      '@trezor/connect-web',
      '@toruslabs/openlogin-jrpc',
      '@toruslabs/base-controllers',
    ],
  },
  ssr: {
    external: [
      '@ledgerhq/errors',
      '@ledgerhq/devices',
      '@ledgerhq/hw-transport',
      '@ledgerhq/hw-transport-webhid',
      '@toruslabs/solana-embed',
      '@toruslabs/openlogin-jrpc',
      '@toruslabs/base-controllers',
      '@toruslabs/openlogin-utils',
      '@particle-network/solana-wallet',
      '@particle-network/auth',
      '@trezor/connect-web',
      '@ngraveio/bc-ur',
      '@reown/appkit',
      '@reown/appkit-controllers',
      '@walletconnect/universal-provider',
      '@walletconnect/utils',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        'eventemitter3',
        'end-of-stream',
        'events',
        'stream',
        'util',
        'buffer',
        'path',
        'fs',
        'jwt-decode',
        'crypto',
        'color',
        'assert',
        'json-stable-stringify',
      ],
    },
  },
  logLevel: 'info',
  plugins: [
    nextPublicProcessEnv(),
    restartEnvFileChange(),
    reactRouterHonoServer({
      serverEntryPoint: './__create/index.ts',
      runtime: 'node',
    }),
    babel({
      include: ['src/**/*.{js,jsx,ts,tsx}'], // or RegExp: /src\/.*\.[tj]sx?$/
      exclude: /node_modules/, // skip everything else
      babelConfig: {
        babelrc: false, // don’t merge other Babel files
        configFile: false,
        plugins: ['styled-jsx/babel'],
      },
    }),
    restart({
      restart: [
        'src/**/page.jsx',
        'src/**/page.tsx',
        'src/**/layout.jsx',
        'src/**/layout.tsx',
        'src/**/route.js',
        'src/**/route.ts',
      ],
    }),
    consoleToParent(),
    loadFontsFromTailwindSource(),
    addRenderIds(),
    reactRouter(),
    tsconfigPaths(),
    aliases(),
    layoutWrapperPlugin(),
  ],
  resolve: {
    alias: {
      lodash: 'lodash-es',
      'npm:stripe': 'stripe',
      stripe: path.resolve(__dirname, './src/__create/stripe'),
      '@auth/create/react': '@hono/auth-js/react',
      '@auth/create': path.resolve(__dirname, './src/__create/@auth/create'),
      '@solana/wallet-adapter-ledger': path.resolve(__dirname, './src/__create/empty-module.js'),
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  clearScreen: false,
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 4000,
    hmr: {
      overlay: false,
    },
    warmup: {
      clientFiles: ['./src/app/**/*', './src/app/root.tsx', './src/app/routes.ts'],
    },
  },
});
