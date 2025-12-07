import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { initWhisper as initWhisperRN } from 'whisper.rn';
import type { WhisperContext } from 'whisper.rn';
import { getCurrentModelFilename, getCurrentModelPath, isModelDownloaded, getLanguage } from './language.service';
import { getModelByType } from '../types/whisper.types';

/**
 * Transcription result from Whisper speech-to-text processing
 */
export interface TranscriptionResult {
  /** The transcribed text from the audio */
  text: string;
  /** Whether the result is an abort/cancel command */
  isAbort: boolean;
  /** The abort command if detected, or null */
  abortCommand: AbortCommand | null;
  /** Duration of the audio in milliseconds */
  duration: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Any error that occurred during transcription, if applicable */
  error: Error | null;
}

/**
 * Abort/cancel command types
 */
export type AbortCommand = 'BLANK' | 'NO IMAGE' | 'NO STICKER' | 'CANCEL' | 'ABORT' | 'START OVER';

/**
 * Progress callback for long-running transcriptions
 */
export type TranscriptionProgressCallback = (progress: TranscriptionProgress) => void;

/**
 * Progress information during transcription
 */
export interface TranscriptionProgress {
  /** Current processing step */
  step: 'extracting' | 'transcribing' | 'processing' | 'complete';
  /** Percentage completion (0-100) */
  percentage: number;
  /** Descriptive message about current progress */
  message: string;
}

/**
 * Audio recording state
 */
interface RecordingState {
  recording: Audio.Recording | null;
  isRecording: boolean;
  startTime: number;
}

/**
 * Whisper service for speech-to-text transcription
 */
class WhisperService {
  private whisperContext: WhisperContext | null = null;
  private recordingState: RecordingState = {
    recording: null,
    isRecording: false,
    startTime: 0,
  };
  private isInitialized: boolean = false;
  private currentModelFilename: string | null = null;
  private readonly abortWords = new Set<string>(['BLANK', 'NO IMAGE', 'NO STICKER', 'CANCEL', 'ABORT', 'START OVER']);

  /**
   * Initialize Whisper with the currently selected language model
   * This should be called once on app startup
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails
   */
  async initWhisper(): Promise<void> {
    try {
      // Get current language preference and model path
      const modelPath = await getCurrentModelPath();
      const modelFilename = await getCurrentModelFilename();

      console.log('🎤 Initializing Whisper:', {
        modelPath,
        modelFilename,
        isInitialized: this.isInitialized,
      });

      // If already initialized with the same model, skip re-initialization
      if (this.isInitialized && this.whisperContext && this.currentModelFilename === modelFilename) {
        console.log('✅ Whisper already initialized with this model');
        return;
      }

      // Check if model is downloaded
      const languagePreference = await getLanguage();
      const modelDownloaded = await isModelDownloaded(languagePreference.modelType);

      console.log('📦 Model check:', {
        languageCode: languagePreference.languageCode,
        modelType: languagePreference.modelType,
        modelDownloaded,
      });

      if (!modelDownloaded) {
        throw new Error(
          `Model not found: ${modelFilename}. Please download the model in Settings.`
        );
      }

      // Initialize Whisper with selected model using the correct API
      console.log('🚀 Initializing Whisper with filePath:', modelPath);

      this.whisperContext = await initWhisperRN({
        filePath: modelPath,
      });

      this.currentModelFilename = modelFilename;
      this.isInitialized = true;

      console.log('✅ Whisper initialized successfully!');
    } catch (error) {
      console.error('❌ Whisper initialization failed:', error);
      this.isInitialized = false;
      this.whisperContext = null;
      this.currentModelFilename = null;
      throw new Error(
        `Failed to initialize Whisper: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Reload Whisper with a different model
   * Call this after changing language in settings
   *
   * @returns Promise that resolves when reload is complete
   * @throws Error if reload fails
   */
  async reloadModel(): Promise<void> {
    // Reset initialization state to force reload
    this.isInitialized = false;
    this.whisperContext = null;
    this.currentModelFilename = null;

    // Re-initialize with new model
    await this.initWhisper();
  }

  /**
   * Request microphone permissions
   *
   * @returns Promise that resolves to true if permission granted
   * @throws Error if permission request fails
   */
  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.granted;
    } catch (error) {
      throw new Error(
        `Failed to request microphone permission: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start audio recording
   * Requests microphone permissions if not already granted
   *
   * @returns Promise that resolves when recording has started
   * @throws Error if recording cannot be started
   */
  async startRecording(): Promise<void> {
    try {
      // Request microphone permission
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      // Stop any existing recording
      if (this.recordingState.recording) {
        await this.recordingState.recording.stopAndUnloadAsync();
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start new recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      this.recordingState = {
        recording,
        isRecording: true,
        startTime: Date.now(),
      };
    } catch (error) {
      this.recordingState = {
        recording: null,
        isRecording: false,
        startTime: 0,
      };
      throw new Error(
        `Failed to start recording: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Stop audio recording and return the file URI
   *
   * @returns Promise that resolves to the audio file URI
   * @throws Error if recording cannot be stopped
   */
  async stopRecording(): Promise<string> {
    try {
      if (!this.recordingState.recording || !this.recordingState.isRecording) {
        throw new Error('No recording in progress');
      }

      await this.recordingState.recording.stopAndUnloadAsync();
      const uri = this.recordingState.recording.getURI();

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      const duration = Date.now() - this.recordingState.startTime;
      this.recordingState = {
        recording: null,
        isRecording: false,
        startTime: 0,
      };

      return uri;
    } catch (error) {
      this.recordingState = {
        recording: null,
        isRecording: false,
        startTime: 0,
      };
      throw new Error(
        `Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel the current recording without saving
   *
   * @returns Promise that resolves when recording is cancelled
   */
  async cancelRecording(): Promise<void> {
    try {
      if (this.recordingState.recording) {
        await this.recordingState.recording.stopAndUnloadAsync();
      }
      this.recordingState = {
        recording: null,
        isRecording: false,
        startTime: 0,
      };
    } catch (error) {
      console.warn('Error cancelling recording:', error);
      this.recordingState = {
        recording: null,
        isRecording: false,
        startTime: 0,
      };
    }
  }

  /**
   * Get current recording state
   *
   * @returns True if currently recording
   */
  isRecording(): boolean {
    return this.recordingState.isRecording;
  }

  /**
   * Transcribe an audio file using Whisper
   * Includes support for abort word detection and progress tracking
   *
   * @param audioUri - URI of the audio file to transcribe
   * @param onProgress - Optional callback for transcription progress
   * @returns Promise that resolves to the transcription result
   * @throws Error if transcription fails
   */
  async transcribeAudio(
    audioUri: string,
    onProgress?: TranscriptionProgressCallback
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    console.log('=== 🎤 TRANSCRIBE AUDIO START ===');
    console.log('Audio URI:', audioUri);
    console.log('Is initialized:', this.isInitialized);
    console.log('Has context:', !!this.whisperContext);

    try {
      // Verify Whisper is initialized
      if (!this.whisperContext || !this.isInitialized) {
        console.error('❌ Whisper not initialized!');
        throw new Error('Whisper not initialized. Call initWhisper() first');
      }

      console.log('✅ Whisper is initialized');

      // Verify audio file exists
      console.log('📁 Checking audio file...');
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error(`Audio file not found: ${audioUri}`);
      }

      console.log('✅ Audio file exists');

      // Report transcription start
      onProgress?.({
        step: 'extracting',
        percentage: 10,
        message: 'Preparing audio...',
      });

      // Get file info for duration estimation
      const fileSize = fileInfo.size ?? 0;

      // Report transcription in progress
      onProgress?.({
        step: 'transcribing',
        percentage: 30,
        message: 'Transcribing audio...',
      });

      console.log('📋 Getting language preference...');
      // Get language for transcription options
      const languagePreference = await getLanguage();
      console.log('Language preference:', languagePreference);

      const transcribeOptions: any = {};

      console.log('📋 Getting model by type...');
      // Add language hint for multilingual models
      const model = getModelByType(languagePreference.modelType);
      console.log('Model:', model);

      if (model && model.isMultilingual) {
        transcribeOptions.language = languagePreference.languageCode;
      }

      console.log('🎯 Transcribing with options:', transcribeOptions);
      console.log('🎯 Whisper context:', this.whisperContext);
      console.log('🎯 Audio URI:', audioUri);

      // Verify whisperContext exists and has transcribe method
      if (!this.whisperContext) {
        throw new Error('Whisper context is null');
      }

      if (typeof this.whisperContext.transcribe !== 'function') {
        console.error('❌ whisperContext.transcribe is not a function!');
        console.error('Available methods:', Object.keys(this.whisperContext));
        throw new Error('transcribe is not a function on whisperContext');
      }

      // Perform transcription using the correct API
      console.log('📝 Calling whisperContext.transcribe...');
      const transcribeResult = this.whisperContext.transcribe(audioUri, transcribeOptions);
      console.log('📝 Transcribe result:', transcribeResult);

      const { promise } = transcribeResult;
      const transcriptionResult = await promise;

      // Report processing in progress
      onProgress?.({
        step: 'processing',
        percentage: 80,
        message: 'Processing results...',
      });

      // Extract text and clean it
      const text = transcriptionResult?.result ?? '';
      const cleanedText = this.normalizeText(text);

      // Check for abort commands
      const { isAbort, abortCommand } = this.detectAbortCommand(cleanedText);

      // Calculate duration (estimate based on file size)
      const duration = this.estimateAudioDuration(fileSize);
      const processingTime = Date.now() - startTime;

      // Report completion
      onProgress?.({
        step: 'complete',
        percentage: 100,
        message: 'Transcription complete',
      });

      return {
        text: cleanedText,
        isAbort,
        abortCommand,
        duration,
        processingTime,
        error: null,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        text: '',
        isAbort: false,
        abortCommand: null,
        duration: 0,
        processingTime,
        error: new Error(`Transcription failed: ${errorMessage}`),
      };
    }
  }

  /**
   * Normalize and clean transcribed text
   *
   * @param text - Raw transcribed text
   * @returns Normalized text
   */
  private normalizeText(text: string): string {
    // Remove leading/trailing whitespace and normalize case
    return text.trim();
  }

  /**
   * Detect if text matches any abort command
   *
   * @param text - Transcribed text to check
   * @returns Object with isAbort flag and matched abort command if any
   */
  private detectAbortCommand(text: string): { isAbort: boolean; abortCommand: AbortCommand | null } {
    const upperText = text.toUpperCase().trim();

    // Check for exact matches or command patterns
    for (const command of this.abortWords) {
      // Check for exact word match
      if (upperText === command) {
        return { isAbort: true, abortCommand: command as AbortCommand };
      }

      // Check for command at the beginning of text (common speech patterns)
      if (upperText.startsWith(command + ' ') || upperText.startsWith(command + '.')) {
        return { isAbort: true, abortCommand: command as AbortCommand };
      }
    }

    // Check for partial matches within larger transcriptions
    if (this.containsAbortPhrase(upperText)) {
      // Find which abort command was mentioned
      for (const command of this.abortWords) {
        if (upperText.includes(' ' + command) || upperText.includes(command + ' ')) {
          return { isAbort: true, abortCommand: command as AbortCommand };
        }
      }
    }

    return { isAbort: false, abortCommand: null };
  }

  /**
   * Check if text contains any abort phrase
   *
   * @param upperText - Uppercase version of the text
   * @returns True if any abort phrase is found
   */
  private containsAbortPhrase(upperText: string): boolean {
    for (const command of this.abortWords) {
      if (upperText.includes(command)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Estimate audio duration based on file size
   * This is an approximation; actual duration depends on codec and bitrate
   *
   * @param fileSize - Size of audio file in bytes
   * @returns Estimated duration in milliseconds
   */
  private estimateAudioDuration(fileSize: number): number {
    // HIGH_QUALITY preset uses approximately 128 kbps bitrate for audio
    // 128 kbps = 16000 bytes/second
    // So: duration (ms) = (fileSize / 16000) * 1000
    const estimatedSeconds = fileSize / 16000;
    return Math.round(estimatedSeconds * 1000);
  }

  /**
   * Clean up resources
   * Should be called when the service is no longer needed
   */
  async cleanup(): Promise<void> {
    try {
      await this.cancelRecording();
      // Reset state
      this.whisperContext = null;
      this.isInitialized = false;
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }

  /**
   * Check if Whisper is initialized and ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.whisperContext !== null;
  }
}

// Export singleton instance
const whisperService = new WhisperService();

/**
 * Initialize Whisper with the tiny English model
 *
 * @returns Promise that resolves when initialization is complete
 * @throws Error if initialization fails
 *
 * @example
 * ```typescript
 * await initWhisper();
 * ```
 */
export async function initWhisper(): Promise<void> {
  return whisperService.initWhisper();
}

/**
 * Start audio recording
 * Requests microphone permissions if not already granted
 *
 * @returns Promise that resolves when recording has started
 * @throws Error if recording cannot be started
 *
 * @example
 * ```typescript
 * await startRecording();
 * ```
 */
export async function startRecording(): Promise<void> {
  return whisperService.startRecording();
}

/**
 * Stop audio recording and return the file URI
 *
 * @returns Promise that resolves to the audio file URI
 * @throws Error if recording cannot be stopped
 *
 * @example
 * ```typescript
 * const audioUri = await stopRecording();
 * ```
 */
export async function stopRecording(): Promise<string> {
  return whisperService.stopRecording();
}

/**
 * Transcribe an audio file using Whisper
 * Includes support for abort word detection and progress tracking
 *
 * @param audioUri - URI of the audio file to transcribe
 * @param onProgress - Optional callback for transcription progress
 * @returns Promise that resolves to the transcription result
 * @throws Error if transcription fails
 *
 * @example
 * ```typescript
 * const result = await transcribeAudio(audioUri, (progress) => {
 *   console.log(`Progress: ${progress.percentage}% - ${progress.message}`);
 * });
 *
 * if (result.error) {
 *   console.error('Transcription failed:', result.error);
 * } else if (result.isAbort) {
 *   console.log('Abort command detected:', result.abortCommand);
 * } else {
 *   console.log('Transcribed text:', result.text);
 * }
 * ```
 */
export async function transcribeAudio(
  audioUri: string,
  onProgress?: TranscriptionProgressCallback
): Promise<TranscriptionResult> {
  return whisperService.transcribeAudio(audioUri, onProgress);
}

/**
 * Check if currently recording
 *
 * @returns True if currently recording
 *
 * @example
 * ```typescript
 * if (whisperService.isRecording()) {
 *   console.log('Recording in progress');
 * }
 * ```
 */
export function isRecording(): boolean {
  return whisperService.isRecording();
}

/**
 * Cancel the current recording without saving
 *
 * @returns Promise that resolves when recording is cancelled
 *
 * @example
 * ```typescript
 * await cancelRecording();
 * ```
 */
export async function cancelRecording(): Promise<void> {
  return whisperService.cancelRecording();
}

/**
 * Reload Whisper model (call after changing language)
 *
 * @returns Promise that resolves when model is reloaded
 *
 * @example
 * ```typescript
 * await reloadModel();
 * ```
 */
export async function reloadModel(): Promise<void> {
  return whisperService.reloadModel();
}

/**
 * Check if Whisper is initialized and ready to use
 *
 * @returns true if Whisper is ready, false otherwise
 *
 * @example
 * ```typescript
 * if (isWhisperReady()) {
 *   await transcribeAudio(audioUri);
 * }
 * ```
 */
export function isWhisperReady(): boolean {
  return whisperService.isReady();
}

/**
 * Clean up resources
 * Should be called when the app is shutting down
 *
 * @returns Promise that resolves when cleanup is complete
 *
 * @example
 * ```typescript
 * await cleanup();
 * ```
 */
export async function cleanup(): Promise<void> {
  return whisperService.cleanup();
}

export default whisperService;
