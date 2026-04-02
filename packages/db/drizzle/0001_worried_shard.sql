CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"last_project_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
