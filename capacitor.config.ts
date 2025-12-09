import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.communitycompass.app',
  appName: 'Community Compass',
  webDir: '.next', // Not used in server mode
  server: {
    // For development: point to your Next.js dev server on network
    url: 'http://192.168.1.9:9002',
    cleartext: true,
    // For production: you'll need to deploy Next.js to a server and use that URL
    // url: 'https://your-production-url.com',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light', // Light text for dark status bar
      backgroundColor: '#000000',
      overlaysWebView: true, // Allow content to flow under status bar
    },
  },
};

export default config;
