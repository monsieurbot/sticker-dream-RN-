/**
 * Type declarations for whisper.rn module
 * This provides type stubs for the whisper.rn library used in the application
 */

/**
 * Configuration options for Whisper initialization
 */
declare module 'whisper.rn' {
  /**
   * Configuration options for Whisper
   */
  export interface WhisperConfig {
    /** Path to the model file */
    model: string;
    /** Optional language code */
    language?: string;
    /** Number of threads for processing */
    threads?: number;
  }

  /**
   * Result from transcription
   */
  export interface TranscriptionResult {
    /** The transcribed text */
    result: string;
    /** Result status code */
    code?: number;
  }

  /**
   * Whisper class for speech-to-text processing
   */
  export class Whisper {
    /**
     * Initialize Whisper with configuration
     * @param config Configuration for Whisper
     */
    constructor(config: WhisperConfig);

    /**
     * Transcribe audio from a file
     * @param audioUri Path or URI to the audio file
     * @returns Promise resolving to transcription result
     */
    transcribe(audioUri: string): Promise<TranscriptionResult>;

    /**
     * Release Whisper resources
     */
    release?(): Promise<void>;
  }

  export default Whisper;
}
