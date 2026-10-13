import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jumitech.billionrush',
  appName: 'Billion Rush',
  webDir: 'billion-rush/dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
};

export default config;
