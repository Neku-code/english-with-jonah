DROP INDEX "students_lookup_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "students_lookup_name_unique" ON "students" USING btree ("lookup_name");