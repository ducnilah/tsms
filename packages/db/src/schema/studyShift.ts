import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const studyShift = pgTable("study_shifts", {
	id: serial("id").primaryKey(),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
