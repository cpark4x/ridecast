-- Migration: Create compressed_content table
-- Description: Stores compressed versions of content with metadata and quality metrics

CREATE TABLE IF NOT EXISTS compressed_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Compression settings
  compression_ratio DECIMAL(3,2) NOT NULL CHECK (compression_ratio > 0 AND compression_ratio <= 1),

  -- Content
  compressed_text TEXT NOT NULL,

  -- Metadata
  original_word_count INTEGER NOT NULL,
  compressed_word_count INTEGER NOT NULL,

  -- Quality metrics
  processing_time_ms INTEGER,
  quality_score DECIMAL(3,2),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 0,

  -- Indexes for fast lookups
  CONSTRAINT unique_content_ratio UNIQUE (parent_content_id, compression_ratio)
);

-- Index for finding all compressed versions of a content item
CREATE INDEX idx_compressed_content_parent ON compressed_content(parent_content_id);

-- Index for finding all compressed content by user
CREATE INDEX idx_compressed_content_user ON compressed_content(user_id);

-- Index for sorting by access patterns
CREATE INDEX idx_compressed_content_accessed ON compressed_content(accessed_at DESC);

COMMENT ON TABLE compressed_content IS 'Stores compressed versions of content items';
COMMENT ON COLUMN compressed_content.compression_ratio IS 'Target compression ratio (e.g., 0.5 for 50% compression)';
COMMENT ON COLUMN compressed_content.quality_score IS 'Quality assessment score from 0-1';
COMMENT ON COLUMN compressed_content.access_count IS 'Number of times this compressed version has been accessed';
