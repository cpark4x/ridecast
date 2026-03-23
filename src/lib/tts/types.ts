export interface VoiceConfig {
  voice: string;
  instructions: string;
}

export interface TTSProvider {
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}