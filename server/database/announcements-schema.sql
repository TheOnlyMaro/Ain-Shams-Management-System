-- ============================================================================
-- ENHANCED ANNOUNCEMENTS & COMMUNICATION SYSTEM
-- ============================================================================

-- Extended announcements table with audience targeting
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'academic', 'event', 'deadline', 'emergency', 'parent', 'student')),
  
  -- Audience targeting
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'parents', 'staff', 'admins')),
  specific_courses TEXT[], -- Array of course IDs for course-specific announcements
  specific_users INTEGER[], -- Array of user IDs for targeted announcements
  
  -- Event information (if applicable)
  event_date TIMESTAMP,
  event_location VARCHAR(255),
  event_end_date TIMESTAMP,
  
  -- Scheduling
  publish_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Engagement tracking
  views_count INTEGER NOT NULL DEFAULT 0,
  
  -- Attachments
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  tags VARCHAR(50)[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Messages table for parent-teacher and student-staff communication
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Thread support
  parent_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  thread_id INTEGER, -- Root message ID for grouping conversations
  
  -- Message content
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Message metadata
  message_type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'inquiry', 'meeting_request', 'feedback')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status tracking
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Related entities (optional)
  related_course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  related_student_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- For parent-teacher messages about specific student
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Announcement views tracking
CREATE TABLE IF NOT EXISTS announcement_views (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(announcement_id, user_id)
);

-- Events calendar (extends announcements)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('academic', 'social', 'sports', 'cultural', 'meeting', 'deadline', 'holiday', 'other')),
  
  -- Timing
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Location
  location VARCHAR(255),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  meeting_link VARCHAR(500),
  
  -- Audience
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all',
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- RSVP
  requires_rsvp BOOLEAN NOT NULL DEFAULT FALSE,
  max_attendees INTEGER,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  response_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Parent-Student relationships
CREATE TABLE IF NOT EXISTS parent_student_links (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL DEFAULT 'parent' CHECK (relationship IN ('parent', 'guardian', 'other')),
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_grades BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_attendance BOOLEAN NOT NULL DEFAULT TRUE,
  can_communicate_teachers BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_announcements_author ON announcements(author_id);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX idx_announcements_publish_date ON announcements(publish_date);
CREATE INDEX idx_announcements_is_published ON announcements(is_published);
CREATE INDEX idx_announcements_is_pinned ON announcements(is_pinned);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);

CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_target_audience ON events(target_audience);

CREATE INDEX idx_parent_student_links_parent ON parent_student_links(parent_id);
CREATE INDEX idx_parent_student_links_student ON parent_student_links(student_id);

-- View for announcement statistics
CREATE OR REPLACE VIEW vw_announcement_stats AS
SELECT 
  a.id,
  a.title,
  a.author_name,
  a.priority,
  a.category,
  a.target_audience,
  a.publish_date,
  a.views_count,
  COUNT(DISTINCT av.user_id) as unique_views,
  a.created_at
FROM announcements a
LEFT JOIN announcement_views av ON a.id = av.announcement_id
GROUP BY a.id;

-- View for message threads
CREATE OR REPLACE VIEW vw_message_threads AS
SELECT 
  m.thread_id,
  m.id as message_id,
  m.subject,
  m.sender_id,
  sender.name as sender_name,
  sender.role_id as sender_role_id,
  m.recipient_id,
  recipient.name as recipient_name,
  recipient.role_id as recipient_role_id,
  m.created_at,
  m.is_read,
  COUNT(*) OVER (PARTITION BY m.thread_id) as message_count
FROM messages m
JOIN users sender ON m.sender_id = sender.id
JOIN users recipient ON m.recipient_id = recipient.id
WHERE m.parent_message_id IS NULL;

-- Function to auto-set thread_id
CREATE OR REPLACE FUNCTION set_message_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NULL THEN
    NEW.thread_id := NEW.id;
  ELSE
    SELECT thread_id INTO NEW.thread_id
    FROM messages
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_message_thread_id
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION set_message_thread_id();

-- Function to increment announcement views
CREATE OR REPLACE FUNCTION increment_announcement_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE announcements
  SET views_count = views_count + 1
  WHERE id = NEW.announcement_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_announcement_views
AFTER INSERT ON announcement_views
FOR EACH ROW
EXECUTE FUNCTION increment_announcement_views();