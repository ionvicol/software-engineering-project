-- =====================================================================
-- Game Tips Forum — database schema (Sprint 3)
-- ---------------------------------------------------------------------
-- Drops are ordered to respect foreign keys: child tables first.
-- Run this file via phpMyAdmin import OR let docker-compose mount it
-- to /docker-entrypoint-initdb.d/ which auto-runs on first DB boot.
-- =====================================================================

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- USERS
-- password_hash holds bcrypt output once seed-passwords.js has run.
-- Until then, seed rows carry the sentinel 'NEEDS_HASH:<plain>' which
-- the seeder script replaces with a real $2b$10$... hash on first run.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT,
  reputation_points INT NOT NULL DEFAULT 0,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY unique_username (username),
  UNIQUE KEY unique_email (email)
);

CREATE TABLE categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  PRIMARY KEY (category_id),
  UNIQUE KEY unique_category_name (name)
);

CREATE TABLE tags (
  tag_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  PRIMARY KEY (tag_id),
  UNIQUE KEY unique_tag_name (name)
);

CREATE TABLE posts (
  post_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  game_title VARCHAR(100) NULL,
  media_url VARCHAR(500) NULL,
  is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (post_id),
  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_category
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- COMMENTS — threaded replies on a post
-- ---------------------------------------------------------------------
CREATE TABLE comments (
  comment_id INT NOT NULL AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id),
  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- VOTES — one row per (user, post). value is +1 (upvote) or -1 (downvote).
-- The composite PK (user_id, post_id) enforces "one vote per user per post".
-- The CHECK keeps the value to legal vote magnitudes only.
-- ---------------------------------------------------------------------
CREATE TABLE votes (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  value TINYINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  CONSTRAINT chk_vote_value CHECK (value IN (-1, 1)),
  CONSTRAINT fk_votes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- REPORTS — moderation queue for inappropriate posts
-- ---------------------------------------------------------------------
CREATE TABLE reports (
  report_id INT NOT NULL AUTO_INCREMENT,
  post_id INT NOT NULL,
  reporter_user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  CONSTRAINT fk_reports_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user
    FOREIGN KEY (reporter_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- MESSAGES — direct user-to-user messaging.
-- One row per message. For an inbox view we GROUP BY the other party
-- (whichever of sender/recipient is NOT the current user).
-- ---------------------------------------------------------------------
CREATE TABLE messages (
  message_id INT NOT NULL AUTO_INCREMENT,
  sender_user_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  CONSTRAINT fk_messages_sender
    FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT chk_no_self_message CHECK (sender_user_id <> recipient_user_id),
  INDEX idx_messages_recipient_read (recipient_user_id, is_read),
  INDEX idx_messages_pair (sender_user_id, recipient_user_id, created_at)
);

-- =====================================================================
-- SEED DATA
-- All seed users share the demo password "password123".
-- The sentinel `NEEDS_HASH:password123` is replaced with a real bcrypt
-- hash by `app/scripts/seed-passwords.js` (see README, step "Seeding").
-- =====================================================================

INSERT INTO users (username, email, password_hash, bio, reputation_points, is_admin) VALUES
('NoobHunter',   'noobhunter@example.com',   'NEEDS_HASH:password123', 'FPS player who shares quick aim and movement tips.',          140, FALSE),
('PuzzleMage',   'puzzlemage@example.com',   'NEEDS_HASH:password123', 'Loves puzzle mechanics, hidden secrets and walkthroughs.',     95, FALSE),
('SpeedyFox',    'speedyfox@example.com',    'NEEDS_HASH:password123', 'Speedrunner focused on route optimisation and shortcuts.',    210, FALSE),
('CoopCrafter',  'coopcrafter@example.com',  'NEEDS_HASH:password123', 'Enjoys co-op games and helping new players.',                 120, FALSE),
('LoreSeeker',   'loreseeker@example.com',   'NEEDS_HASH:password123', 'RPG fan who explains quests and story choices.',              160, FALSE),
('RaidPilot',    'raidpilot@example.com',    'NEEDS_HASH:password123', 'Leads raid groups and explains team mechanics.',              245, TRUE),
('StealthPixel', 'stealthpixel@example.com', 'NEEDS_HASH:password123', 'Stealth game fan with route planning tips.',                  175, FALSE),
('ArenaSpark',   'arenaspark@example.com',   'NEEDS_HASH:password123', 'Competitive player focused on ranked consistency.',           198, FALSE),
('CraftNomad',   'craftnomad@example.com',   'NEEDS_HASH:password123', 'Survival and crafting enthusiast.',                           132, FALSE),
('RetroByte',    'retrobyte@example.com',    'NEEDS_HASH:password123', 'Old-school gamer sharing classic strategies.',                 88, FALSE);

INSERT INTO categories (name, description) VALUES
('Beginner Guides',   'Tips for new players learning the basics.'),
('Boss Fights',       'Strategies for difficult enemies and encounters.'),
('Multiplayer',       'Advice for playing with or against others online.'),
('RPG Quests',        'Quest help, builds and exploration advice.'),
('Esports Strategy',  'Competitive ranked and tournament-oriented advice.'),
('Survival Crafting', 'Resource routes, crafting systems and base defense tips.');

INSERT INTO tags (name) VALUES
('beginner'), ('boss-fight'), ('multiplayer'), ('spoiler-free'),
('build-guide'), ('walkthrough'), ('raid'), ('stealth'),
('ranked'), ('economy'), ('crafting'), ('teamplay');

INSERT INTO posts (user_id, category_id, title, content, game_title, media_url, is_spoiler, created_at, updated_at) VALUES
(1, 1, 'Best aiming settings for new FPS players',
   'Lower your sensitivity slightly, disable motion blur, and practise crosshair placement before entering ranked matches. These three changes usually improve consistency straight away.',
   'Valorant', NULL, FALSE, '2025-03-01 10:00:00', '2025-03-02 12:00:00'),
(2, 4, 'How to solve the crystal door puzzle',
   'Look for the rune order on the walls near the entrance. Match the symbols from left to right and activate the pillars in the same sequence.',
   'Tunic', NULL, FALSE, '2025-03-03 14:15:00', NULL),
(3, 2, 'Fast route to defeat the Iron Warden',
   'Stay close to the boss during phase one, dodge left after the hammer slam, then punish during the recovery window. Save your ultimate for phase two.',
   'Elden Ring',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
   FALSE, '2025-03-05 09:30:00', '2025-03-05 11:00:00'),
(4, 3, 'Three support roles that win co-op matches',
   'A balanced team should include one healer, one crowd-control support and one objective-focused player. This gives stability in longer matches.',
   'Overwatch 2', NULL, FALSE, '2025-03-07 18:20:00', NULL),
(5, 4, 'Early game mage build that scales well',
   'Prioritise mana regeneration first, then add one mobility spell before investing in area damage. This build stays safe while still clearing waves quickly.',
   'Baldur''s Gate 3', NULL, FALSE, '2025-03-08 16:40:00', NULL),
(5, 4, 'Quest path after the hidden temple reveal',
   'After the reveal, return to the northern village and speak to the archivist before entering the canyon. This unlocks the safer route and extra dialogue.',
   'Dragon Age', NULL, TRUE, '2025-03-10 13:10:00', NULL),
(1, 3, 'Simple communication tips for ranked teams',
   'Keep callouts short, only share useful information, and avoid blaming teammates mid-match. Clear communication helps far more than constant talking.',
   'Valorant', NULL, FALSE, '2025-03-11 20:05:00', NULL),
(6, 2, 'Raid opener for the Ember Colossus',
   'Start with defensive cooldowns during the first fire pulse, rotate positions clockwise, and assign one caller for phase transitions to avoid overlap mistakes.',
   'Destiny 2',
   'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800',
   FALSE, '2025-03-12 19:10:00', NULL),
(7, 1, 'Beginner stealth checklist before each mission',
   'Disable unnecessary gadgets, study guard patterns for one minute, then commit to a simple route with two fallback paths. Consistency beats speed early on.',
   'Hitman 3', NULL, FALSE, '2025-03-13 08:45:00', NULL),
(8, 5, 'How to review your ranked losses effectively',
   'After each loss, note one positioning error and one decision error. Focus on fixing only one of them for the next three matches to build stable improvement.',
   'League of Legends', NULL, FALSE, '2025-03-13 21:30:00', '2025-03-14 09:20:00'),
(9, 6, 'Fast iron and fiber route for day one',
   'Collect river reeds first, then rotate to abandoned huts for iron scraps. Craft tier-one tools before night to secure early mobility and defense.',
   'Valheim', NULL, FALSE, '2025-03-14 17:00:00', NULL),
(10, 3, 'Classic co-op tactic: split and scout safely',
   'Move in pairs, keep one player on utility, and regroup every two objectives. This old tactic still wins in modern objective-based modes.',
   'Left 4 Dead 2', NULL, FALSE, '2025-03-15 12:25:00', NULL),
(6, 2, 'Avoiding wipe mechanics in phase three',
   'When the arena glows red, stop damage and prioritize movement markers. Surviving the mechanic is worth more than squeezing extra damage.',
   'Destiny 2', NULL, TRUE, '2025-03-16 20:40:00', NULL),
(8, 5, 'Economy management in overtime rounds',
   'Buy only core utility before overtime and keep one flexible slot for counter-tools. Stable economy choices prevent panic buys in deciding rounds.',
   'CS2', NULL, FALSE, '2025-03-17 18:05:00', NULL),
(9, 6, 'Base layout that defends against early raids',
   'Place storage near inner walls, funnel entries with traps, and keep a hidden backup stash. Compact layouts reduce chaos during first-week attacks.',
   'Rust', NULL, FALSE, '2025-03-18 15:50:00', NULL);

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 4),
(2, 6), (2, 4),
(3, 2), (3, 4),
(4, 3),
(5, 5), (5, 1),
(6, 6),
(7, 3), (7, 1),
(8, 7), (8, 12),
(9, 1), (9, 8),
(10, 9), (10, 10),
(11, 11), (11, 5),
(12, 3), (12, 12),
(13, 7), (13, 2),
(14, 9), (14, 10),
(15, 11), (15, 6);

-- A few seed comments and votes so the UI is not empty on first load.
INSERT INTO comments (post_id, user_id, content, created_at) VALUES
(1, 3, 'Tried these settings, my aim feels much steadier in ranked now. Thanks!',         '2025-03-02 09:10:00'),
(1, 4, 'Disabling motion blur was the biggest change for me too.',                        '2025-03-02 12:30:00'),
(3, 1, 'Phase two timing is the part that always catches me out — good shout on the ult.', '2025-03-06 08:05:00'),
(8, 9, 'The clockwise rotation tip saved our raid run last weekend.',                     '2025-03-13 10:00:00'),
(11, 7, 'Confirming the river reeds route works on the new map seed too.',                '2025-03-15 09:45:00');

INSERT INTO votes (user_id, post_id, value) VALUES
(3, 1, 1), (4, 1, 1), (5, 1, 1),
(1, 3, 1), (4, 3, 1),
(2, 5, 1),
(7, 8, 1), (9, 8, 1), (10, 8, 1),
(6, 11, 1),
(8, 13, -1);

-- Sample DMs so the inbox is populated for the first user who logs in.
INSERT INTO messages (sender_user_id, recipient_user_id, content, is_read, created_at) VALUES
(3, 1, 'Hey, your aim settings post helped a lot — what mouse DPI are you running these days?', FALSE, '2025-03-04 11:20:00'),
(1, 3, 'Cheers! Running 800 DPI in-game with 0.4 sens. Sweet spot for me.', TRUE,  '2025-03-04 12:05:00'),
(3, 1, 'Same, that lines up. Want to duo queue tonight?',                                       FALSE, '2025-03-04 12:18:00'),
(6, 8, 'Loved your ranked review framework — using it for our scrim VODs now.',                FALSE, '2025-03-15 09:00:00'),
(8, 6, 'Glad it helps! Let me know if you want me to look at one of your replays.',           TRUE,  '2025-03-15 10:12:00');
