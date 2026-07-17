import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { academicHolidaysRouter } from "./academicHoliday";
import { academicWeeksRouter } from "./academicWeek";
import { academicYearsRouter } from "./academicYear";
import { authRouter } from "./auth";
import { buildingRouter } from "./building";
import { classroomRouter } from "./classroom";
import { classSessionsRouter } from "./classSession";
import { courseRouter } from "./course";
import { courseClassesRouter } from "./courseClass";
import { departmentsRouter } from "./departments";
import { facultiesRouter } from "./faculties";
import { lecturersRouter } from "./lecturer";
import { majorsRouter } from "./major";
import { programCoursesRouter } from "./programCourse";
import { programsRouter } from "./program";
import { rolesRouter } from "./roles";
import { semestersRouter } from "./semester";
import { studentClassesRouter } from "./studentClass";
import { studentsRouter } from "./student";
import { todoRouter } from "./todo";
import { usersRouter } from "./users";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	"auth.register": authRouter.register,
	"auth.login": authRouter.login,
	"auth.refresh": authRouter.refresh,
	"auth.logout": authRouter.logout,
	"auth.me": authRouter.me,
	"users.list": usersRouter.list,
	"users.create": usersRouter.create,
	"users.lock": usersRouter.lock,
	"users.unlock": usersRouter.unlock,
	"users.resetPassword": usersRouter.resetPassword,
	"users.assignRoles": usersRouter.assignRoles,
	"todo.getAll": todoRouter.getAll,
	"todo.create": todoRouter.create,
	"todo.toggle": todoRouter.toggle,
	"todo.delete": todoRouter.delete,
	"roles.create": rolesRouter.createRole,
	"roles.delete": rolesRouter.deleteRole,
	"roles.list": rolesRouter.list,
	"roles.getPermissionCatalog": rolesRouter.getPermissionCatalog,
	"roles.getRolePermissionMatrix": rolesRouter.getRolePermissionMatrix,
	"roles.updateRolePermissions": rolesRouter.updateRolePermissions,
	"academicYears.list": academicYearsRouter.list,
	"academicYears.options": academicYearsRouter.options,
	"academicYears.byId": academicYearsRouter.byId,
	"academicYears.create": academicYearsRouter.create,
	"academicYears.update": academicYearsRouter.update,
	"academicYears.delete": academicYearsRouter.delete,
	"academicYears.changeStatus": academicYearsRouter.changeStatus,
	"semesters.list": semestersRouter.list,
	"semesters.options": semestersRouter.options,
	"semesters.byId": semestersRouter.byId,
	"semesters.create": semestersRouter.create,
	"semesters.update": semestersRouter.update,
	"semesters.delete": semestersRouter.delete,
	"semesters.changeStatus": semestersRouter.changeStatus,
	"academicWeeks.listBySemester": academicWeeksRouter.listBySemester,
	"academicWeeks.update": academicWeeksRouter.update,
	"academicHolidays.list": academicHolidaysRouter.list,
	"academicHolidays.byId": academicHolidaysRouter.byId,
	"academicHolidays.create": academicHolidaysRouter.create,
	"academicHolidays.update": academicHolidaysRouter.update,
	"academicHolidays.delete": academicHolidaysRouter.delete,
	"faculties.list": facultiesRouter.list,
	"faculties.options": facultiesRouter.options,
	"faculties.byId": facultiesRouter.byId,
	"faculties.create": facultiesRouter.create,
	"faculties.update": facultiesRouter.update,
	"faculties.delete": facultiesRouter.delete,
	"departments.list": departmentsRouter.list,
	"departments.options": departmentsRouter.options,
	"departments.byId": departmentsRouter.byId,
	"departments.create": departmentsRouter.create,
	"departments.update": departmentsRouter.update,
	"departments.delete": departmentsRouter.delete,
	"majors.list": majorsRouter.list,
	"majors.options": majorsRouter.options,
	"majors.byId": majorsRouter.byId,
	"majors.create": majorsRouter.create,
	"majors.update": majorsRouter.update,
	"majors.delete": majorsRouter.delete,
	"programs.list": programsRouter.list,
	"programs.options": programsRouter.options,
	"programs.byId": programsRouter.byId,
	"programs.create": programsRouter.create,
	"programs.update": programsRouter.update,
	"programs.delete": programsRouter.delete,
	"programCourses.listByProgram": programCoursesRouter.listByProgram,
	"programCourses.options": programCoursesRouter.options,
	"programCourses.byId": programCoursesRouter.byId,
	"programCourses.create": programCoursesRouter.create,
	"programCourses.update": programCoursesRouter.update,
	"programCourses.delete": programCoursesRouter.delete,
	"lecturers.list": lecturersRouter.list,
	"lecturers.options": lecturersRouter.options,
	"lecturers.byId": lecturersRouter.byId,
	"lecturers.create": lecturersRouter.create,
	"lecturers.update": lecturersRouter.update,
	"lecturers.delete": lecturersRouter.delete,
	"lecturers.listByDepartmentFaculty": lecturersRouter.listByDepartmentFaculty,
	"students.list": studentsRouter.list,
	"students.options": studentsRouter.options,
	"students.byId": studentsRouter.byId,
	"students.create": studentsRouter.create,
	"students.update": studentsRouter.update,
	"students.delete": studentsRouter.delete,
	"students.exportRows": studentsRouter.exportRows,
	"students.importRows": studentsRouter.importRows,
	"studentClasses.options": studentClassesRouter.options,
	"buildings.list": buildingRouter.list,
	"buildings.options": buildingRouter.options,
	"buildings.byId": buildingRouter.byId,
	"buildings.create": buildingRouter.create,
	"buildings.update": buildingRouter.update,
	"buildings.delete": buildingRouter.delete,
	"classrooms.list": classroomRouter.list,
	"classrooms.options": classroomRouter.options,
	"classrooms.byId": classroomRouter.byId,
	"classrooms.listByBuilding": classroomRouter.listByBuilding,
	"classrooms.create": classroomRouter.create,
	"classrooms.update": classroomRouter.update,
	"classrooms.delete": classroomRouter.delete,
	"courses.list": courseRouter.list,
	"courses.options": courseRouter.options,
	"courses.byId": courseRouter.byId,
	"courses.create": courseRouter.create,
	"courses.update": courseRouter.update,
	"courses.delete": courseRouter.delete,
	"courses.lock": courseRouter.lock,
	"courses.unlock": courseRouter.unlock,
	"courseClasses.list": courseClassesRouter.list,
	"courseClasses.options": courseClassesRouter.options,
	"courseClasses.byId": courseClassesRouter.byId,
	"courseClasses.create": courseClassesRouter.create,
	"courseClasses.update": courseClassesRouter.update,
	"courseClasses.delete": courseClassesRouter.delete,
	"courseClasses.changeStatus": courseClassesRouter.changeStatus,
	"classSessions.list": classSessionsRouter.list,
	"classSessions.byCourseClass": classSessionsRouter.byCourseClass,
	"classSessions.weeklyView": classSessionsRouter.weeklyView,
	"classSessions.create": classSessionsRouter.create,
	"classSessions.update": classSessionsRouter.update,
	"classSessions.delete": classSessionsRouter.delete,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
