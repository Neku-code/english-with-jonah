CREATE TABLE "student_mutations" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"payload_hash" text NOT NULL,
	"student_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"teacher_session_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"feedback" text NOT NULL,
	"awarded_points" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teacher_reviews_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "review_revision" UNIQUE("attempt_id","question_id","revision"),
	CONSTRAINT "review_revision_positive" CHECK ("teacher_reviews"."revision" > 0),
	CONSTRAINT "review_points" CHECK ("teacher_reviews"."awarded_points" is null or "teacher_reviews"."awarded_points" >= 0),
	CONSTRAINT "review_feedback_length" CHECK (length("teacher_reviews"."feedback") <= 10000)
);
--> statement-breakpoint
CREATE TABLE "teacher_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "teacher_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "teacher_hash" CHECK (length("teacher_sessions"."token_hash") = 64),
	CONSTRAINT "teacher_lifetime" CHECK ("teacher_sessions"."expires_at" > "teacher_sessions"."created_at")
);
--> statement-breakpoint
ALTER TABLE "student_mutations" ADD CONSTRAINT "student_mutations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_teacher_session_id_teacher_sessions_id_fk" FOREIGN KEY ("teacher_session_id") REFERENCES "public"."teacher_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_attempt_id_question_id_answers_attempt_id_question_id_fk" FOREIGN KEY ("attempt_id","question_id") REFERENCES "public"."answers"("attempt_id","question_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_answer_idx" ON "teacher_reviews" USING btree ("attempt_id","question_id","revision");--> statement-breakpoint
CREATE INDEX "teacher_expiry_idx" ON "teacher_sessions" USING btree ("expires_at");