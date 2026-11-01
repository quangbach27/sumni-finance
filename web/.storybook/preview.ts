import '../src/styles.css';

import { useEffect } from 'react';

import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    // Canvas follows the toolbar theme (var(--background))
    backgrounds: {
      options: { theme: { name: 'theme', value: 'var(--background)' } },
    },
  },
  initialGlobals: {
    theme: 'light',
    backgrounds: { value: 'theme' },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;

      useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, [theme]);

      return Story();
    },
  ],
};

export default preview;
