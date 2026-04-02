export interface VoiceConfig {
  voice: string;
  instructions: string;
}

export interface TTSProvider {
  readonly providerId: string;
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}