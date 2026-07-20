CREATE TABLE "original_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"lecture_credits" integer NOT NULL,
	"practice_credits" integer NOT NULL,
	"department_id" integer NOT NULL,
	"lecture_sessions" integer NOT NULL,
	"practice_sessions" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "original_courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "original_course_id" integer;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "lecture_credits" integer;
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "practice_credits" integer;
--> statement-breakpoint
UPDATE "courses"
SET
	"lecture_credits" = "lecture_sessions",
	"practice_credits" = GREATEST("credits" - "lecture_sessions", 0),
	"practice_sessions" = "practice_sessions" + "lab_sessions";
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "lecture_credits" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "practice_credits" SET NOT NULL;
--> statement-breakpoint
INSERT INTO "original_courses" (
	"code",
	"name",
	"lecture_credits",
	"practice_credits",
	"department_id",
	"lecture_sessions",
	"practice_sessions",
	"description",
	"status",
	"created_at",
	"updated_at"
)
SELECT
	"courses"."code",
	"courses"."name",
	"courses"."lecture_credits",
	"courses"."practice_credits",
	"courses"."department_id",
	"courses"."lecture_sessions",
	"courses"."practice_sessions",
	"courses"."description",
	"courses"."status",
	"courses"."created_at",
	"courses"."updated_at"
FROM "courses"
WHERE NOT EXISTS (
	SELECT 1
	FROM "original_courses"
	WHERE "original_courses"."code" = "courses"."code"
);
--> statement-breakpoint
UPDATE "courses"
SET "original_course_id" = "original_courses"."id"
FROM "original_courses"
WHERE "courses"."original_course_id" IS NULL
	AND "original_courses"."code" = "courses"."code";
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "original_course_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_original_course_id_original_courses_id_fk" FOREIGN KEY ("original_course_id") REFERENCES "public"."original_courses"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "courses_original_course_id_idx" ON "courses" USING btree ("original_course_id");
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "credits";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "lab_sessions";
