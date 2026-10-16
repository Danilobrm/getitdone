CREATE TYPE "public"."session_kind" AS ENUM('focus', 'short_break', 'long_break');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('manual', 'seed', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pomodoro_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"kind" "session_kind" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"planned_sec" integer NOT NULL,
	"ended_at" timestamp with time zone,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category_id" uuid,
	"estimated_pomodoros" integer,
	"weekdays" integer[] NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"focus_sec" integer DEFAULT 1500 NOT NULL,
	"short_break_sec" integer DEFAULT 300 NOT NULL,
	"long_break_sec" integer DEFAULT 900 NOT NULL,
	"pomodoros_until_long_break" integer DEFAULT 4 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"category_id" uuid,
	"date" date,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"estimated_pomodoros" integer,
	"time_spent_sec" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"source" "task_source" DEFAULT 'manual' NOT NULL,
	"recurring_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pomodoro_sessions" ADD CONSTRAINT "pomodoro_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pomodoro_sessions_task_idx" ON "pomodoro_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pomodoro_single_open_uniq" ON "pomodoro_sessions" USING btree ((true)) WHERE "pomodoro_sessions"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "tasks_date_idx" ON "tasks" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_rule_date_uniq" ON "tasks" USING btree ("recurring_rule_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_single_doing_uniq" ON "tasks" USING btree ("status") WHERE "tasks"."status" = 'doing';