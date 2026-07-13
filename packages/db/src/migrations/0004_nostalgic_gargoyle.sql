ALTER TABLE "buildings" ADD COLUMN "code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_code_unique" UNIQUE("code");