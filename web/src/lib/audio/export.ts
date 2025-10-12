/**
 * Audio Export Utilities
 * Export audio files for download
 */

/**
 * Download audio as file
 * Note: The audio is already in a playable format (typically webm or mp4)
 * We're calling it "MP3" for user familiarity, but it may be a different format
 */
export async function downloadAudio(
  audioBlob: Blob,
  title: string,
  author?: string
): Promise<void> {
  // Create a filename
  const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const sanitizedAuthor = author ? author.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
  const filename = sanitizedAuthor
    ? `${sanitizedAuthor}-${sanitizedTitle}.webm`
    : `${sanitizedTitle}.webm`;

  // Create download link
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Get audio file size in human-readable format
 */
export function getAudioFileSize(audioBlob: Blob): string {
  const bytes = audioBlob.size;

  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Estimate audio duration from blob size (rough estimate)
 * Actual duration should be stored in ContentItem
 */
export function estimateAudioDuration(audioBlob: Blob): number {
  // Rough estimate: ~1MB per minute for speech at reasonable quality
  const mb = audioBlob.size / (1024 * 1024);
  return Math.round(mb * 60); // seconds
}
