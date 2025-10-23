-- Create audio_cache table
CREATE TABLE IF NOT EXISTS audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 of (text + voice + config)
  voice_id VARCHAR(100) NOT NULL,
  audio_url VARCHAR(1000) NOT NULL,
  duration_seconds INT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  access_count INT DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audio_cache_content_hash ON audio_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_audio_cache_voice_id ON audio_cache(voice_id);
CREATE INDEX IF NOT EXISTS idx_audio_cache_last_accessed ON audio_cache(last_accessed_at);
