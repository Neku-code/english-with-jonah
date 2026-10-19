-- Response presence supports both plain strings and structured answer parts.
-- This reads existing content/response contracts; it does not grade content.
CREATE FUNCTION has_student_response(response jsonb, grading jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE raw text; parts jsonb; item jsonb;
BEGIN
 raw := response #>> '{}';
 IF raw IS NULL OR trim(raw)='' THEN RETURN false; END IF;
 IF jsonb_typeof(grading->'partIds') IS DISTINCT FROM 'array' THEN RETURN true; END IF;
 BEGIN parts := raw::jsonb; EXCEPTION WHEN invalid_text_representation THEN RETURN true; END;
 IF jsonb_typeof(parts) IS DISTINCT FROM 'object' THEN RETURN true; END IF;
 FOR item IN SELECT value FROM jsonb_each(parts) LOOP
  IF jsonb_typeof(item)='string' AND trim(item #>> '{}')<>'' THEN RETURN true; END IF;
  IF jsonb_typeof(item)='array' AND jsonb_array_length(item)>0 THEN RETURN true; END IF;
 END LOOP;
 RETURN false;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_teacher_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE maximum integer; state text; mode text; automatic_status text; latest integer;
BEGIN
 IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Teacher review history is immutable'; END IF;
 SELECT status INTO state FROM lesson_attempts WHERE id = NEW.attempt_id FOR UPDATE;
 IF state <> 'submitted' THEN RAISE EXCEPTION 'Review requires a submitted attempt'; END IF;
 IF NOT EXISTS (SELECT 1 FROM teacher_sessions WHERE id = NEW.teacher_session_id AND revoked_at IS NULL AND expires_at > now()) THEN
  RAISE EXCEPTION 'Active teacher session required';
 END IF;
 SELECT q.max_points,q.grading->>'mode',a.review_status INTO maximum,mode,automatic_status FROM answers a LEFT JOIN questions q ON a.question_id=q.id
 WHERE a.attempt_id=NEW.attempt_id AND a.question_id=NEW.question_id;
 IF mode IS DISTINCT FROM 'manual' AND automatic_status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'Only responses needing teacher assessment can be reviewed'; END IF;
 IF NEW.awarded_points IS NOT NULL AND (maximum IS NULL OR maximum<=0 OR NEW.awarded_points>maximum) THEN RAISE EXCEPTION 'Review exceeds configured points'; END IF;
 SELECT COALESCE(max(revision),0) INTO latest FROM teacher_reviews WHERE attempt_id=NEW.attempt_id AND question_id=NEW.question_id;
 IF NEW.revision<>latest+1 THEN RAISE EXCEPTION 'Review revision conflict'; END IF;
 RETURN NEW;
END $$;
