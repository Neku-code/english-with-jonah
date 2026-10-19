-- Preserve automatic answer results. Teacher assessments are an append-only overlay.
CREATE VIEW effective_answers AS
SELECT a.*, r.id AS review_id, r.revision AS review_revision, r.feedback,
 r.created_at AS reviewed_at,
 CASE WHEN r.awarded_points IS NOT NULL THEN r.awarded_points ELSE a.earned_points END AS effective_points,
 CASE WHEN r.awarded_points IS NOT NULL THEN 'graded' ELSE a.review_status END AS effective_status
FROM answers a LEFT JOIN LATERAL (
 SELECT * FROM teacher_reviews r WHERE r.attempt_id = a.attempt_id AND r.question_id = a.question_id
 ORDER BY r.revision DESC LIMIT 1
) r ON true;
--> statement-breakpoint
CREATE FUNCTION protect_teacher_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE maximum integer; state text; mode text; latest integer;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Teacher review history is immutable'; END IF;
 SELECT status INTO state FROM lesson_attempts WHERE id = NEW.attempt_id FOR UPDATE;
 IF state <> 'submitted' THEN RAISE EXCEPTION 'Review requires a submitted attempt'; END IF;
 IF NOT EXISTS (SELECT 1 FROM teacher_sessions WHERE id = NEW.teacher_session_id AND revoked_at IS NULL AND expires_at > now()) THEN
  RAISE EXCEPTION 'Active teacher session required';
 END IF;
 SELECT q.max_points, q.grading->>'mode' INTO maximum, mode FROM questions q JOIN answers a ON a.question_id = q.id
 WHERE a.attempt_id = NEW.attempt_id AND a.question_id = NEW.question_id;
 IF mode IS DISTINCT FROM 'manual' THEN RAISE EXCEPTION 'Only manual responses can be reviewed'; END IF;
 IF NEW.awarded_points > maximum THEN RAISE EXCEPTION 'Review exceeds maximum points'; END IF;
 SELECT COALESCE(max(revision),0) INTO latest FROM teacher_reviews WHERE attempt_id = NEW.attempt_id AND question_id = NEW.question_id;
 IF NEW.revision <> latest + 1 THEN RAISE EXCEPTION 'Review revision conflict'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER protect_teacher_review_record BEFORE INSERT OR UPDATE OR DELETE ON teacher_reviews FOR EACH ROW EXECUTE FUNCTION protect_teacher_review();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE earned bigint; maximum bigint; pending boolean;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF OLD.status = 'submitted' THEN
   IF (to_jsonb(NEW) - ARRAY['earned_points','max_points','pending_review']) IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['earned_points','max_points','pending_review']) THEN
    RAISE EXCEPTION 'Submitted attempt identity, response dates and status are immutable';
   END IF;
   SELECT COALESCE(sum(e.effective_points),0), sum(q.max_points), bool_or(e.effective_status = 'pending')
    INTO earned, maximum, pending FROM effective_answers e JOIN questions q ON q.id = e.question_id WHERE e.attempt_id = OLD.id;
   IF NEW.earned_points IS DISTINCT FROM earned OR NEW.max_points IS DISTINCT FROM maximum OR NEW.pending_review IS DISTINCT FROM pending THEN
    RAISE EXCEPTION 'Attempt totals must match effective answer grades';
   END IF;
  END IF;
  IF NEW.student_id <> OLD.student_id OR NEW.lesson_id <> OLD.lesson_id OR NEW.version_id <> OLD.version_id THEN
   RAISE EXCEPTION 'Attempt ownership and revision are immutable';
  END IF;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM lesson_versions WHERE id = NEW.version_id AND published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'Attempts require a published revision';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE INDEX student_status_name_idx ON students(status, lookup_name, id);
--> statement-breakpoint
CREATE INDEX submitted_version_student_idx ON lesson_attempts(version_id, student_id, submitted_at, id) WHERE status = 'submitted';
--> statement-breakpoint
CREATE INDEX pending_answers_idx ON answers(attempt_id, question_id) WHERE review_status = 'pending';
