import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

export default {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{nfc-pcsc,@serialport,bindings,prebuild-install}/**/*"
    },
    name: 'NFC Electron App',
    executableName: 'nfc-app',
    appBundleId: 'com.muhammadahmad.nfcapp',
    appCategoryType: 'public.app-category.utilities',
    // Don't ignore node_modules for native modules
    ignore: [
      /\.git/, 
      /src/,
      // Only ignore non-essential node_modules, keep native dependencies
      /node_modules\/(?!nfc-pcsc|@serialport|bindings|prebuild-install|detect-libc|fs-minipass|minipass|tar|chownr|mkdirp)/
    ],
    // Ensure proper permissions for native modules on macOS
    osxSign: false, // Disable code signing for now
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      console.log(`Packaging for ${platform}-${arch}`);
      console.log(`Build path: ${buildPath}`);
      
      // For macOS, ensure proper permissions
      if (platform === 'darwin') {
        const { exec } = require('child_process');
        const path = require('path');
        
        // Set executable permissions for native binaries
        const nativeModulesPath = path.join(buildPath, 'node_modules');
        exec(`find "${nativeModulesPath}" -name "*.node" -exec chmod +x {} \\;`, (error) => {
          if (error) {
            console.warn('Warning: Could not set permissions for native modules:', error.message);
          }
          callback();
        });
      } else {
        callback();
      }
    }],
  },
  rebuildConfig: {
    buildFromSource: true,
    onlyModules: ['nfc-pcsc'],
    force: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin']
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: 'nfc_app',
        authors: 'Muhammad Ahmad',
        description: 'NFC Manager Application'
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {
        // Force unpacking of all native dependencies
        include: [
          'nfc-pcsc/**',
          '@serialport/**', 
          'bindings/**',
          'prebuild-install/**'
        ],
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false, // Changed to false for native modules
    }),
  ],
};