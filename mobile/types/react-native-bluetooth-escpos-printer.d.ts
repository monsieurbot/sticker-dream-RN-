/**
 * Type declarations for react-native-bluetooth-escpos-printer
 * This module provides Bluetooth ESC/POS printer functionality for React Native
 */

declare module 'react-native-bluetooth-escpos-printer' {
  /**
   * Bluetooth ESC/POS Printer interface
   */
  export class BluetoothEscposPrinter {
    /**
     * Scan for available Bluetooth devices
     * @returns Promise that resolves to an array of discovered devices
     */
    static scan(): Promise<Array<{
      address?: string;
      macAddress?: string;
      name?: string;
    }>>;

    /**
     * Connect to a Bluetooth printer
     * @param address The MAC address of the printer
     * @returns Promise that resolves when connection is established
     */
    static connectPrinter(address: string): Promise<void>;

    /**
     * Close the current Bluetooth connection
     * @returns Promise that resolves when connection is closed
     */
    static closeConn(): Promise<void>;

    /**
     * Get the printer's serial number
     * @returns Promise that resolves to the serial number or connection info
     */
    static getPrinterSerialNumber(): Promise<any>;

    /**
     * Print a base64 encoded image
     * @param base64 Base64 encoded image data
     * @param options Print options (width, height, alignment, etc.)
     * @returns Promise that resolves when printing is complete
     */
    static printPic(
      base64: string,
      options: {
        width?: number;
        height?: number;
        paddingX?: number;
        paddingY?: number;
        align?: number; // 0 = left, 1 = center, 2 = right
      }
    ): Promise<void>;

    /**
     * Print text
     * @param text Text to print
     * @param options Print options (alignment, etc.)
     * @returns Promise that resolves when printing is complete
     */
    static printText(
      text: string,
      options?: {
        align?: number; // 0 = left, 1 = center, 2 = right
      }
    ): Promise<void>;

    /**
     * Initialize/reset the printer
     * @returns Promise that resolves when printer is initialized
     */
    static printerInit(): Promise<void>;
  }
}
