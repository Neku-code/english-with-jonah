CREATE TABLE "answers" (
	"attempt_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"earned_points" integer,
	"review_status" text DEFAULT 'ungraded' NOT NULL,
	CONSTRAINT "answers_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id"),
	CONSTRAINT "answer_revision" CHECK ("answers"."revision" > 0),
	CONSTRAINT "answer_result" CHECK (("answers"."review_status" = 'ungraded' and "answers"."earned_points" is null) or ("answers"."review_status" = 'pending' and "answers"."earned_points" is null) or ("answers"."review_status" = 'graded' and "answers"."earned_points" >= 0))
);
--> statement-breakpoint
CREATE TABLE "entry_tickets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"lookup_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ticket_hash" CHECK (length("entry_tickets"."token_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "lesson_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"earned_points" integer,
	"max_points" integer,
	"pending_review" boolean DEFAULT false NOT NULL,
	CONSTRAINT "attempt_owner_version" UNIQUE("id","student_id","version_id"),
	CONSTRAINT "attempt_owner_lesson" UNIQUE("id","student_id","lesson_id"),
	CONSTRAINT "attempt_state" CHECK (("lesson_attempts"."status" = 'in_progress' and "lesson_attempts"."submitted_at" is null and "lesson_attempts"."earned_points" is null and "lesson_attempts"."max_points" is null) or ("lesson_attempts"."status" = 'submitted' and "lesson_attempts"."submitted_at" is not null and "lesson_attempts"."earned_points" >= 0 and "lesson_attempts"."max_points" > 0 and "lesson_attempts"."earned_points" <= "lesson_attempts"."max_points"))
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_attempt_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_student_id_lesson_id_pk" PRIMARY KEY("student_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lesson_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completion_policy" jsonb DEFAULT '{"mode":"manual"}'::jsonb NOT NULL,
	"vocabulary_required" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_number" UNIQUE("lesson_id","version"),
	CONSTRAINT "revision_lesson" UNIQUE("id","lesson_id"),
	CONSTRAINT "revision_positive" CHECK ("lesson_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" text DEFAULT 'lesson' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_order" UNIQUE("unit_id","position"),
	CONSTRAINT "lesson_position" CHECK ("lessons"."position" > 0),
	CONSTRAINT "lesson_status" CHECK ("lessons"."status" in ('draft', 'published')),
	CONSTRAINT "lesson_kind" CHECK ("lessons"."kind" in ('lesson', 'final_exam'))
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"exercise_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"grading" jsonb NOT NULL,
	"max_points" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "question_order" UNIQUE("version_id","position"),
	CONSTRAINT "question_version" UNIQUE("id","version_id"),
	CONSTRAINT "question_points" CHECK ("questions"."max_points" > 0),
	CONSTRAINT "question_position" CHECK ("questions"."position" > 0),
	CONSTRAINT "question_type" CHECK ("questions"."exercise_type" in ('choice', 'text', 'written'))
);
--> statement-breakpoint
CREATE TABLE "student_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_lifetime" CHECK ("student_sessions"."expires_at" > "student_sessions"."created_at"),
	CONSTRAINT "session_hash" CHECK (length("student_sessions"."token_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"lookup_name" text NOT NULL,
	"group_label" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_learning_at" timestamp with time zone,
	CONSTRAINT "student_name_length" CHECK (length("students"."display_name") between 1 and 120 and length("students"."lookup_name") between 1 and 120),
	CONSTRAINT "student_group_length" CHECK ("students"."group_label" is null or length("students"."group_label") between 1 and 80),
	CONSTRAINT "student_status" CHECK ("students"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unit_order" UNIQUE("position"),
	CONSTRAINT "unit_position" CHECK ("units"."position" > 0),
	CONSTRAINT "unit_status" CHECK ("units"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "vocabulary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"english" text NOT NULL,
	"accepted_translations" jsonb NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "vocab_order" UNIQUE("version_id","position"),
	CONSTRAINT "vocab_position" CHECK ("vocabulary_items"."position" > 0),
	CONSTRAINT "vocab_translations" CHECK (jsonb_typeof("vocabulary_items"."accepted_translations") = 'array' and jsonb_array_length("vocabulary_items"."accepted_translations") > 0)
);
--> statement-breakpoint
CREATE TABLE "vocabulary_readiness" (
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"result_id" uuid NOT NULL,
	"passed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocabulary_readiness_student_id_lesson_id_version_id_pk" PRIMARY KEY("student_id","lesson_id","version_id")
);
--> statement-breakpoint
CREATE TABLE "vocabulary_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_result_source" UNIQUE("student_id","source_key"),
	CONSTRAINT "vocab_result_owner" UNIQUE("id","student_id","lesson_id","version_id"),
	CONSTRAINT "vocab_score" CHECK ("vocabulary_results"."total" > 0 and "vocabulary_results"."correct" >= 0 and "vocabulary_results"."correct" <= "vocabulary_results"."total")
);
--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_id_student_id_version_id_lesson_attempts_id_student_id_version_id_fk" FOREIGN KEY ("attempt_id","student_id","version_id") REFERENCES "public"."lesson_attempts"("id","student_id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_version_id_questions_id_version_id_fk" FOREIGN KEY ("question_id","version_id") REFERENCES "public"."questions"("id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_attempts" ADD CONSTRAINT "lesson_attempts_version_id_lesson_id_lesson_versions_id_lesson_id_fk" FOREIGN KEY ("version_id","lesson_id") REFERENCES "public"."lesson_versions"("id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_completed_attempt_id_student_id_lesson_id_lesson_attempts_id_student_id_lesson_id_fk" FOREIGN KEY ("completed_attempt_id","student_id","lesson_id") REFERENCES "public"."lesson_attempts"("id","student_id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_version_id_lesson_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."lesson_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_items" ADD CONSTRAINT "vocabulary_items_version_id_lesson_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."lesson_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_readiness" ADD CONSTRAINT "vocabulary_readiness_result_id_student_id_lesson_id_version_id_vocabulary_results_id_student_id_lesson_id_version_id_fk" FOREIGN KEY ("result_id","student_id","lesson_id","version_id") REFERENCES "public"."vocabulary_results"("id","student_id","lesson_id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_results" ADD CONSTRAINT "vocabulary_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_results" ADD CONSTRAINT "vocabulary_results_version_id_lesson_id_lesson_versions_id_lesson_id_fk" FOREIGN KEY ("version_id","lesson_id") REFERENCES "public"."lesson_versions"("id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "ticket_expiry_idx" ON "entry_tickets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "attempt_student_recent_idx" ON "lesson_attempts" USING btree ("student_id","updated_at");--> statement-breakpoint
CREATE INDEX "attempt_revision_idx" ON "lesson_attempts" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_unfinished_attempt" ON "lesson_attempts" USING btree ("student_id","lesson_id") WHERE "lesson_attempts"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "progress_attempt_idx" ON "lesson_progress" USING btree ("completed_attempt_id");--> statement-breakpoint
CREATE INDEX "revision_lesson_idx" ON "lesson_versions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_unit_idx" ON "lessons" USING btree ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_final_per_unit" ON "lessons" USING btree ("unit_id") WHERE "lessons"."kind" = 'final_exam';--> statement-breakpoint
CREATE INDEX "session_student_idx" ON "student_sessions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "session_expiry_idx" ON "student_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "students_lookup_idx" ON "students" USING btree ("lookup_name","status");