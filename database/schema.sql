-- CampusExit: Student Outing & Gate Management Database System
-- Target: MySQL 8.x   |   Run: mysql -u root -p < schema.sql
-- All tables are in 3NF: hostel/room/course/reason are lookups, a student's hostel is derived via room.

DROP DATABASE IF EXISTS campusexit;
CREATE DATABASE campusexit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusexit;

-- ---------------------------------------------------------------- lookups
CREATE TABLE hostel (
  hostel_id INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE room (
  room_id   INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NOT NULL,
  room_no   VARCHAR(10) NOT NULL,
  UNIQUE KEY uq_room (hostel_id, room_no),
  CONSTRAINT fk_room_hostel FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id)
);

CREATE TABLE course (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE reason_category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(40) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------- people
CREATE TABLE student (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(120) NOT NULL UNIQUE,
  name       VARCHAR(100) NOT NULL,
  roll_no    VARCHAR(20)  UNIQUE,
  mobile     CHAR(10),
  course_id  INT,
  semester   TINYINT,
  room_id    INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_semester CHECK (semester IS NULL OR semester BETWEEN 1 AND 12),
  CONSTRAINT fk_student_course FOREIGN KEY (course_id) REFERENCES course(course_id),
  CONSTRAINT fk_student_room   FOREIGN KEY (room_id)   REFERENCES room(room_id)
);

CREATE TABLE warden (
  warden_id INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  email     VARCHAR(120) NOT NULL UNIQUE,
  hostel_id INT NOT NULL,
  CONSTRAINT fk_warden_hostel FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id)
);

CREATE TABLE gate_staff (
  staff_id INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  email    VARCHAR(120) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------- gate pass
CREATE TABLE gate_pass (
  pass_id       INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  category_id   INT NOT NULL,
  reason_detail VARCHAR(255),
  out_date      DATE NOT NULL,
  in_date       DATE NOT NULL,
  status        ENUM('PENDING','APPROVED','REJECTED','OUT','RETURNED','CANCELLED')
                NOT NULL DEFAULT 'PENDING',
  applied_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by   INT,
  reviewed_at   TIMESTAMP NULL,
  remarks       VARCHAR(255),
  CONSTRAINT chk_dates CHECK (in_date >= out_date),
  CONSTRAINT fk_pass_student  FOREIGN KEY (student_id)  REFERENCES student(student_id),
  CONSTRAINT fk_pass_category FOREIGN KEY (category_id) REFERENCES reason_category(category_id),
  CONSTRAINT fk_pass_warden   FOREIGN KEY (reviewed_by) REFERENCES warden(warden_id),
  INDEX idx_pass_student (student_id, status)
);

-- actual gate movement, kept apart from the request (one log row per pass)
CREATE TABLE gate_log (
  log_id        INT AUTO_INCREMENT PRIMARY KEY,
  pass_id       INT NOT NULL UNIQUE,
  out_time      DATETIME,
  in_time       DATETIME,
  out_marked_by INT,
  in_marked_by  INT,
  CONSTRAINT fk_log_pass FOREIGN KEY (pass_id)       REFERENCES gate_pass(pass_id),
  CONSTRAINT fk_log_out  FOREIGN KEY (out_marked_by) REFERENCES gate_staff(staff_id),
  CONSTRAINT fk_log_in   FOREIGN KEY (in_marked_by)  REFERENCES gate_staff(staff_id)
);

CREATE TABLE violation (
  violation_id INT AUTO_INCREMENT PRIMARY KEY,
  pass_id      INT NOT NULL,
  type         ENUM('LATE_RETURN') NOT NULL,
  details      VARCHAR(255),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_violation_pass FOREIGN KEY (pass_id) REFERENCES gate_pass(pass_id)
);

-- ---------------------------------------------------------------- triggers
DELIMITER //

-- A student can hold only one live pass, must have a room, and cannot apply for the past.
CREATE TRIGGER trg_pass_before_insert BEFORE INSERT ON gate_pass
FOR EACH ROW
BEGIN
  IF (SELECT room_id FROM student WHERE student_id = NEW.student_id) IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Complete your profile (hostel and room) before applying.';
  END IF;
  IF NEW.out_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Out date cannot be in the past.';
  END IF;
  IF EXISTS (SELECT 1 FROM gate_pass
             WHERE student_id = NEW.student_id
               AND status IN ('PENDING','APPROVED','OUT')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You already have an active gate pass.';
  END IF;
END//

-- Returning after the approved in_date records a LATE_RETURN violation automatically.
CREATE TRIGGER trg_log_after_update AFTER UPDATE ON gate_log
FOR EACH ROW
BEGIN
  DECLARE v_in_date DATE;
  IF OLD.in_time IS NULL AND NEW.in_time IS NOT NULL THEN
    SELECT in_date INTO v_in_date FROM gate_pass WHERE pass_id = NEW.pass_id;
    IF DATE(NEW.in_time) > v_in_date THEN
      INSERT INTO violation (pass_id, type, details)
      VALUES (NEW.pass_id, 'LATE_RETURN',
              CONCAT('Due ', v_in_date, ', returned ', DATE(NEW.in_time)));
    END IF;
  END IF;
END//

-- ---------------------------------------------------------------- procedures (each is one transaction)
CREATE PROCEDURE sp_review_pass(
  IN p_pass_id INT, IN p_warden_id INT, IN p_decision VARCHAR(10), IN p_remarks VARCHAR(255))
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE v_pass_hostel INT;
  DECLARE v_warden_hostel INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_decision NOT IN ('APPROVED','REJECTED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decision must be APPROVED or REJECTED.';
  END IF;

  START TRANSACTION;
  SELECT gp.status, r.hostel_id INTO v_status, v_pass_hostel
    FROM gate_pass gp
    JOIN student s ON s.student_id = gp.student_id
    JOIN room r    ON r.room_id    = s.room_id
   WHERE gp.pass_id = p_pass_id FOR UPDATE;
  SELECT hostel_id INTO v_warden_hostel FROM warden WHERE warden_id = p_warden_id;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gate pass not found.';
  ELSEIF v_pass_hostel <> v_warden_hostel THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This pass belongs to another hostel.';
  ELSEIF v_status <> 'PENDING' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only pending passes can be reviewed.';
  END IF;

  UPDATE gate_pass
     SET status = p_decision, reviewed_by = p_warden_id,
         reviewed_at = NOW(), remarks = p_remarks
   WHERE pass_id = p_pass_id;
  COMMIT;
END//

CREATE PROCEDURE sp_mark_out(IN p_pass_id INT, IN p_staff_id INT)
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE v_out DATE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status, out_date INTO v_status, v_out FROM gate_pass WHERE pass_id = p_pass_id FOR UPDATE;
  IF v_status IS NULL OR v_status <> 'APPROVED' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only approved passes can be marked out.';
  END IF;
  IF CURDATE() < v_out THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This pass is not valid until its out date.';
  END IF;
  INSERT INTO gate_log (pass_id, out_time, out_marked_by) VALUES (p_pass_id, NOW(), p_staff_id);
  UPDATE gate_pass SET status = 'OUT' WHERE pass_id = p_pass_id;
  COMMIT;
END//

CREATE PROCEDURE sp_mark_in(IN p_pass_id INT, IN p_staff_id INT)
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT status INTO v_status FROM gate_pass WHERE pass_id = p_pass_id FOR UPDATE;
  IF v_status IS NULL OR v_status <> 'OUT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only students who are out can be marked in.';
  END IF;
  UPDATE gate_log SET in_time = NOW(), in_marked_by = p_staff_id WHERE pass_id = p_pass_id;
  UPDATE gate_pass SET status = 'RETURNED' WHERE pass_id = p_pass_id;
  COMMIT;
END//

DELIMITER ;

-- ---------------------------------------------------------------- views
-- Everything the app lists, in one place (student history, warden queue, gate desk).
CREATE VIEW v_pass_details AS
SELECT gp.pass_id, gp.student_id, s.name AS student_name, s.roll_no, s.mobile,
       h.hostel_id, h.name AS hostel_name, r.room_no,
       rc.name AS category, gp.reason_detail, gp.out_date, gp.in_date,
       gp.status, gp.applied_at, gp.reviewed_at, gp.remarks,
       w.name AS reviewed_by_name, gl.out_time, gl.in_time
  FROM gate_pass gp
  JOIN student s          ON s.student_id = gp.student_id
  JOIN room r             ON r.room_id = s.room_id
  JOIN hostel h           ON h.hostel_id = r.hostel_id
  JOIN reason_category rc ON rc.category_id = gp.category_id
  LEFT JOIN warden w      ON w.warden_id = gp.reviewed_by
  LEFT JOIN gate_log gl   ON gl.pass_id = gp.pass_id;

CREATE VIEW v_students_out AS
SELECT pass_id, student_name, roll_no, mobile, hostel_name, room_no, out_time, in_date AS due_back
  FROM v_pass_details WHERE status = 'OUT';

CREATE VIEW v_pending_requests AS
SELECT pass_id, hostel_id, hostel_name, student_name, roll_no, room_no,
       category, reason_detail, out_date, in_date, applied_at
  FROM v_pass_details WHERE status = 'PENDING';

CREATE VIEW v_late_report AS
SELECT h.name AS hostel_name, COUNT(v.violation_id) AS late_returns
  FROM hostel h
  LEFT JOIN room r       ON r.hostel_id = h.hostel_id
  LEFT JOIN student s    ON s.room_id = r.room_id
  LEFT JOIN gate_pass gp ON gp.student_id = s.student_id
  LEFT JOIN violation v  ON v.pass_id = gp.pass_id AND v.type = 'LATE_RETURN'
 GROUP BY h.hostel_id, h.name;
