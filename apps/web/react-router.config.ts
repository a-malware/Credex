import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	prerender: ['/*?'],
	buildEnd: async ({ viteConfig }) => {
		// Configure build target to support top-level await
	},
	vite: {
		build: {
			target: 'esnext',
		},
		ssr: {
			target: 'node',
		},
	},
} satisfies Config;
