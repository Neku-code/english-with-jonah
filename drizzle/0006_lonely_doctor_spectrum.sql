CREATE TABLE "practice_checks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_revision" integer NOT NULL,
	"response" text NOT NULL,
	"earned_points" integer,
	"review_status" text NOT NULL,
	"transcript_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "check_answer_revision" UNIQUE("attempt_id","question_id","answer_revision")
);
--> statement-breakpoint
CREATE TABLE "study_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_workspaces" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"section_id" text DEFAULT '' NOT NULL,
	"panels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"audio_plays" integer DEFAULT 0 NOT NULL,
	"audio_status" text DEFAULT 'idle' NOT NULL,
	"transcript_used" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_counts" CHECK ("study_workspaces"."revision" >= 0 AND "study_workspaces"."audio_plays" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vocabulary_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"word_ids" jsonb NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_checks" ADD CONSTRAINT "practice_checks_attempt_id_student_id_version_id_lesson_attempts_id_student_id_version_id_fk" FOREIGN KEY ("attempt_id","student_id","version_id") REFERENCES "public"."lesson_attempts"("id","student_id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_checks" ADD CONSTRAINT "practice_checks_question_id_version_id_questions_id_version_id_fk" FOREIGN KEY ("question_id","version_id") REFERENCES "public"."questions"("id","version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_events" ADD CONSTRAINT "study_events_attempt_id_lesson_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."lesson_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_workspaces" ADD CONSTRAINT "study_workspaces_attempt_id_lesson_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."lesson_attempts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_sessions" ADD CONSTRAINT "vocabulary_sessions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabulary_sessions" ADD CONSTRAINT "vocabulary_sessions_version_id_lesson_id_lesson_versions_id_lesson_id_fk" FOREIGN KEY ("version_id","lesson_id") REFERENCES "public"."lesson_versions"("id","lesson_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_event_attempt" ON "study_events" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_vocab_session" ON "vocabulary_sessions" USING btree ("student_id","version_id") WHERE "vocabulary_sessions"."submitted"=false;