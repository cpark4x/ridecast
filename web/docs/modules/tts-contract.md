# Contract: Text-to-Speech Conversion Module

**Version**: 1.0.0
**Module**: `lib/tts`
**Owner**: Ridecast Core Team
**Related User Story**: [US 1.1.1 - Convert Book to Audio](../../2-product/userstories/epic-1-audio-creation/feature-1.1/us-1.1.1-convert-book-to-audio.md)

---

## Purpose

Converts text content (books, articles, PDFs) into high-quality audio files using Azure Neural TTS or mock TTS service for development.

## Public Interface

### Types

```typescript
interface TTSConfig {
  voice: string;           // Voice ID (e.g., "en-US-JennyNeural")
  speed: number;           // 0.5 to 2.0
  pitch: number;           // -50 to 50 Hz
  outputFormat: 'mp3' | 'wav';
}

interface ConversionJob {
  id: string;
  contentId: string;
  text: string;
  config: TTSConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;        // 0 to 100
  audioUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface TTSChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  duration?: number;       // estimated duration in seconds
}
```

### Core Functions

```typescript
// Convert text to audio
async function convertTextToAudio(
  text: string,
  config: TTSConfig,
  onProgress?: (progress: number) => void
): Promise<{ audioUrl: string; duration: number }>;

// Extract text from various formats
async function extractText(file: File): Promise<string>;

// Split text into optimal TTS chunks (respecting sentence boundaries)
function chunkText(text: string, maxChunkSize?: number): TTSChunk[];

// Get available voices
function getAvailableVoices(): Promise<Voice[]>;

// Estimate audio duration from text
function estimateDuration(text: string, speed: number): number;
```

## Conformance Criteria

1. **Text Extraction**: Must extract text from .txt, .epub, .pdf files with >95% accuracy
2. **Chunking Logic**: Chunks must respect sentence boundaries; no chunk >5000 characters
3. **Mock TTS**: Development mode must work offline without API calls
4. **Progress Tracking**: Progress callbacks must fire at least every 10% completion
5. **Error Handling**: Network failures must be caught; provide retry mechanism
6. **Audio Quality**: Generated audio must be stereo, 44.1kHz sample rate
7. **Voice Selection**: Must support at least 5 neural voices in mock mode

## Dependencies

- **Azure Cognitive Services SDK** (production)
- **epub.js** for EPUB parsing
- **pdf.js** for PDF text extraction
- **Web Audio API** for audio processing

## Constraints

- Must work in browser environment (no Node.js-only APIs)
- Offline-first: mock TTS must not require network
- Maximum file size: 50MB for input documents
- Maximum audio output: 10 hours per conversion

## Security

- Validate file types before processing (prevent XXE attacks)
- Sanitize extracted text (remove potential script injection)
- No storage of Azure API keys in client code (use environment variables)
- Rate limiting: max 10 concurrent TTS requests

## Performance

- Text extraction: <5 seconds for 100-page document
- TTS conversion: Real-time factor of 0.5x (30-minute book = 15 minutes processing)
- Memory usage: <200MB for typical book conversion

## Testing Requirements

- Unit tests for chunking logic (boundary cases)
- Integration tests with mock TTS service
- E2E test: full book conversion workflow
- Error scenarios: malformed PDFs, network failures
- Performance test: 300-page book conversion time

---

## Non-Goals

- Real-time streaming TTS (batch only for MVP)
- Voice cloning or custom voice training
- Multi-language support in v1.0 (English only)
- Server-side rendering (client-side only)
