CREATE TABLE "recurring_skips" (
	"recurring_rule_id" uuid NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "recurring_skips_recurring_rule_id_date_pk" PRIMARY KEY("recurring_rule_id","date")
);
--> statement-breakpoint
ALTER TABLE "recurring_skips" ADD CONSTRAINT "recurring_skips_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE cascade ON UPDATE no action;