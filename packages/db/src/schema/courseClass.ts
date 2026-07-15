import {
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { course } from "./course";
import { lecturer } from "./lecturer";
import { semester } from "./semester";
import { studentClass } from "./studentClass";

export const courseClass = pgTable("course_class", {
	id: serial("id").primaryKey(),
	semesterId: integer("semester_id")
		.notNull()
		.references(() => semester.id, { onDelete: "cascade" }),
	courseId: integer("course_id")
		.notNull()
		.references(() => course.id, { onDelete: "restrict" }),
	studentClassId: integer("student_class_id")
		.notNull()
		.references(() => studentClass.id, { onDelete: "restrict" }),
	lecturerId: integer("lecturer_id")
		.notNull()
		.references(() => lecturer.id, { onDelete: "restrict" }),
	expectedStudents: integer("expected_students").notNull().default(0),
	weekNumbers: jsonb("week_numbers").$type<number[]>().notNull().default([]),
	status: text("status").notNull().default("active"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
	return {
		uniqueClassCourseInSemester: uniqueIndex(
			"course_class_semester_course_student_class_unique",
		).on(table.semesterId, table.courseId, table.studentClassId),
	};
});
