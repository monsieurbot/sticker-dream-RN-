import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions
export interface BluetoothPrinterDevice {
  address: string;
  name: string;
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
  alignment?: 'left' | 'center' | 'right';
  copies?: number;
}

export interface ScanResult {
  paired: BluetoothPrinterDevice[];
  unpaired: BluetoothPrinterDevice[];
}

// Mock printer service (Bluetooth temporarily disabled)
class MockPrinterService {
  async scanPrinters(): Promise<ScanResult> {
    console.warn('Bluetooth printing temporarily disabled');
    return { paired: [], unpaired: [] };
  }

  async connectToPrinter(device: BluetoothPrinterDevice): Promise<ConnectedPrinterInfo> {
    throw new Error('Bluetooth printing temporarily disabled');
  }

  async disconnectPrinter(): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
  }

  async printImage(base64Image: string, options: PrintOptions = {}): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
    throw new Error('Bluetooth printing temporarily disabled');
  }

  async getConnectedPrinter(): Promise<ConnectedPrinterInfo | null> {
    return null;
  }

  async reconnectLastPrinter(): Promise<ConnectedPrinterInfo | null> {
    return null;
  }

  async isPrinterConnected(): Promise<boolean> {
    return false;
  }

  async printText(text: string, alignment: 'left' | 'center' | 'right' = 'left'): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
    throw new Error('Bluetooth printing temporarily disabled');
  }

  async printLineBreak(lines: number = 1): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
  }

  async resetPrinter(): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
  }

  async feedPaper(lines: number = 3): Promise<void> {
    console.warn('Bluetooth printing temporarily disabled');
  }

  async clearStoredPrinterData(): Promise<void> {
    await AsyncStorage.removeItem('connected_printer_info');
  }
}

// Create and export singleton instance
const printerService = new MockPrinterService();

export { printerService };
export default printerService;
