-- Navigation workspaces are mutable; checked answers and support events are not.
CREATE FUNCTION retain_study_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Study history is append-only'; END $$;
--> statement-breakpoint
CREATE TRIGGER retain_practice_check BEFORE UPDATE OR DELETE ON practice_checks FOR EACH ROW EXECUTE FUNCTION retain_study_history();
--> statement-breakpoint
CREATE TRIGGER retain_study_event BEFORE UPDATE OR DELETE ON study_events FOR EACH ROW EXECUTE FUNCTION retain_study_history();
