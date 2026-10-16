CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
-- Unclaimed placeholder that owns all pre-multi-user data. The first sign-up adopts it.
INSERT INTO "users" ("username") VALUES ('owner');--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_single_row";--> statement-breakpoint
DROP INDEX "tasks_date_idx";--> statement-breakpoint
DROP INDEX "pomodoro_single_open_uniq";--> statement-breakpoint
DROP INDEX "tasks_single_doing_uniq";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "categories" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'owner');--> statement-breakpoint
UPDATE "pomodoro_sessions" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'owner');--> statement-breakpoint
UPDATE "recurring_rules" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'owner');--> statement-breakpoint
UPDATE "settings" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'owner');--> statement-breakpoint
UPDATE "tasks" SET "user_id" = (SELECT "id" FROM "users" WHERE "username" = 'owner');--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_rules" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
-- Dropping "id" also drops the old primary key; user_id becomes the key.
ALTER TABLE "settings" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "settings" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_date_idx" ON "tasks" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "pomodoro_single_open_uniq" ON "pomodoro_sessions" USING btree ("user_id") WHERE "pomodoro_sessions"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_single_doing_uniq" ON "tasks" USING btree ("user_id") WHERE "tasks"."status" = 'doing';
