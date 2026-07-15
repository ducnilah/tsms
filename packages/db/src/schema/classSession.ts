import {
	date,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { classroom } from "./classroom";
import { courseClass } from "./courseClass";
import { semester } from "./semester";
import { semesterWeek } from "./semesterWeek";
import { timeSlot } from "./timeSlot";

export const classSession = pgTable("class_sessions", {
	id: serial("id").primaryKey(),
	semesterId: integer("semester_id")
		.notNull()
		.references(() => semester.id, { onDelete: "cascade" }),
	semesterWeekId: integer("semester_week_id")
		.notNull()
		.references(() => semesterWeek.id, { onDelete: "cascade" }),
	scheduleDate: date("schedule_date").notNull(),
	courseClassId: integer("course_class_id")
		.notNull()
		.references(() => courseClass.id, { onDelete: "restrict" }),
	dayOfWeek: integer("day_of_week").notNull(),
	timeSlotId: integer("time_slot_id")
		.notNull()
		.references(() => timeSlot.id, { onDelete: "restrict" }),
	classroomId: integer("classroom_id")
		.notNull()
		.references(() => classroom.id, { onDelete: "restrict" }),
	sessionType: text("session_type").notNull(),
	note: text("note").notNull().default(""),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
	return {
		dateStatusIdx: index("class_sessions_date_status_idx").on(
			table.scheduleDate,
			table.status,
		),
		weekDaySlotIdx: index("class_sessions_week_day_slot_idx").on(
			table.semesterWeekId,
			table.dayOfWeek,
			table.timeSlotId,
		),
		roomConflictLookupIdx: index("class_sessions_room_conflict_lookup_idx").on(
			table.semesterWeekId,
			table.dayOfWeek,
			table.timeSlotId,
			table.classroomId,
		),
	};
});
