ALTER TABLE "time_slots" ADD COLUMN "schedule_type" text DEFAULT 'lecture' NOT NULL;
--> statement-breakpoint
ALTER TABLE "time_slots" ADD COLUMN "type" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_schedule_type_check" CHECK ("schedule_type" IN ('lecture', 'practice', 'integrated'));
--> statement-breakpoint
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_type_check" CHECK ("type" IN (1, 2));
--> statement-breakpoint
ALTER TABLE "time_slots" DROP COLUMN "sort_order";
