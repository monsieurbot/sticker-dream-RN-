module.exports = {
  dependencies: {
    'whisper.rn': {
      platforms: {
        ios: null, // Désactive l'autolinking iOS pour whisper.rn
        android: null, // Désactive l'autolinking Android pour whisper.rn
      },
    },
    'react-native-bluetooth-escpos-printer': {
      platforms: {
        ios: null, // Désactive l'autolinking iOS pour le Bluetooth
        android: null, // Désactive l'autolinking Android pour le Bluetooth
      },
    },
  },
};
