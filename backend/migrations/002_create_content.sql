-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  type VARCHAR(50) NOT NULL, -- 'book', 'article', 'pdf', 'epub', 'txt', 'other'
  text_content TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL, -- SHA-256 for deduplication
  source_file_url VARCHAR(1000),
  cover_image_url VARCHAR(1000),
  file_size_bytes BIGINT,
  word_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_user_id ON content(user_id);
CREATE INDEX IF NOT EXISTS idx_content_text_hash ON content(text_hash);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
