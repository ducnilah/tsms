import type { RouterClient } from "@orpc/server";
import { publicProcedure } from "../index";
import { authRouter } from "./auth";
import { departmentsRouter } from "./departments";
import { facultiesRouter } from "./faculties";
import { lecturersRouter } from "./lecturer";
import { majorsRouter } from "./major";
import { programCoursesRouter } from "./programCourse";
import { programsRouter } from "./program";
import { rolesRouter } from "./roles";
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
	"faculties.list": facultiesRouter.list,
	"faculties.options": facultiesRouter.options,
	"faculties.create": facultiesRouter.create,
	"faculties.update": facultiesRouter.update,
	"faculties.delete": facultiesRouter.delete,
	"departments.list": departmentsRouter.list,
	"departments.options": departmentsRouter.options,
	"departments.listByFaculty": departmentsRouter.listByFaculty,
	"departments.create": departmentsRouter.create,
	"departments.update": departmentsRouter.update,
	"departments.delete": departmentsRouter.delete,
	"majors.list": majorsRouter.list,
	"majors.options": majorsRouter.options,
	"majors.listByFaculty": majorsRouter.listByFaculty,
	"majors.create": majorsRouter.create,
	"majors.update": majorsRouter.update,
	"majors.delete": majorsRouter.delete,
	"programs.list": programsRouter.list,
	"programs.options": programsRouter.options,
	"programs.listByMajor": programsRouter.listByMajor,
	"programs.create": programsRouter.create,
	"programs.update": programsRouter.update,
	"programs.delete": programsRouter.delete,
	"programCourses.listByProgram": programCoursesRouter.listByProgram,
	"programCourses.create": programCoursesRouter.create,
	"programCourses.update": programCoursesRouter.update,
	"programCourses.delete": programCoursesRouter.delete,
	"lecturers.list": lecturersRouter.list,
	"lecturers.create": lecturersRouter.create,
	"lecturers.update": lecturersRouter.update,
	"lecturers.delete": lecturersRouter.delete,
	"lecturers.listByDepartmentFaculty": lecturersRouter.listByDepartmentFaculty,
	"students.list": studentsRouter.list,
	"students.create": studentsRouter.create,
	"students.update": studentsRouter.update,
	"students.delete": studentsRouter.delete,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
