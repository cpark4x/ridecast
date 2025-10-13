/**
 * Live Speech Playback using Web Speech API
 * Speaks text directly without recording
 */

export class LiveSpeechPlayer {
  private utterance: SpeechSynthesisUtterance | null = null;
  private text: string = '';
  private voice: string = '';
  private speed: number = 1.0;
  private pitch: number = 0;
  private onEndCallback?: () => void;
  private onTimeUpdateCallback?: (currentTime: number, duration: number) => void;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isPaused: boolean = false;

  async speak(
    text: string,
    voice: string,
    speed: number = 1.0,
    pitch: number = 0,
    onEnd?: () => void,
    onTimeUpdate?: (currentTime: number, duration: number) => void
  ): Promise<void> {
    // Stop any existing speech
    this.stop();

    this.text = text;
    this.voice = voice;
    this.speed = speed;
    this.pitch = pitch;
    this.onEndCallback = onEnd;
    this.onTimeUpdateCallback = onTimeUpdate;

    // Wait for voices to load
    await this.waitForVoices();

    // Create utterance
    this.utterance = new SpeechSynthesisUtterance(text);

    // Find and set voice
    const voices = speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.name === voice || v.voiceURI === voice);
    if (selectedVoice) {
      this.utterance.voice = selectedVoice;
    }

    this.utterance.rate = speed;
    this.utterance.pitch = 1 + (pitch / 100);

    // Set up callbacks
    this.utterance.onstart = () => {
      this.startTime = Date.now();
      this.startTimeTracking();
    };

    this.utterance.onend = () => {
      this.stopTimeTracking();
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    this.utterance.onerror = (event) => {
      console.error('Speech error:', event);
      this.stopTimeTracking();
    };

    // Start speaking
    this.isPaused = false;
    speechSynthesis.speak(this.utterance);
  }

  pause(): void {
    if (speechSynthesis.speaking && !this.isPaused) {
      speechSynthesis.pause();
      this.pausedTime = Date.now() - this.startTime;
      this.isPaused = true;
      this.stopTimeTracking();
    }
  }

  resume(): void {
    if (speechSynthesis.paused && this.isPaused) {
      speechSynthesis.resume();
      this.startTime = Date.now() - this.pausedTime;
      this.isPaused = false;
      this.startTimeTracking();
    }
  }

  stop(): void {
    this.stopTimeTracking();
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    this.utterance = null;
  }

  isPlaying(): boolean {
    return speechSynthesis.speaking && !speechSynthesis.paused;
  }

  getDuration(): number {
    // Estimate duration based on word count and speed
    const wordCount = this.text.split(/\s+/).length;
    const wordsPerMinute = 150 * this.speed;
    return (wordCount / wordsPerMinute) * 60;
  }

  private timeTrackingInterval: NodeJS.Timeout | null = null;

  private startTimeTracking(): void {
    this.stopTimeTracking();

    const duration = this.getDuration();
    this.timeTrackingInterval = setInterval(() => {
      if (this.onTimeUpdateCallback) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        this.onTimeUpdateCallback(elapsed, duration);
      }
    }, 100);
  }

  private stopTimeTracking(): void {
    if (this.timeTrackingInterval) {
      clearInterval(this.timeTrackingInterval);
      this.timeTrackingInterval = null;
    }
  }

  private async waitForVoices(): Promise<void> {
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve();
        return;
      }

      speechSynthesis.onvoiceschanged = () => {
        resolve();
      };

      setTimeout(resolve, 1000);
    });
  }
}
