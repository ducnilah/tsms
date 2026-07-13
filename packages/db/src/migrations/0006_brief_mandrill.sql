ALTER TABLE "classrooms" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_code_unique" UNIQUE("code");