ALTER TABLE "academic_holidays" DROP CONSTRAINT "academic_holidays_semester_id_academic_years_id_fk";
--> statement-breakpoint
ALTER TABLE "academic_holidays" ALTER COLUMN "semester_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_holidays" ALTER COLUMN "start_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "academic_holidays" ALTER COLUMN "end_date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "academic_holidays" ADD CONSTRAINT "academic_holidays_semester_id_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_code_unique" UNIQUE("code");--> statement-breakpoint
ALTER TABLE "semester" ADD CONSTRAINT "semester_code_unique" UNIQUE("code");