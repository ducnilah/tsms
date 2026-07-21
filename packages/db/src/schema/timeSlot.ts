import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { studyShift } from "./studyShift";

export const timeSlot = pgTable("time_slots", {
	id: serial("id").primaryKey(),
	studyShiftId: integer("study_shift_id")
		.notNull()
		.references(() => studyShift.id, { onDelete: "cascade" }),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
	scheduleType: text("schedule_type").notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	type: integer("type").notNull().default(1),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
