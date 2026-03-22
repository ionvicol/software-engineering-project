DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT,
  reputation_points INT NOT NULL DEFAULT 0,
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (post_id),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT
);

CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

INSERT INTO users (username, email, password_hash, bio, reputation_points) VALUES
('NoobHunter', 'noobhunter@example.com', 'hash1', 'FPS player who shares quick aim and movement tips.', 140),
('PuzzleMage', 'puzzlemage@example.com', 'hash2', 'Loves puzzle mechanics, hidden secrets and walkthroughs.', 95),
('SpeedyFox', 'speedyfox@example.com', 'hash3', 'Speedrunner focused on route optimisation and shortcuts.', 210),
('CoopCrafter', 'coopcrafter@example.com', 'hash4', 'Enjoys co-op games and helping new players.', 120),
('LoreSeeker', 'loreseeker@example.com', 'hash5', 'RPG fan who explains quests and story choices.', 160);

INSERT INTO categories (name, description) VALUES
('Beginner Guides', 'Tips for new players learning the basics.'),
('Boss Fights', 'Strategies for difficult enemies and encounters.'),
('Multiplayer', 'Advice for playing with or against others online.'),
('RPG Quests', 'Quest help, builds and exploration advice.');

INSERT INTO tags (name) VALUES
('beginner'),
('boss-fight'),
('multiplayer'),
('spoiler-free'),
('build-guide'),
('walkthrough');

INSERT INTO posts (user_id, category_id, title, content, created_at, updated_at, is_spoiler) VALUES
(1, 1, 'Best aiming settings for new FPS players', 'Lower your sensitivity slightly, disable motion blur, and practise crosshair placement before entering ranked matches. These three changes usually improve consistency straight away.', '2025-03-01 10:00:00', '2025-03-02 12:00:00', FALSE),
(2, 4, 'How to solve the crystal door puzzle', 'Look for the rune order on the walls near the entrance. Match the symbols from left to right and activate the pillars in the same sequence.', '2025-03-03 14:15:00', NULL, FALSE),
(3, 2, 'Fast route to defeat the Iron Warden', 'Stay close to the boss during phase one, dodge left after the hammer slam, then punish during the recovery window. Save your ultimate for phase two.', '2025-03-05 09:30:00', '2025-03-05 11:00:00', FALSE),
(4, 3, 'Three support roles that win co-op matches', 'A balanced team should include one healer, one crowd-control support and one objective-focused player. This gives stability in longer matches.', '2025-03-07 18:20:00', NULL, FALSE),
(5, 4, 'Early game mage build that scales well', 'Prioritise mana regeneration first, then add one mobility spell before investing in area damage. This build stays safe while still clearing waves quickly.', '2025-03-08 16:40:00', NULL, FALSE),
(5, 4, 'Quest path after the hidden temple reveal', 'After the reveal, return to the northern village and speak to the archivist before entering the canyon. This unlocks the safer route and extra dialogue.', '2025-03-10 13:10:00', NULL, TRUE),
(1, 3, 'Simple communication tips for ranked teams', 'Keep callouts short, only share useful information, and avoid blaming teammates mid-match. Clear communication helps far more than constant talking.', '2025-03-11 20:05:00', NULL, FALSE);

INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 4),
(2, 6), (2, 4),
(3, 2), (3, 4),
(4, 3),
(5, 5), (5, 1),
(6, 6),
(7, 3), (7, 1);

INSERT INTO users (username, email, password_hash, bio, reputation_points) VALUES
('RaidPilot', 'raidpilot@example.com', 'hash6', 'Leads raid groups and explains team mechanics.', 245),
('StealthPixel', 'stealthpixel@example.com', 'hash7', 'Stealth game fan with route planning tips.', 175),
('ArenaSpark', 'arenaspark@example.com', 'hash8', 'Competitive player focused on ranked consistency.', 198),
('CraftNomad', 'craftnomad@example.com', 'hash9', 'Survival and crafting enthusiast.', 132),
('RetroByte', 'retrobyte@example.com', 'hash10', 'Old-school gamer sharing classic strategies.', 88);

INSERT INTO categories (name, description) VALUES
('Esports Strategy', 'Competitive ranked and tournament-oriented advice.'),
('Survival Crafting', 'Resource routes, crafting systems and base defense tips.');

INSERT INTO tags (name) VALUES
('raid'),
('stealth'),
('ranked'),
('economy'),
('crafting'),
('teamplay');

INSERT INTO posts (user_id, category_id, title, content, created_at, updated_at, is_spoiler) VALUES
(6, 2, 'Raid opener for the Ember Colossus', 'Start with defensive cooldowns during the first fire pulse, rotate positions clockwise, and assign one caller for phase transitions to avoid overlap mistakes.', '2025-03-12 19:10:00', NULL, FALSE),
(7, 1, 'Beginner stealth checklist before each mission', 'Disable unnecessary gadgets, study guard patterns for one minute, then commit to a simple route with two fallback paths. Consistency beats speed early on.', '2025-03-13 08:45:00', NULL, FALSE),
(8, 5, 'How to review your ranked losses effectively', 'After each loss, note one positioning error and one decision error. Focus on fixing only one of them for the next three matches to build stable improvement.', '2025-03-13 21:30:00', '2025-03-14 09:20:00', FALSE),
(9, 6, 'Fast iron and fiber route for day one', 'Collect river reeds first, then rotate to abandoned huts for iron scraps. Craft tier-one tools before night to secure early mobility and defense.', '2025-03-14 17:00:00', NULL, FALSE),
(10, 3, 'Classic co-op tactic: split and scout safely', 'Move in pairs, keep one player on utility, and regroup every two objectives. This old tactic still wins in modern objective-based modes.', '2025-03-15 12:25:00', NULL, FALSE),
(6, 2, 'Avoiding wipe mechanics in phase three', 'When the arena glows red, stop damage and prioritize movement markers. Surviving the mechanic is worth more than squeezing extra damage.', '2025-03-16 20:40:00', NULL, TRUE),
(8, 5, 'Economy management in overtime rounds', 'Buy only core utility before overtime and keep one flexible slot for counter-tools. Stable economy choices prevent panic buys in deciding rounds.', '2025-03-17 18:05:00', NULL, FALSE),
(9, 6, 'Base layout that defends against early raids', 'Place storage near inner walls, funnel entries with traps, and keep a hidden backup stash. Compact layouts reduce chaos during first-week attacks.', '2025-03-18 15:50:00', NULL, FALSE);

INSERT INTO post_tags (post_id, tag_id) VALUES
(8, 7), (8, 12),
(9, 1), (9, 8),
(10, 9), (10, 10),
(11, 11), (11, 5),
(12, 3), (12, 12),
(13, 7), (13, 2),
(14, 9), (14, 10),
(15, 11), (15, 6);
