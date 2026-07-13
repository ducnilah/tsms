CREATE TABLE "majors" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"faculty_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "majors_code_unique" UNIQUE("code")
);--> statement-breakpoint
ALTER TABLE "majors" ADD CONSTRAINT "majors_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" DROP CONSTRAINT "programs_department_id_departments_id_fk";--> statement-breakpoint
ALTER TABLE "programs" RENAME COLUMN "department_id" TO "major_id";--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "academic_year" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "version" integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "academic_year" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "programs" ALTER COLUMN "version" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_classes" ADD COLUMN "major_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "student_classes" ADD COLUMN "program_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;
