import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: false,
	buildEnd: async ({ viteConfig }) => {
		// Configure build target to support top-level await
	},
} satisfies Config;
