import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pro8k.iptv',
  appName: '8K Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    // Load from Vercel = OTA updates without reinstalling
    url: 'https://8kproultimate.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
