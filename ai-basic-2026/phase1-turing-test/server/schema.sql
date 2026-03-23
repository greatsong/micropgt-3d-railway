-- 튜링 테스트 앱 DB 스키마 (설계서 Section 9)

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  teacher_code TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',   -- waiting / active / ended
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  name TEXT NOT NULL,
  members TEXT NOT NULL,           -- JSON 배열: ["김○○","이○○"]
  color TEXT NOT NULL,
  total_score INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  team_id INTEGER REFERENCES teams(id),
  student_number TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'judge'        -- 'judge' 또는 'respondent'
);

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  round_number INTEGER NOT NULL,
  style_name TEXT NOT NULL,        -- 급식체, 고양이체, 뉴스체, 아기체, 존댓말체, 장난체
  ai_model TEXT NOT NULL DEFAULT 'claude',  -- claude / gpt / gemini / solar
  point_value INTEGER NOT NULL DEFAULT 1,
  total_turns INTEGER NOT NULL,
  chat_time INTEGER NOT NULL,      -- 초 단위
  response_delay INTEGER NOT NULL, -- 초 단위
  vote_time INTEGER NOT NULL,      -- 초 단위
  status TEXT DEFAULT 'pending'    -- pending / chatting / voting / revealed / done
);

CREATE TABLE IF NOT EXISTS pairings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  team_a_id INTEGER NOT NULL REFERENCES teams(id),
  team_b_id INTEGER NOT NULL REFERENCES teams(id),
  observer_team_id INTEGER REFERENCES teams(id)
  -- A의 사람 턴 → B가 응답, B의 사람 턴 → A가 응답
);

CREATE TABLE IF NOT EXISTS turns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id INTEGER NOT NULL REFERENCES rounds(id),
  team_id INTEGER NOT NULL REFERENCES teams(id),  -- 심판 팀
  turn_number INTEGER NOT NULL,
  respondent_type TEXT NOT NULL,   -- 'human' 또는 'ai'
  respondent_team_id INTEGER REFERENCES teams(id), -- human이면 파트너팀
  question_text TEXT,
  original_answer TEXT,            -- 사람 원본 답변
  styled_answer TEXT,              -- 말투 변환된 답변
  verdict TEXT,                    -- 팀의 투표: 'human' 또는 'ai'
  is_correct BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
