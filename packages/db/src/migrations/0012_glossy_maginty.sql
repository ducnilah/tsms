CREATE TABLE "class_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"semester_week_id" integer NOT NULL,
	"schedule_date" date NOT NULL,
	"course_class_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"time_slot_id" integer NOT NULL,
	"classroom_id" integer NOT NULL,
	"session_type" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_class" (
	"id" serial PRIMARY KEY NOT NULL,
	"semester_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"student_class_id" integer NOT NULL,
	"lecturer_id" integer NOT NULL,
	"expected_students" integer DEFAULT 0 NOT NULL,
	"week_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "study_shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"study_shift_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "time_slots_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "academic_years" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_semester_id_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_semester_week_id_semester_weeks_id_fk" FOREIGN KEY ("semester_week_id") REFERENCES "public"."semester_weeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_course_class_id_course_class_id_fk" FOREIGN KEY ("course_class_id") REFERENCES "public"."course_class"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_time_slot_id_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_class" ADD CONSTRAINT "course_class_semester_id_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_class" ADD CONSTRAINT "course_class_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_class" ADD CONSTRAINT "course_class_student_class_id_student_classes_id_fk" FOREIGN KEY ("student_class_id") REFERENCES "public"."student_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_class" ADD CONSTRAINT "course_class_lecturer_id_lecturers_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."lecturers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_study_shift_id_study_shifts_id_fk" FOREIGN KEY ("study_shift_id") REFERENCES "public"."study_shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_sessions_date_status_idx" ON "class_sessions" USING btree ("schedule_date","status");--> statement-breakpoint
CREATE INDEX "class_sessions_week_day_slot_idx" ON "class_sessions" USING btree ("semester_week_id","day_of_week","time_slot_id");--> statement-breakpoint
CREATE INDEX "class_sessions_room_conflict_lookup_idx" ON "class_sessions" USING btree ("semester_week_id","day_of_week","time_slot_id","classroom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_class_semester_course_student_class_unique" ON "course_class" USING btree ("semester_id","course_id","student_class_id");