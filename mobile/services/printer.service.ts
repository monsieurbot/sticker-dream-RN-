import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Permission } from 'react-native';

// Lazy load Bluetooth module to avoid crashes on startup
let BLEPrinter: any = null;
try {
  const module = require('@conodene/react-native-thermal-receipt-printer-image-qr');
  BLEPrinter = module.BLEPrinter;
} catch (error) {
  console.warn('Bluetooth printer module not available:', error);
  // Create a mock module that throws helpful errors
  BLEPrinter = {
    init: () => Promise.reject(new Error('Bluetooth module not available')),
    getDeviceList: () => Promise.reject(new Error('Bluetooth module not available')),
    connectPrinter: () => Promise.reject(new Error('Bluetooth module not available')),
    closeConn: () => Promise.reject(new Error('Bluetooth module not available')),
    printImageBase64: () => Promise.reject(new Error('Bluetooth module not available')),
    printImage: () => Promise.reject(new Error('Bluetooth module not available')),
    printText: () => Promise.reject(new Error('Bluetooth module not available')),
  };
}

// Type definitions
export interface BluetoothPrinterDevice {
  innerMacAddress: string;
  macAddress?: string;
  deviceName: string;
  isConnected?: boolean;
}

export interface ConnectedPrinterInfo {
  address: string;
  name: string;
  connectedAt: string;
  model?: string;
}

export interface PrintOptions {
  imageWidth?: number;
  imageHeight?: number;
  alignment?: 'left' | 'center' | 'right';
  copies?: number;
  paddingX?: number;
}

export interface ScanResult {
  paired: BluetoothPrinterDevice[];
  unpaired: BluetoothPrinterDevice[];
}

type PermissionStatus = 'granted' | 'denied' | 'never_asked_again';

class PrinterService {
  private connectedPrinter: BluetoothPrinterDevice | null = null;
  private readonly STORAGE_KEY = 'connected_printer_info';
  private readonly PHOMEMO_PM2_WIDTH = 384; // pixels
  private isInitialized = false;

  /**
   * Request necessary Bluetooth permissions
   */
  private async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version as number;
      const permissions: Permission[] = [];

      // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      if (androidVersion >= 31) {
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as Permission,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as Permission
        );
      }

      // Required for both old and new Android versions
      permissions.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as Permission,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION as Permission
      );

      try {
        const results = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(results).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn(
            'Some Bluetooth permissions were denied. Scanning may not work properly.'
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        return false;
      }
    }

    // iOS permissions are handled automatically
    return true;
  }

  /**
   * Initialize BLE printer
   */
  private async initPrinter(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await BLEPrinter.init();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing BLE printer:', error);
      throw new Error(
        `Failed to initialize BLE printer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Scan for available Bluetooth printers
   * Returns both paired and unpaired devices
   */
  async scanPrinters(): Promise<ScanResult> {
    try {
      // Request necessary permissions
      const permissionGranted = await this.requestBluetoothPermissions();
      if (!permissionGranted) {
        console.warn(
          'Bluetooth permissions not fully granted. Results may be incomplete.'
        );
      }

      // Initialize printer
      await this.initPrinter();

      // Get device list
      const devices = await BLEPrinter.getDeviceList();

      // Transform to our format
      const printers: BluetoothPrinterDevice[] = devices.map((device: any) => ({
        innerMacAddress: device.innerMacAddress || device.macAddress || '',
        macAddress: device.macAddress,
        deviceName: device.deviceName || device.name || 'Unknown Device',
        isConnected: false,
      }));

      // For simplicity, return all devices as paired
      return {
        paired: printers,
        unpaired: [],
      };
    } catch (error) {
      console.error('Error scanning for printers:', error);
      throw new Error(
        `Failed to scan for Bluetooth printers: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Connect to a Bluetooth printer
   */
  async connectToPrinter(
    device: BluetoothPrinterDevice
  ): Promise<ConnectedPrinterInfo> {
    try {
      if (!device.innerMacAddress) {
        throw new Error('Invalid device address');
      }

      // Initialize printer if needed
      await this.initPrinter();

      // Attempt connection
      await BLEPrinter.connectPrinter(device.innerMacAddress);

      // Store in memory
      this.connectedPrinter = device;

      // Determine printer model
      const model = this.detectPrinterModel(device.deviceName);

      // Store in AsyncStorage
      const printerInfo: ConnectedPrinterInfo = {
        address: device.innerMacAddress,
        name: device.deviceName,
        model,
        connectedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(printerInfo));

      return printerInfo;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw new Error(
        `Failed to connect to printer "${device.deviceName}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Detect printer model from device name
   */
  private detectPrinterModel(deviceName: string): string {
    const nameLower = deviceName.toLowerCase();

    if (nameLower.includes('phomemo') && nameLower.includes('pm2')) {
      return 'Phomemo PM2';
    }

    if (nameLower.includes('phomemo') && nameLower.includes('pm1')) {
      return 'Phomemo PM1';
    }

    if (nameLower.includes('phomemo')) {
      return 'Phomemo';
    }

    if (
      nameLower.includes('xprinter') ||
      nameLower.includes('xp') ||
      nameLower.includes('printer')
    ) {
      return 'Thermal Printer';
    }

    return 'Unknown';
  }

  /**
   * Disconnect from the current printer
   */
  async disconnectPrinter(): Promise<void> {
    try {
      if (!this.connectedPrinter) {
        throw new Error('No printer currently connected');
      }

      await BLEPrinter.closeConn();

      // Clear from AsyncStorage
      await AsyncStorage.removeItem(this.STORAGE_KEY);

      // Clear from memory
      this.connectedPrinter = null;
    } catch (error) {
      console.error('Error disconnecting from printer:', error);
      throw new Error(
        `Failed to disconnect from printer: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Print a base64 encoded image
   */
  async printImage(
    base64Image: string,
    options: PrintOptions = {}
  ): Promise<void> {
    try {
      if (!this.connectedPrinter) {
        throw new Error('No printer connected. Please connect to a printer first.');
      }

      // Ensure base64 is properly formatted
      const cleanBase64 = this.cleanBase64String(base64Image);

      // Determine image width based on printer model
      const imageWidth = this.determineImageWidth(options.imageWidth);

      // Default options
      const copies = Math.max(1, options.copies || 1);

      // Build print options for the library
      const printOptions = {
        imageWidth: imageWidth,
        imageHeight: options.imageHeight || 0, // 0 = auto height
        paddingX: options.paddingX || 0,
      };

      // Print the image
      for (let i = 0; i < copies; i++) {
        await BLEPrinter.printImageBase64(cleanBase64, printOptions);

        // Add line break between copies
        if (i < copies - 1) {
          await BLEPrinter.printText('\n\n\n', {});
        }
      }

      // Print final line breaks for paper feed
      await BLEPrinter.printText('\n\n', {});
    } catch (error) {
      console.error('Error printing image:', error);
      throw new Error(
        `Failed to print image: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Clean base64 string (remove data URI prefix if present)
   */
  private cleanBase64String(base64: string): string {
    // Remove data URI prefix if present
    if (base64.startsWith('data:')) {
      return base64.split(',')[1] || base64;
    }
    return base64;
  }

  /**
   * Determine the appropriate image width based on printer model
   */
  private determineImageWidth(requestedWidth?: number): number {
    // If user specified a width, use it
    if (requestedWidth && requestedWidth > 0) {
      return requestedWidth;
    }

    // Check connected printer model
    if (
      this.connectedPrinter &&
      this.detectPrinterModel(this.connectedPrinter.deviceName) === 'Phomemo PM2'
    ) {
      return this.PHOMEMO_PM2_WIDTH;
    }

    // Default width for thermal printers (58mm = ~384px)
    return 384;
  }

  /**
   * Get the currently connected printer info
   */
  async getConnectedPrinter(): Promise<ConnectedPrinterInfo | null> {
    try {
      // First check in-memory cache
      if (this.connectedPrinter) {
        const model = this.detectPrinterModel(this.connectedPrinter.deviceName);
        return {
          address: this.connectedPrinter.innerMacAddress,
          name: this.connectedPrinter.deviceName,
          model,
          connectedAt: new Date().toISOString(),
        };
      }

      // Check AsyncStorage as fallback
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const printerInfo = JSON.parse(stored) as ConnectedPrinterInfo;
        return printerInfo;
      }

      return null;
    } catch (error) {
      console.error('Error getting connected printer info:', error);
      return null;
    }
  }

  /**
   * Force reconnect to the last connected printer
   */
  async reconnectLastPrinter(): Promise<ConnectedPrinterInfo | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const printerInfo = JSON.parse(stored) as ConnectedPrinterInfo;

      // Attempt connection
      const device: BluetoothPrinterDevice = {
        innerMacAddress: printerInfo.address,
        deviceName: printerInfo.name,
      };

      return await this.connectToPrinter(device);
    } catch (error) {
      console.error('Error reconnecting to last printer:', error);
      // Clear the stored info if reconnection fails
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  /**
   * Check if a printer is currently connected
   */
  async isPrinterConnected(): Promise<boolean> {
    try {
      return this.connectedPrinter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Print text (useful for labels, headers, etc.)
   */
  async printText(text: string, alignment: 'left' | 'center' | 'right' = 'left'): Promise<void> {
    try {
      if (!this.connectedPrinter) {
        throw new Error('No printer connected. Please connect to a printer first.');
      }

      // The library doesn't support alignment in printText directly
      // You would need to use formatted XML or print commands
      await BLEPrinter.printText(text, {});
    } catch (error) {
      console.error('Error printing text:', error);
      throw new Error(
        `Failed to print text: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Print a line break
   */
  async printLineBreak(lines: number = 1): Promise<void> {
    try {
      if (!this.connectedPrinter) {
        throw new Error('No printer connected. Please connect to a printer first.');
      }

      const lineBreaks = '\n'.repeat(lines);
      await BLEPrinter.printText(lineBreaks, {});
    } catch (error) {
      console.error('Error printing line breaks:', error);
      throw new Error(
        `Failed to print line breaks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Feed paper (advance print position)
   */
  async feedPaper(lines: number = 3): Promise<void> {
    try {
      if (!this.connectedPrinter) {
        throw new Error('No printer connected. Please connect to a printer first.');
      }

      const feedCommand = '\n'.repeat(Math.max(1, lines));
      await BLEPrinter.printText(feedCommand, {});
    } catch (error) {
      console.error('Error feeding paper:', error);
      throw new Error(
        `Failed to feed paper: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Clear all stored printer data
   */
  async clearStoredPrinterData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      this.connectedPrinter = null;
    } catch (error) {
      console.error('Error clearing stored printer data:', error);
      throw new Error(
        `Failed to clear stored printer data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

// Create and export singleton instance
const printerService = new PrinterService();

export {
  printerService,
  // Export type for use in other modules
};

// Export the class as default for dependency injection if needed
export default printerService;
