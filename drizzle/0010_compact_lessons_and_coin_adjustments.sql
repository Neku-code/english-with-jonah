CREATE TABLE "coin_adjustments" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"teacher_session_id" uuid NOT NULL,
	"delta" bigint NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adjustment_nonzero" CHECK ("coin_adjustments"."delta" <> 0 AND "coin_adjustments"."delta" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "adjustment_reason" CHECK (length("coin_adjustments"."reason") <= 500)
);
--> statement-breakpoint
DROP INDEX "one_unfinished_attempt";--> statement-breakpoint
ALTER TABLE "coin_adjustments" ADD CONSTRAINT "coin_adjustments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_adjustments" ADD CONSTRAINT "coin_adjustments_teacher_session_id_teacher_sessions_id_fk" FOREIGN KEY ("teacher_session_id") REFERENCES "public"."teacher_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coin_adjustments_student_idx" ON "coin_adjustments" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "one_unfinished_attempt" ON "lesson_attempts" USING btree ("student_id","lesson_id","version_id") WHERE "lesson_attempts"."status" = 'in_progress';
--> statement-breakpoint
CREATE TRIGGER retain_coin_adjustments BEFORE UPDATE OR DELETE ON coin_adjustments FOR EACH ROW EXECUTE FUNCTION retain_study_history();
