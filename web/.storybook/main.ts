import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    // Router/devtools plugins from vite.config.ts are app-only; keep the rest.
    plugins: (viteConfig.plugins ?? []).filter((plugin) => {
      const name = (plugin as { name?: string } | null)?.name ?? '';
      return !/tanstack|devtools/i.test(name);
    }),
  }),
};

export default config;
