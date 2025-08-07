import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

export default {
  packagerConfig: {
    asar: true,
    name: 'NFC Electron App',
    executableName: 'nfc-app',
    // macOS specific options
    appBundleId: 'com.muhammadahmad.nfcapp',
    appCategoryType: 'public.app-category.utilities',
    ignore: [/\.git/, /node_modules\/(?!nfc-pcsc)/, /src/],
    // Ensure native modules are properly included
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      console.log(`Packaging for ${platform}-${arch}`);
      callback();
    }],
  },
  rebuildConfig: {
    buildFromSource: false,
    onlyModules: ['nfc-pcsc'],
  },
  makers: [
    // Windows makers
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'nfc_app',
        authors: 'Muhammad Ahmad',
        description: 'NFC Manager Application'
      }
    },
    // macOS makers - ZIP only for now
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    }
    // DMG removed temporarily to avoid path issues
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {
        // Explicitly unpack nfc-pcsc native modules
        include: ['nfc-pcsc'],
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};