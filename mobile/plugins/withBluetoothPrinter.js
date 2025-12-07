const { withAndroidManifest } = require('@expo/config-plugins');

const withBluetoothPrinter = (config) => {
  // La librairie @intechnity/react-native-thermal-printer utilise autolinking
  // Donc pas besoin de configuration Podfile manuelle pour iOS

  // Pour Android, on s'assure que les permissions sont bien présentes
  return withAndroidManifest(config, (androidConfig) => {
    const { manifest } = androidConfig.modResults;

    // Les permissions sont déjà dans app.json, mais on les ajoute ici aussi pour être sûr
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    permissions.forEach(permission => {
      if (!manifest['uses-permission'].find(p => p.$?.['android:name'] === permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission }
        });
      }
    });

    return androidConfig;
  });
};

module.exports = withBluetoothPrinter;
