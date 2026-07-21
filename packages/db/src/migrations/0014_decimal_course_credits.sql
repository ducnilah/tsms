ALTER TABLE "courses" ALTER COLUMN "lecture_credits" TYPE numeric(3,1) USING "lecture_credits"::numeric(3,1);
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "practice_credits" TYPE numeric(3,1) USING "practice_credits"::numeric(3,1);
--> statement-breakpoint
ALTER TABLE "original_courses" ALTER COLUMN "lecture_credits" TYPE numeric(3,1) USING "lecture_credits"::numeric(3,1);
--> statement-breakpoint
ALTER TABLE "original_courses" ALTER COLUMN "practice_credits" TYPE numeric(3,1) USING "practice_credits"::numeric(3,1);
--> statement-breakpoint
UPDATE "courses"
SET
	"lecture_sessions" = ("lecture_credits" * 15)::integer,
	"practice_sessions" = ("practice_credits" * 30)::integer;
--> statement-breakpoint
UPDATE "original_courses"
SET
	"lecture_sessions" = ("lecture_credits" * 15)::integer,
	"practice_sessions" = ("practice_credits" * 30)::integer;
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecture_credits_value_check" CHECK ("lecture_credits" = 0 OR "lecture_credits" >= 1);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_practice_credits_value_check" CHECK ("practice_credits" = 0 OR "practice_credits" >= 1);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecture_credits_step_check" CHECK (mod(("lecture_credits" * 10), 5) = 0);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_practice_credits_step_check" CHECK (mod(("practice_credits" * 10), 5) = 0);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_total_credits_positive_check" CHECK ("lecture_credits" + "practice_credits" > 0);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_lecture_credits_value_check" CHECK ("lecture_credits" = 0 OR "lecture_credits" >= 1);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_practice_credits_value_check" CHECK ("practice_credits" = 0 OR "practice_credits" >= 1);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_lecture_credits_step_check" CHECK (mod(("lecture_credits" * 10), 5) = 0);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_practice_credits_step_check" CHECK (mod(("practice_credits" * 10), 5) = 0);
--> statement-breakpoint
ALTER TABLE "original_courses" ADD CONSTRAINT "original_courses_total_credits_positive_check" CHECK ("lecture_credits" + "practice_credits" > 0);
