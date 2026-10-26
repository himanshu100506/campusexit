USE campusexit;

INSERT INTO hostel (name) VALUES ('Boys Hostel 1'), ('Boys Hostel 2'), ('Girls Hostel 1');

INSERT INTO room (hostel_id, room_no)
SELECT h.hostel_id, n.room_no
  FROM hostel h
  CROSS JOIN (SELECT '101' AS room_no UNION SELECT '102' UNION SELECT '103'
              UNION SELECT '201' UNION SELECT '202' UNION SELECT '203') n;

INSERT INTO course (name) VALUES
  ('B.E. Computer Science and Engineering'), ('B.E. Electronics and Communication'),
  ('B.E. Mechanical Engineering'), ('BCA'), ('B.Sc.'), ('BBA'), ('MBA'), ('M.Tech');

INSERT INTO reason_category (name) VALUES
  ('Going home'), ('Medical'), ('Personal work'), ('Family function'), ('Other');

-- Dev staff accounts. Change these emails to real ones before demo day.
INSERT INTO warden (name, email, hostel_id)
SELECT 'Warden (Boys 1)', 'warden1@chitkara.edu.in', hostel_id FROM hostel WHERE name = 'Boys Hostel 1';
INSERT INTO gate_staff (name, email) VALUES ('Main Gate Guard', 'gate@chitkara.edu.in');
