-- Published revisions are append-only, including questions and vocabulary.
ALTER TABLE lesson_attempts ADD CONSTRAINT submitted_result_present CHECK (status <> 'submitted' OR (earned_points IS NOT NULL AND max_points IS NOT NULL));
--> statement-breakpoint
ALTER TABLE answers ADD CONSTRAINT answer_response_string CHECK (jsonb_typeof(response) = 'string' AND length(response #>> '{}') <= 10000);
--> statement-breakpoint
ALTER TABLE answers ADD CONSTRAINT graded_answer_present CHECK (review_status <> 'graded' OR earned_points IS NOT NULL);
--> statement-breakpoint
CREATE FUNCTION freeze_published_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published revisions are immutable; create a new revision';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.lesson_id <> OLD.lesson_id OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'Revision identity is immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER freeze_revision BEFORE UPDATE OR DELETE ON lesson_versions FOR EACH ROW EXECUTE FUNCTION freeze_published_revision();
--> statement-breakpoint
CREATE FUNCTION freeze_revision_child() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_id uuid; published timestamptz;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT published_at INTO published FROM lesson_versions WHERE id = OLD.version_id FOR UPDATE;
    IF published IS NOT NULL THEN RAISE EXCEPTION 'Published revision children are immutable'; END IF;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT published_at INTO published FROM lesson_versions WHERE id = NEW.version_id FOR UPDATE;
    IF published IS NOT NULL THEN RAISE EXCEPTION 'Published revision children are immutable'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER freeze_question BEFORE INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION freeze_revision_child();
--> statement-breakpoint
CREATE TRIGGER freeze_vocabulary BEFORE INSERT OR UPDATE OR DELETE ON vocabulary_items FOR EACH ROW EXECUTE FUNCTION freeze_revision_child();
--> statement-breakpoint
CREATE FUNCTION freeze_lesson_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.unit_id <> OLD.unit_id OR NEW.kind <> OLD.kind) AND EXISTS (SELECT 1 FROM lesson_versions WHERE lesson_id = OLD.id) THEN
    RAISE EXCEPTION 'A versioned lesson cannot change unit or kind';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER freeze_lesson BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION freeze_lesson_identity();
--> statement-breakpoint
CREATE FUNCTION protect_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'submitted' THEN RAISE EXCEPTION 'Submitted attempts are immutable'; END IF;
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
CREATE TRIGGER protect_attempt_record BEFORE INSERT OR UPDATE ON lesson_attempts FOR EACH ROW EXECUTE FUNCTION protect_attempt();
--> statement-breakpoint
CREATE FUNCTION protect_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE attempt_status text; maximum integer;
BEGIN
  SELECT status INTO attempt_status FROM lesson_attempts WHERE id = COALESCE(NEW.attempt_id, OLD.attempt_id) FOR UPDATE;
  IF attempt_status <> 'in_progress' THEN RAISE EXCEPTION 'Submitted answers are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW.attempt_id <> OLD.attempt_id OR NEW.student_id <> OLD.student_id OR NEW.version_id <> OLD.version_id OR NEW.question_id <> OLD.question_id) THEN
    RAISE EXCEPTION 'Answer ownership and question are immutable';
  END IF;
  SELECT max_points INTO maximum FROM questions WHERE id = NEW.question_id;
  IF NEW.earned_points > maximum THEN RAISE EXCEPTION 'Answer score exceeds maximum'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER protect_answer_record BEFORE INSERT OR UPDATE OR DELETE ON answers FOR EACH ROW EXECUTE FUNCTION protect_answer();
--> statement-breakpoint
CREATE FUNCTION validate_progress() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lesson_attempts WHERE id = NEW.completed_attempt_id AND status = 'submitted' AND pending_review = false) THEN
    RAISE EXCEPTION 'Progress requires a submitted, reviewed attempt';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER validate_progress_record BEFORE INSERT OR UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION validate_progress();
--> statement-breakpoint
CREATE FUNCTION validate_readiness() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vocabulary_results WHERE id = NEW.result_id AND 100::bigint * correct >= 75::bigint * total) THEN
    RAISE EXCEPTION 'Readiness requires a passing vocabulary result';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER validate_readiness_record BEFORE INSERT OR UPDATE ON vocabulary_readiness FOR EACH ROW EXECUTE FUNCTION validate_readiness();
--> statement-breakpoint
CREATE FUNCTION retain_vocabulary_result() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Vocabulary results are immutable; record another result';
END $$;
--> statement-breakpoint
CREATE TRIGGER retain_vocabulary_result_record BEFORE UPDATE OR DELETE ON vocabulary_results FOR EACH ROW EXECUTE FUNCTION retain_vocabulary_result();
