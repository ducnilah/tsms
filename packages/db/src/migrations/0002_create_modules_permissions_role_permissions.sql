CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_key" text NOT NULL,
	"module_name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "modules_module_key_unique" UNIQUE("module_key")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"action_key" text NOT NULL,
	"bit_value" integer NOT NULL,
	"permission_key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_permission_key_unique" UNIQUE("permission_key"),
	CONSTRAINT "permissions_module_action_unique" UNIQUE("module_id","action_key"),
	CONSTRAINT "permissions_module_bit_unique" UNIQUE("module_id","bit_value")
);
--> statement-breakpoint
CREATE TABLE "roles_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "roles_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;