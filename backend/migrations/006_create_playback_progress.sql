-- Create playback_progress table
CREATE TABLE IF NOT EXISTS playback_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  position_seconds INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playback_progress_user_id ON playback_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_content_id ON playback_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_playback_progress_updated_at ON playback_progress(updated_at);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_playback_progress_updated_at
  BEFORE UPDATE ON playback_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
