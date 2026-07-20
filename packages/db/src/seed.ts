import { hash } from "bcryptjs";
import dotenv from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as schema from "./schema/index.js";
import { academicHoliday } from "./schema/academicHoliday.js";
import { academicYear } from "./schema/academicYear.js";
import { building } from "./schema/building.js";
import { classroom } from "./schema/classroom.js";
import { course } from "./schema/course.js";
import { coursePrerequisite } from "./schema/coursePrerequisite.js";
import { department } from "./schema/department.js";
import { faculty } from "./schema/faculty.js";
import { lecturer } from "./schema/lecturer.js";
import { major } from "./schema/major.js";
import { originalCourse } from "./schema/originalCourse.js";
import { permission } from "./schema/permission.js";
import { program } from "./schema/program.js";
import { programCourse } from "./schema/programCourse.js";
import { role } from "./schema/role.js";
import { rolePermission } from "./schema/rolePermission.js";
import { semester } from "./schema/semester.js";
import { semesterWeek } from "./schema/semesterWeek.js";
import { student } from "./schema/student.js";
import { studentClass } from "./schema/studentClass.js";
import { studyShift } from "./schema/studyShift.js";
import { timeSlot } from "./schema/timeSlot.js";
import { user } from "./schema/user.js";
import { userRole } from "./schema/userRole.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../apps/server/.env") });

const db = drizzle(process.env.DATABASE_URL!, { schema });

const ROLES = [
	{ role_name: "admin", description: "Quản trị hệ thống toàn quyền" },
	{ role_name: "dean", description: "Trưởng khoa / Bộ môn" },
	{ role_name: "teacher", description: "Giảng viên" },
] as const;

const SEED_USERS = [
	{
		username: "admin",
		email: "admin@tsms.edu.vn",
		password: "Admin@123456",
		roleName: "admin",
	},
	{
		username: "dean",
		email: "dean@tsms.edu.vn",
		password: "Dean@123456",
		roleName: "dean",
	},
	{
		username: "teacher",
		email: "teacher@tsms.edu.vn",
		password: "Teacher@123456",
		roleName: "teacher",
	},
] as const;

const SEED_PERMISSIONS = [
	{ key: "users", name: "Quản lý người dùng", bitValue: 15 },
	{ key: "roles", name: "Quản lý vai trò", bitValue: 15 },
	{ key: "faculties", name: "Quản lý khoa", bitValue: 15 },
	{ key: "departments", name: "Quản lý bộ môn", bitValue: 15 },
	{ key: "majors", name: "Quản lý ngành", bitValue: 15 },
	{ key: "programs", name: "Quản lý chương trình đào tạo", bitValue: 15 },
	{ key: "courses", name: "Quản lý học phần", bitValue: 15 },
	{ key: "students", name: "Quản lý sinh viên", bitValue: 15 },
	{ key: "lecturers", name: "Quản lý giảng viên", bitValue: 15 },
] as const;

const ACADEMIC_CALENDAR_PERMISSIONS = [
	{ key: "academic-years", name: "Quản lý năm học", bitValue: 15 },
	{ key: "semesters", name: "Quản lý học kỳ", bitValue: 15 },
	{ key: "semester-weeks", name: "Quản lý tuần học", bitValue: 15 },
	{ key: "academic-holidays", name: "Quản lý ngày nghỉ/lễ", bitValue: 15 },
	{ key: "course-classes", name: "Quản lý lớp học phần", bitValue: 15 },
	{ key: "class-sessions", name: "Quản lý buổi học", bitValue: 15 },
] as const;

const FACILITY_PERMISSIONS = [
	{ key: "buildings", name: "Quản lý tòa nhà", bitValue: 15 },
	{ key: "classrooms", name: "Quản lý phòng học", bitValue: 15 },
] as const;

const HUST_FACULTIES = [
	{
		code: "SME",
		name: "Trường Cơ khí",
		description: "Đơn vị quản ngành nhóm cơ khí, cơ điện tử, ô tô, nhiệt và hàng không.",
	},
	{
		code: "SOICT",
		name: "Trường Công nghệ Thông tin và Truyền thông",
		description: "Đơn vị quản ngành nhóm khoa học máy tính, kỹ thuật máy tính và công nghệ thông tin.",
	},
	{
		code: "SEEE",
		name: "Trường Điện - Điện tử",
		description: "Đơn vị quản ngành điện, điều khiển tự động hóa, điện tử viễn thông và kỹ thuật y sinh.",
	},
	{
		code: "SCLS",
		name: "Trường Hóa và Khoa học Sự sống",
		description: "Đơn vị quản ngành hóa học, kỹ thuật hóa học, sinh học, thực phẩm và môi trường.",
	},
	{
		code: "SMSE",
		name: "Trường Vật liệu",
		description: "Đơn vị quản ngành vật liệu, vi điện tử, nano, polyme và in.",
	},
	{
		code: "SEM",
		name: "Trường Kinh tế",
		description: "Đơn vị quản ngành kinh tế, quản lý công nghiệp, kinh doanh, tài chính và logistics.",
	},
	{
		code: "FAMI",
		name: "Khoa Toán - Tin",
		description: "Đơn vị quản ngành toán tin, hệ thống thông tin quản lý và khoa học tính toán.",
	},
	{
		code: "SEP",
		name: "Khoa Vật lý Kỹ thuật",
		description: "Đơn vị quản ngành vật lý kỹ thuật, kỹ thuật hạt nhân và vật lý y khoa.",
	},
	{
		code: "SOFL",
		name: "Khoa Ngoại ngữ",
		description: "Đơn vị quản ngành ngôn ngữ khoa học kỹ thuật và công nghệ.",
	},
	{
		code: "FED",
		name: "Khoa Khoa học và Công nghệ Giáo dục",
		description: "Đơn vị quản ngành công nghệ giáo dục, quản lý giáo dục và tâm lý học công nghiệp.",
	},
] as const;

const HUST_DEPARTMENTS = [
	{ code: "SOICT-CS", facultyCode: "SOICT", name: "Bộ môn Khoa học Máy tính" },
	{ code: "SOICT-CE", facultyCode: "SOICT", name: "Bộ môn Kỹ thuật Máy tính" },
	{ code: "SOICT-SE", facultyCode: "SOICT", name: "Bộ môn Công nghệ Phần mềm" },
	{ code: "SOICT-IS", facultyCode: "SOICT", name: "Bộ môn Hệ thống Thông tin" },
	{ code: "SEEE-EE", facultyCode: "SEEE", name: "Bộ môn Kỹ thuật Điện" },
	{ code: "SEEE-AC", facultyCode: "SEEE", name: "Bộ môn Điều khiển và Tự động hóa" },
	{ code: "SEEE-ET", facultyCode: "SEEE", name: "Bộ môn Điện tử - Viễn thông" },
	{ code: "SEEE-BME", facultyCode: "SEEE", name: "Bộ môn Kỹ thuật Y sinh" },
	{ code: "SME-ME", facultyCode: "SME", name: "Bộ môn Kỹ thuật Cơ khí" },
	{ code: "SME-MT", facultyCode: "SME", name: "Bộ môn Cơ điện tử" },
	{ code: "SME-AE", facultyCode: "SME", name: "Bộ môn Kỹ thuật Ô tô và Hàng không" },
	{ code: "SME-HE", facultyCode: "SME", name: "Bộ môn Kỹ thuật Nhiệt" },
	{ code: "SCLS-CH", facultyCode: "SCLS", name: "Bộ môn Kỹ thuật Hóa học" },
	{ code: "SCLS-BF", facultyCode: "SCLS", name: "Bộ môn Sinh học và Thực phẩm" },
	{ code: "SCLS-EV", facultyCode: "SCLS", name: "Bộ môn Môi trường" },
	{ code: "SMSE-MS", facultyCode: "SMSE", name: "Bộ môn Kỹ thuật Vật liệu" },
	{ code: "SMSE-NE", facultyCode: "SMSE", name: "Bộ môn Vi điện tử và Công nghệ Nano" },
	{ code: "SEM-IM", facultyCode: "SEM", name: "Bộ môn Quản lý Công nghiệp" },
	{ code: "SEM-BA", facultyCode: "SEM", name: "Bộ môn Quản trị Kinh doanh" },
	{ code: "SEM-FIN", facultyCode: "SEM", name: "Bộ môn Tài chính - Ngân hàng" },
	{ code: "FAMI-MI", facultyCode: "FAMI", name: "Bộ môn Toán - Tin" },
	{ code: "SEP-PH", facultyCode: "SEP", name: "Bộ môn Vật lý Kỹ thuật" },
	{ code: "SOFL-EN", facultyCode: "SOFL", name: "Bộ môn Tiếng Anh Khoa học Kỹ thuật" },
	{ code: "FED-ED", facultyCode: "FED", name: "Bộ môn Công nghệ Giáo dục" },
] as const;

const HUST_MAJORS = [
	{ code: "CNTT", facultyCode: "SOICT", name: "Công nghệ thông tin" },
	{ code: "KHMT", facultyCode: "SOICT", name: "Khoa học máy tính" },
	{ code: "KTMT", facultyCode: "SOICT", name: "Kỹ thuật máy tính" },
	{ code: "DIEN", facultyCode: "SEEE", name: "Kỹ thuật điện" },
	{ code: "DKTDH", facultyCode: "SEEE", name: "Kỹ thuật điều khiển và tự động hóa" },
	{ code: "DTVT", facultyCode: "SEEE", name: "Kỹ thuật điện tử - viễn thông" },
	{ code: "KTYSH", facultyCode: "SEEE", name: "Kỹ thuật y sinh" },
	{ code: "CK", facultyCode: "SME", name: "Kỹ thuật cơ khí" },
	{ code: "CDT", facultyCode: "SME", name: "Kỹ thuật cơ điện tử" },
	{ code: "OTO", facultyCode: "SME", name: "Kỹ thuật ô tô" },
	{ code: "HOA", facultyCode: "SCLS", name: "Kỹ thuật hóa học" },
	{ code: "TP", facultyCode: "SCLS", name: "Kỹ thuật thực phẩm" },
	{ code: "SH", facultyCode: "SCLS", name: "Kỹ thuật sinh học" },
	{ code: "MT", facultyCode: "SCLS", name: "Kỹ thuật môi trường" },
	{ code: "VL", facultyCode: "SMSE", name: "Kỹ thuật vật liệu" },
	{ code: "KTVM", facultyCode: "SMSE", name: "Kỹ thuật vi điện tử và công nghệ nano" },
	{ code: "QLCN", facultyCode: "SEM", name: "Quản lý công nghiệp" },
	{ code: "QTKD", facultyCode: "SEM", name: "Quản trị kinh doanh" },
	{ code: "TOANTIN", facultyCode: "FAMI", name: "Toán - Tin" },
	{ code: "VLKT", facultyCode: "SEP", name: "Vật lý kỹ thuật" },
	{ code: "NNKHKT", facultyCode: "SOFL", name: "Ngoại ngữ khoa học kỹ thuật" },
	{ code: "CNGD", facultyCode: "FED", name: "Công nghệ giáo dục" },
] as const;

const HUST_PROGRAMS = [
	{ code: "IT1", majorCode: "KHMT", name: "CNTT: Khoa học Máy tính", totalCredits: 132 },
	{ code: "IT2", majorCode: "KTMT", name: "CNTT: Kỹ thuật Máy tính", totalCredits: 132 },
	{ code: "IT-E7", majorCode: "CNTT", name: "Công nghệ Thông tin Global ICT", totalCredits: 132 },
	{ code: "IT-E10", majorCode: "CNTT", name: "Khoa học Dữ liệu và Trí tuệ nhân tạo", totalCredits: 132 },
	{ code: "IT-E15", majorCode: "CNTT", name: "An toàn không gian số - Cyber Security", totalCredits: 132 },
	{ code: "EE1", majorCode: "DIEN", name: "Kỹ thuật điện", totalCredits: 132 },
	{ code: "EE2", majorCode: "DKTDH", name: "Kỹ thuật điều khiển và Tự động hóa", totalCredits: 132 },
	{ code: "ET1", majorCode: "DTVT", name: "Kỹ thuật Điện tử - Viễn thông", totalCredits: 132 },
	{ code: "ET2", majorCode: "KTYSH", name: "Kỹ thuật Y sinh", totalCredits: 132 },
	{ code: "ME1", majorCode: "CDT", name: "Kỹ thuật Cơ điện tử", totalCredits: 132 },
	{ code: "ME2", majorCode: "CK", name: "Kỹ thuật Cơ khí", totalCredits: 132 },
	{ code: "TE1", majorCode: "OTO", name: "Kỹ thuật Ô tô", totalCredits: 132 },
	{ code: "CH1", majorCode: "HOA", name: "Kỹ thuật Hóa học", totalCredits: 132 },
	{ code: "BF1", majorCode: "SH", name: "Kỹ thuật Sinh học", totalCredits: 132 },
	{ code: "BF2", majorCode: "TP", name: "Kỹ thuật Thực phẩm", totalCredits: 132 },
	{ code: "MS1", majorCode: "VL", name: "Kỹ thuật Vật liệu", totalCredits: 132 },
	{ code: "MS2", majorCode: "KTVM", name: "Kỹ thuật Vi điện tử và Công nghệ nano", totalCredits: 132 },
	{ code: "EM2", majorCode: "QLCN", name: "Quản lý Công nghiệp", totalCredits: 128 },
	{ code: "EM3", majorCode: "QTKD", name: "Quản trị Kinh doanh", totalCredits: 128 },
	{ code: "MI1", majorCode: "TOANTIN", name: "Toán - Tin", totalCredits: 132 },
	{ code: "PH1", majorCode: "VLKT", name: "Vật lý Kỹ thuật", totalCredits: 132 },
	{ code: "FL1", majorCode: "NNKHKT", name: "Tiếng Anh KHKT và Công nghệ", totalCredits: 128 },
	{ code: "ED2", majorCode: "CNGD", name: "Công nghệ Giáo dục", totalCredits: 128 },
] as const;

const HUST_COURSES = [
	{
		code: "MI1110",
		departmentCode: "FAMI-MI",
		name: "Giải tích I",
		lectureCredits: 3,
		practiceCredits: 1,
		lectureSessions: 3,
		practiceSessions: 1,
	},
	{
		code: "MI1120",
		departmentCode: "FAMI-MI",
		name: "Giải tích II",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "MI1130",
		departmentCode: "FAMI-MI",
		name: "Đại số",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "PH1110",
		departmentCode: "SEP-PH",
		name: "Vật lý đại cương I",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "IT1110",
		departmentCode: "SOICT-CS",
		name: "Tin học đại cương",
		lectureCredits: 2,
		practiceCredits: 2,
		lectureSessions: 2,
		practiceSessions: 2,
	},
	{
		code: "IT3010",
		departmentCode: "SOICT-SE",
		name: "Nhập môn lập trình",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "IT3020",
		departmentCode: "SOICT-CS",
		name: "Cấu trúc dữ liệu và giải thuật",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "IT3030",
		departmentCode: "SOICT-SE",
		name: "Lập trình hướng đối tượng",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "IT3090",
		departmentCode: "SOICT-IS",
		name: "Cơ sở dữ liệu",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "IT3160",
		departmentCode: "SOICT-CS",
		name: "Nhập môn Trí tuệ nhân tạo",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "EE2020",
		departmentCode: "SEEE-EE",
		name: "Mạch điện",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "EE3280",
		departmentCode: "SEEE-AC",
		name: "Lý thuyết điều khiển tự động",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "ET2030",
		departmentCode: "SEEE-ET",
		name: "Điện tử tương tự",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "ME2010",
		departmentCode: "SME-ME",
		name: "Cơ học kỹ thuật",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "ME2030",
		departmentCode: "SME-MT",
		name: "Nguyên lý máy",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "CH2010",
		departmentCode: "SCLS-CH",
		name: "Hóa đại cương",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "BF2010",
		departmentCode: "SCLS-BF",
		name: "Công nghệ sinh học đại cương",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "MS2010",
		departmentCode: "SMSE-MS",
		name: "Khoa học vật liệu đại cương",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "EM2010",
		departmentCode: "SEM-IM",
		name: "Quản trị học đại cương",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
	{
		code: "FL1010",
		departmentCode: "SOFL-EN",
		name: "Tiếng Anh chuyên ngành kỹ thuật",
		lectureCredits: 2,
		practiceCredits: 1,
		lectureSessions: 2,
		practiceSessions: 1,
	},
] as const;

const HUST_PROGRAM_COURSES = [
	{ programCode: "IT1", courseCodes: ["MI1110", "MI1130", "PH1110", "IT1110"], semesterNo: 1 },
	{ programCode: "IT1", courseCodes: ["MI1120", "IT3010", "IT3020", "IT3030"], semesterNo: 2 },
	{ programCode: "IT1", courseCodes: ["IT3090", "IT3160"], semesterNo: 3 },
	{ programCode: "IT2", courseCodes: ["MI1110", "MI1130", "PH1110", "IT1110"], semesterNo: 1 },
	{ programCode: "IT2", courseCodes: ["IT3010", "IT3020", "EE2020", "ET2030"], semesterNo: 2 },
	{ programCode: "IT-E10", courseCodes: ["MI1110", "MI1120", "IT1110", "IT3010"], semesterNo: 1 },
	{ programCode: "IT-E10", courseCodes: ["IT3020", "IT3090", "IT3160"], semesterNo: 2 },
	{ programCode: "EE1", courseCodes: ["MI1110", "MI1130", "PH1110", "EE2020"], semesterNo: 1 },
	{ programCode: "EE2", courseCodes: ["MI1110", "PH1110", "EE2020", "EE3280"], semesterNo: 1 },
	{ programCode: "ET1", courseCodes: ["MI1110", "PH1110", "EE2020", "ET2030"], semesterNo: 1 },
	{ programCode: "ME1", courseCodes: ["MI1110", "PH1110", "ME2010", "ME2030"], semesterNo: 1 },
	{ programCode: "ME2", courseCodes: ["MI1110", "PH1110", "ME2010", "ME2030"], semesterNo: 1 },
	{ programCode: "CH1", courseCodes: ["MI1110", "PH1110", "CH2010"], semesterNo: 1 },
	{ programCode: "BF1", courseCodes: ["MI1110", "CH2010", "BF2010"], semesterNo: 1 },
	{ programCode: "MS1", courseCodes: ["MI1110", "PH1110", "MS2010"], semesterNo: 1 },
	{ programCode: "EM2", courseCodes: ["MI1110", "EM2010", "FL1010"], semesterNo: 1 },
	{ programCode: "MI1", courseCodes: ["MI1110", "MI1120", "MI1130", "IT1110"], semesterNo: 1 },
	{ programCode: "PH1", courseCodes: ["MI1110", "MI1130", "PH1110"], semesterNo: 1 },
] as const;

const HUST_PREREQUISITES = [
	{ courseCode: "MI1120", prerequisiteCode: "MI1110" },
	{ courseCode: "IT3020", prerequisiteCode: "IT3010" },
	{ courseCode: "IT3030", prerequisiteCode: "IT3010" },
	{ courseCode: "IT3090", prerequisiteCode: "IT3020" },
	{ courseCode: "IT3160", prerequisiteCode: "IT3020" },
	{ courseCode: "EE3280", prerequisiteCode: "EE2020" },
	{ courseCode: "ME2030", prerequisiteCode: "ME2010" },
] as const;

const HUST_BUILDINGS = ["B1", "B7", "C1", "C2", "C3", "C7", "C9", "C10", "D3", "D5", "D8", "TQB"] as const;

const HUST_CLASSROOMS = [
	{ code: "B1-505", buildingCode: "B1", capacity: 80, type: "lecture" },
	{ code: "B1-702", buildingCode: "B1", capacity: 60, type: "lab" },
	{ code: "C1-201", buildingCode: "C1", capacity: 120, type: "lecture" },
	{ code: "C2-301", buildingCode: "C2", capacity: 90, type: "lecture" },
	{ code: "C3-204", buildingCode: "C3", capacity: 70, type: "lecture" },
	{ code: "C7-614M", buildingCode: "C7", capacity: 60, type: "lecture" },
	{ code: "C7-E605", buildingCode: "C7", capacity: 80, type: "lecture" },
	{ code: "C9-303", buildingCode: "C9", capacity: 70, type: "lecture" },
	{ code: "C10-116", buildingCode: "C10", capacity: 60, type: "lab" },
	{ code: "D3-106", buildingCode: "D3", capacity: 80, type: "lecture" },
	{ code: "D3-306", buildingCode: "D3", capacity: 80, type: "lecture" },
	{ code: "D5-101", buildingCode: "D5", capacity: 150, type: "lecture" },
	{ code: "D8-706", buildingCode: "D8", capacity: 60, type: "lecture" },
	{ code: "TQB-401", buildingCode: "TQB", capacity: 100, type: "seminar" },
] as const;

const HUST_LECTURERS = [
	{ name: "Nguyễn Minh An", departmentCode: "SOICT-CS", email: "nguyen.minh.an@hust.edu.vn", phone: "0901000001", position: "Giảng viên" },
	{ name: "Trần Hà Linh", departmentCode: "SOICT-SE", email: "tran.ha.linh@hust.edu.vn", phone: "0901000002", position: "Giảng viên" },
	{ name: "Phạm Đức Anh", departmentCode: "SEEE-EE", email: "pham.duc.anh@hust.edu.vn", phone: "0901000003", position: "Giảng viên chính" },
	{ name: "Lê Thu Trang", departmentCode: "SEEE-AC", email: "le.thu.trang@hust.edu.vn", phone: "0901000004", position: "Giảng viên" },
	{ name: "Vũ Quang Huy", departmentCode: "SME-ME", email: "vu.quang.huy@hust.edu.vn", phone: "0901000005", position: "Giảng viên chính" },
	{ name: "Đỗ Mai Phương", departmentCode: "SCLS-CH", email: "do.mai.phuong@hust.edu.vn", phone: "0901000006", position: "Giảng viên" },
	{ name: "Hoàng Bảo Châu", departmentCode: "SMSE-MS", email: "hoang.bao.chau@hust.edu.vn", phone: "0901000007", position: "Giảng viên" },
	{ name: "Bùi Khánh Nam", departmentCode: "SEM-IM", email: "bui.khanh.nam@hust.edu.vn", phone: "0901000008", position: "Giảng viên" },
	{ name: "Đặng Thu Hương", departmentCode: "FAMI-MI", email: "dang.thu.huong@hust.edu.vn", phone: "0901000009", position: "Giảng viên chính" },
	{ name: "Phan Gia Bảo", departmentCode: "SEP-PH", email: "phan.gia.bao@hust.edu.vn", phone: "0901000010", position: "Giảng viên" },
] as const;

const HUST_STUDENT_CLASSES = [
	{ code: "IT1-2024-01", name: "Khoa học Máy tính 01 - K69", facultyCode: "SOICT", majorCode: "KHMT", programCode: "IT1" },
	{ code: "IT2-2024-01", name: "Kỹ thuật Máy tính 01 - K69", facultyCode: "SOICT", majorCode: "KTMT", programCode: "IT2" },
	{ code: "EE2-2024-01", name: "Điều khiển Tự động hóa 01 - K69", facultyCode: "SEEE", majorCode: "DKTDH", programCode: "EE2" },
	{ code: "ME1-2024-01", name: "Cơ điện tử 01 - K69", facultyCode: "SME", majorCode: "CDT", programCode: "ME1" },
	{ code: "CH1-2024-01", name: "Kỹ thuật Hóa học 01 - K69", facultyCode: "SCLS", majorCode: "HOA", programCode: "CH1" },
] as const;

const HUST_STUDENTS = [
	{ studentCode: "20240001", name: "Nguyễn Hải Đăng", classCode: "IT1-2024-01", programCode: "IT1", email: "20240001@student.hust.edu.vn", phone: "0912000001" },
	{ studentCode: "20240002", name: "Trần Minh Khôi", classCode: "IT1-2024-01", programCode: "IT1", email: "20240002@student.hust.edu.vn", phone: "0912000002" },
	{ studentCode: "20240003", name: "Lê Phương Anh", classCode: "IT2-2024-01", programCode: "IT2", email: "20240003@student.hust.edu.vn", phone: "0912000003" },
	{ studentCode: "20240004", name: "Phạm Hoàng Nam", classCode: "IT2-2024-01", programCode: "IT2", email: "20240004@student.hust.edu.vn", phone: "0912000004" },
	{ studentCode: "20240005", name: "Đỗ Thu Hà", classCode: "EE2-2024-01", programCode: "EE2", email: "20240005@student.hust.edu.vn", phone: "0912000005" },
	{ studentCode: "20240006", name: "Vũ Đức Huy", classCode: "EE2-2024-01", programCode: "EE2", email: "20240006@student.hust.edu.vn", phone: "0912000006" },
	{ studentCode: "20240007", name: "Bùi Minh Quân", classCode: "ME1-2024-01", programCode: "ME1", email: "20240007@student.hust.edu.vn", phone: "0912000007" },
	{ studentCode: "20240008", name: "Đặng Thảo Nguyên", classCode: "ME1-2024-01", programCode: "ME1", email: "20240008@student.hust.edu.vn", phone: "0912000008" },
	{ studentCode: "20240009", name: "Hoàng Khánh Linh", classCode: "CH1-2024-01", programCode: "CH1", email: "20240009@student.hust.edu.vn", phone: "0912000009" },
	{ studentCode: "20240010", name: "Phan Anh Tuấn", classCode: "CH1-2024-01", programCode: "CH1", email: "20240010@student.hust.edu.vn", phone: "0912000010" },
] as const;

const HUST_ACADEMIC_YEARS = [
	{ code: "2024-2025", name: "Năm học 2024-2025", startDate: "2024-08-26", endDate: "2025-08-17", status: "archived" },
	{ code: "2025-2026", name: "Năm học 2025-2026", startDate: "2025-08-25", endDate: "2026-08-16", status: "active" },
] as const;

const HUST_SEMESTERS = [
	{ code: "2025-2026-HK1", academicYearCode: "2025-2026", name: "Học kỳ 1 năm học 2025-2026", type: "regular", startDate: "2025-08-25", endDate: "2026-01-11", status: "active" },
	{ code: "2025-2026-HK2", academicYearCode: "2025-2026", name: "Học kỳ 2 năm học 2025-2026", type: "regular", startDate: "2026-01-19", endDate: "2026-06-07", status: "draft" },
] as const;

const HUST_HOLIDAYS = [
	{ academicYearCode: "2025-2026", semesterCode: "2025-2026-HK1", name: "Quốc khánh", type: "national_holiday", startDate: "2025-09-02", endDate: "2025-09-02" },
	{ academicYearCode: "2025-2026", semesterCode: "2025-2026-HK2", name: "Tết Nguyên đán", type: "national_holiday", startDate: "2026-02-16", endDate: "2026-02-22" },
	{ academicYearCode: "2025-2026", semesterCode: "2025-2026-HK2", name: "Giỗ Tổ Hùng Vương", type: "national_holiday", startDate: "2026-04-26", endDate: "2026-04-26" },
	{ academicYearCode: "2025-2026", semesterCode: "2025-2026-HK2", name: "Ngày Giải phóng miền Nam và Quốc tế Lao động", type: "national_holiday", startDate: "2026-04-30", endDate: "2026-05-01" },
] as const;

const HUST_STUDY_SHIFTS = [
	{ code: "MORNING", name: "Ca sáng", startTime: "06:45", endTime: "11:55" },
	{ code: "AFTERNOON", name: "Ca chiều", startTime: "12:30", endTime: "17:40" },
	{ code: "EVENING", name: "Ca tối", startTime: "18:00", endTime: "21:10" },
] as const;

const HUST_TIME_SLOTS = [
	{ code: "S1-2", studyShiftCode: "MORNING", name: "Tiết 1-2", startTime: "06:45", endTime: "08:15", sortOrder: 1 },
	{ code: "S3-4", studyShiftCode: "MORNING", name: "Tiết 3-4", startTime: "08:25", endTime: "09:55", sortOrder: 2 },
	{ code: "S5-6", studyShiftCode: "MORNING", name: "Tiết 5-6", startTime: "10:05", endTime: "11:35", sortOrder: 3 },
	{ code: "C7-8", studyShiftCode: "AFTERNOON", name: "Tiết 7-8", startTime: "12:30", endTime: "14:00", sortOrder: 4 },
	{ code: "C9-10", studyShiftCode: "AFTERNOON", name: "Tiết 9-10", startTime: "14:10", endTime: "15:40", sortOrder: 5 },
	{ code: "C11-12", studyShiftCode: "AFTERNOON", name: "Tiết 11-12", startTime: "15:50", endTime: "17:20", sortOrder: 6 },
	{ code: "T13-15", studyShiftCode: "EVENING", name: "Tiết 13-15", startTime: "18:00", endTime: "20:15", sortOrder: 7 },
] as const;

async function upsertRole(data: (typeof ROLES)[number]) {
	const [existing] = await db
		.select()
		.from(role)
		.where(eq(role.role_name, data.role_name));

	if (existing) {
		console.log(`  [SKIP] Role "${data.role_name}" already exists (id=${existing.id})`);
		return existing;
	}

	const [inserted] = await db.insert(role).values(data).returning();

	if (!inserted) {
		throw new Error(`Failed to create role "${data.role_name}"`);
	}

	console.log(`  [OK]   Created role "${inserted.role_name}" (id=${inserted.id})`);
	return inserted;
}

async function upsertPermission(data: { key: string; name: string; bitValue: number }) {
	const [existing] = await db
		.select()
		.from(permission)
		.where(eq(permission.key, data.key));

	if (existing) {
		await db
			.update(permission)
			.set({
				name: data.name,
				bitValue: data.bitValue,
			})
			.where(eq(permission.id, existing.id));

		console.log(`  [SYNC] Updated permission "${data.key}" (id=${existing.id})`);
		return existing;
	}

	const [inserted] = await db.insert(permission).values(data).returning();

	if (!inserted) {
		throw new Error(`Failed to create permission "${data.key}"`);
	}

	console.log(`  [OK]   Created permission "${inserted.key}" (id=${inserted.id})`);
	return inserted;
}

async function grantAdminFullPermissions(adminRoleId: number) {
	const permissions = await db.select().from(permission);

	for (const item of permissions) {
		const [existing] = await db
			.select()
			.from(rolePermission)
			.where(
				and(
					eq(rolePermission.roleId, adminRoleId),
					eq(rolePermission.permissionId, item.id),
				),
			);

		if (existing) {
			await db
				.update(rolePermission)
				.set({ value: item.bitValue })
				.where(
					and(
						eq(rolePermission.roleId, adminRoleId),
						eq(rolePermission.permissionId, item.id),
					),
				);
			continue;
		}

		await db.insert(rolePermission).values({
			roleId: adminRoleId,
			permissionId: item.id,
			value: item.bitValue,
		});
	}

	console.log(`  [OK]   Granted full permissions to admin role id=${adminRoleId}`);
}

async function upsertUser(data: (typeof SEED_USERS)[number], roleId: number) {
	const [existingByEmail] = await db
		.select()
		.from(user)
		.where(eq(user.email, data.email));

	const [existingByUsername] = await db
		.select()
		.from(user)
		.where(eq(user.username, data.username));

	const existing = existingByEmail ?? existingByUsername;
	const hashedPassword = await hash(data.password, 10);

	let userId: number;

	if (existing) {
		await db
			.update(user)
			.set({ hashedPassword, status: "active" })
			.where(eq(user.id, existing.id));

		console.log(`  [SYNC] Updated user "${data.email}" and kept it active (id=${existing.id})`);
		userId = existing.id;
	} else {
		const [inserted] = await db
			.insert(user)
			.values({
				username: data.username,
				email: data.email,
				hashedPassword,
				status: "active",
			})
			.returning();

		if (!inserted) {
			throw new Error(`Failed to create user "${data.email}"`);
		}

		console.log(`  [OK]   Created user "${inserted.email}" (id=${inserted.id})`);
		userId = inserted.id;
	}

	const [existingUserRole] = await db
		.select()
		.from(userRole)
		.where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));

	if (existingUserRole) {
		console.log(`  [SKIP] User id=${userId} already has role id=${roleId}`);
		return;
	}

	await db.insert(userRole).values({ userId, roleId });
	console.log(`  [OK]   Assigned role id=${roleId} to user id=${userId}`);
}

async function upsertFaculty(data: {
	code: string;
	name: string;
	description: string;
	status: string;
}) {
	const [existing] = await db.select().from(faculty).where(eq(faculty.code, data.code));

	if (existing) {
		await db.update(faculty).set(data).where(eq(faculty.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(faculty).values(data).returning();
	if (!inserted) throw new Error(`Failed to create faculty "${data.code}"`);
	return inserted;
}

async function upsertDepartment(
	data: {
		code: string;
		name: string;
		facultyId: number;
		description: string;
		status: string;
	},
) {
	const [existing] = await db
		.select()
		.from(department)
		.where(eq(department.code, data.code));

	if (existing) {
		await db.update(department).set(data).where(eq(department.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(department).values(data).returning();
	if (!inserted) throw new Error(`Failed to create department "${data.code}"`);
	return inserted;
}

async function upsertMajor(
	data: {
		code: string;
		name: string;
		facultyId: number;
		description: string;
		status: string;
	},
) {
	const [existing] = await db.select().from(major).where(eq(major.code, data.code));

	if (existing) {
		await db.update(major).set(data).where(eq(major.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(major).values(data).returning();
	if (!inserted) throw new Error(`Failed to create major "${data.code}"`);
	return inserted;
}

async function upsertProgram(
	data: {
		code: string;
		name: string;
		totalCredits: number;
		majorId: number;
		academicYear: string;
		version: number;
		status: string;
	},
) {
	const [existing] = await db.select().from(program).where(eq(program.code, data.code));

	if (existing) {
		await db.update(program).set(data).where(eq(program.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(program).values(data).returning();
	if (!inserted) throw new Error(`Failed to create program "${data.code}"`);
	return inserted;
}

async function upsertCourse(
	data: {
		code: string;
		name: string;
		lectureCredits: number;
		practiceCredits: number;
		lectureSessions: number;
		practiceSessions: number;
		departmentId: number;
		description: string;
		status: string;
	},
) {
	const [existingOriginalCourse] = await db
		.select()
		.from(originalCourse)
		.where(eq(originalCourse.code, data.code));

	const originalCourseData = {
		code: data.code,
		name: data.name,
		lectureCredits: data.lectureCredits,
		practiceCredits: data.practiceCredits,
		lectureSessions: data.lectureSessions,
		practiceSessions: data.practiceSessions,
		departmentId: data.departmentId,
		description: data.description,
		status: data.status,
	};

	const originalCourseRow = existingOriginalCourse
		? (
				await db
					.update(originalCourse)
					.set(originalCourseData)
					.where(eq(originalCourse.id, existingOriginalCourse.id))
					.returning()
			)[0]
		: (
				await db
					.insert(originalCourse)
					.values(originalCourseData)
					.returning()
			)[0];

	if (!originalCourseRow) {
		throw new Error(`Failed to sync original course "${data.code}"`);
	}

	const courseData = {
		...data,
		originalCourseId: originalCourseRow.id,
	};
	const [existing] = await db.select().from(course).where(eq(course.code, data.code));

	if (existing) {
		await db.update(course).set(courseData).where(eq(course.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(course).values(courseData).returning();
	if (!inserted) throw new Error(`Failed to create course "${data.code}"`);
	return inserted;
}

async function upsertCoursePrerequisite(courseId: number, prerequisiteCourseId: number) {
	const [existing] = await db
		.select()
		.from(coursePrerequisite)
		.where(
			and(
				eq(coursePrerequisite.courseId, courseId),
				eq(coursePrerequisite.prerequisiteCourseId, prerequisiteCourseId),
			),
		);

	if (existing) return existing;

	const [inserted] = await db
		.insert(coursePrerequisite)
		.values({ courseId, prerequisiteCourseId })
		.returning();
	if (!inserted) throw new Error("Failed to create course prerequisite");
	return inserted;
}

async function upsertProgramCourse(data: {
	programId: number;
	courseId: number;
	semesterNo: number;
	isRequired: number;
}) {
	const [existing] = await db
		.select()
		.from(programCourse)
		.where(
			and(
				eq(programCourse.programId, data.programId),
				eq(programCourse.courseId, data.courseId),
			),
		);

	if (existing) {
		await db.update(programCourse).set(data).where(eq(programCourse.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(programCourse).values(data).returning();
	if (!inserted) throw new Error("Failed to create program course");
	return inserted;
}

async function upsertBuilding(code: string) {
	const [existing] = await db.select().from(building).where(eq(building.code, code));

	if (existing) {
		await db.update(building).set({ status: "active" }).where(eq(building.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(building).values({ code, status: "active" }).returning();
	if (!inserted) throw new Error(`Failed to create building "${code}"`);
	return inserted;
}

async function upsertClassroom(
	data: {
		code: string;
		buildingId: number;
		capacity: number;
		type: string;
		status: string;
	},
) {
	const [existing] = await db.select().from(classroom).where(eq(classroom.code, data.code));

	if (existing) {
		await db.update(classroom).set(data).where(eq(classroom.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(classroom).values(data).returning();
	if (!inserted) throw new Error(`Failed to create classroom "${data.code}"`);
	return inserted;
}

async function upsertLecturer(
	data: {
		name: string;
		dob: string;
		email: string;
		phone: string;
		departmentId: number;
		position: string;
		status: string;
	},
) {
	const [existing] = await db.select().from(lecturer).where(eq(lecturer.email, data.email));

	if (existing) {
		await db.update(lecturer).set(data).where(eq(lecturer.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(lecturer).values(data).returning();
	if (!inserted) throw new Error(`Failed to create lecturer "${data.email}"`);
	return inserted;
}

async function upsertStudentClass(
	data: {
		code: string;
		name: string;
		facultyId: number;
		majorId: number;
		programId: number;
	},
) {
	const [existing] = await db
		.select()
		.from(studentClass)
		.where(eq(studentClass.code, data.code));

	if (existing) {
		await db.update(studentClass).set(data).where(eq(studentClass.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(studentClass).values(data).returning();
	if (!inserted) throw new Error(`Failed to create student class "${data.code}"`);
	return inserted;
}

async function upsertStudent(
	data: {
		studentCode: string;
		name: string;
		email: string;
		phone: string;
		classId: number;
		programId: number;
		dob: Date;
		status: string;
	},
) {
	const [existing] = await db
		.select()
		.from(student)
		.where(eq(student.studentCode, data.studentCode));

	if (existing) {
		await db.update(student).set(data).where(eq(student.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(student).values(data).returning();
	if (!inserted) throw new Error(`Failed to create student "${data.studentCode}"`);
	return inserted;
}

async function upsertAcademicYear(data: {
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	status: string;
}) {
	const [existing] = await db
		.select()
		.from(academicYear)
		.where(eq(academicYear.code, data.code));

	if (existing) {
		await db.update(academicYear).set(data).where(eq(academicYear.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(academicYear).values(data).returning();
	if (!inserted) throw new Error(`Failed to create academic year "${data.code}"`);
	return inserted;
}

async function upsertSemester(
	data: {
		code: string;
		name: string;
		type: string;
		startDate: string;
		endDate: string;
		status: string;
		academicYearId: number;
	},
) {
	const [existing] = await db.select().from(semester).where(eq(semester.code, data.code));

	if (existing) {
		await db.update(semester).set(data).where(eq(semester.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(semester).values(data).returning();
	if (!inserted) throw new Error(`Failed to create semester "${data.code}"`);
	return inserted;
}

async function upsertSemesterWeek(data: {
	semesterId: number;
	weekNumber: number;
	startDate: string;
	endDate: string;
	isTeachingWeek: boolean;
	note: string;
}) {
	const [existing] = await db
		.select()
		.from(semesterWeek)
		.where(
			and(
				eq(semesterWeek.semesterId, data.semesterId),
				eq(semesterWeek.weekNumber, data.weekNumber),
			),
		);

	if (existing) {
		await db.update(semesterWeek).set(data).where(eq(semesterWeek.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(semesterWeek).values(data).returning();
	if (!inserted) throw new Error("Failed to create semester week");
	return inserted;
}

async function upsertAcademicHoliday(data: {
	academicYearId: number;
	semesterId: number;
	name: string;
	type: string;
	startDate: string;
	endDate: string;
	status: string;
}) {
	const [existing] = await db
		.select()
		.from(academicHoliday)
		.where(
			and(
				eq(academicHoliday.academicYearId, data.academicYearId),
				eq(academicHoliday.name, data.name),
			),
		);

	if (existing) {
		await db.update(academicHoliday).set(data).where(eq(academicHoliday.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(academicHoliday).values(data).returning();
	if (!inserted) throw new Error(`Failed to create holiday "${data.name}"`);
	return inserted;
}

async function upsertStudyShift(data: {
	code: string;
	name: string;
	startTime: string;
	endTime: string;
}) {
	const [existing] = await db
		.select()
		.from(studyShift)
		.where(eq(studyShift.code, data.code));

	if (existing) {
		await db.update(studyShift).set(data).where(eq(studyShift.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(studyShift).values(data).returning();
	if (!inserted) throw new Error(`Failed to create study shift "${data.code}"`);
	return inserted;
}

async function upsertTimeSlot(
	data: {
		code: string;
		name: string;
		startTime: string;
		endTime: string;
		sortOrder: number;
		studyShiftId: number;
		status: string;
	},
) {
	const [existing] = await db.select().from(timeSlot).where(eq(timeSlot.code, data.code));

	if (existing) {
		await db.update(timeSlot).set(data).where(eq(timeSlot.id, existing.id));
		return existing;
	}

	const [inserted] = await db.insert(timeSlot).values(data).returning();
	if (!inserted) throw new Error(`Failed to create time slot "${data.code}"`);
	return inserted;
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function toDateOnly(date: Date) {
	return date.toISOString().slice(0, 10);
}

async function seedHustAcademicData() {
	console.log("\n-- HUST Academic Units --------------------");
	const facultyMap: Record<string, number> = {};
	for (const item of HUST_FACULTIES) {
		const row = await upsertFaculty({ ...item, status: "active" });
		facultyMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_FACULTIES.length} faculties/schools`);

	const departmentMap: Record<string, number> = {};
	for (const item of HUST_DEPARTMENTS) {
		const facultyId = facultyMap[item.facultyCode];
		if (!facultyId) throw new Error(`Missing faculty "${item.facultyCode}"`);

		const row = await upsertDepartment({
			code: item.code,
			name: item.name,
			facultyId,
			description: `Bộ môn thuộc ${item.facultyCode} - dữ liệu mô phỏng theo cấu trúc HUST.`,
			status: "active",
		});
		departmentMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_DEPARTMENTS.length} departments`);

	const majorMap: Record<string, number> = {};
	for (const item of HUST_MAJORS) {
		const facultyId = facultyMap[item.facultyCode];
		if (!facultyId) throw new Error(`Missing faculty "${item.facultyCode}"`);

		const row = await upsertMajor({
			code: item.code,
			name: item.name,
			facultyId,
			description: `Ngành/chuyên ngành tham chiếu nhóm chương trình tuyển sinh HUST.`,
			status: "active",
		});
		majorMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_MAJORS.length} majors`);

	const programMap: Record<string, number> = {};
	for (const item of HUST_PROGRAMS) {
		const majorId = majorMap[item.majorCode];
		if (!majorId) throw new Error(`Missing major "${item.majorCode}"`);

		const row = await upsertProgram({
			code: item.code,
			name: item.name,
			majorId,
			academicYear: "2026",
			version: 1,
			totalCredits: item.totalCredits,
			status: "active",
		});
		programMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_PROGRAMS.length} programs`);

	const courseMap: Record<string, number> = {};
	for (const item of HUST_COURSES) {
		const departmentId = departmentMap[item.departmentCode];
		if (!departmentId) throw new Error(`Missing department "${item.departmentCode}"`);

		const row = await upsertCourse({
			code: item.code,
			name: item.name,
			lectureCredits: item.lectureCredits,
			practiceCredits: item.practiceCredits,
			departmentId,
			lectureSessions: item.lectureSessions,
			practiceSessions: item.practiceSessions,
			description: `Học phần mẫu theo phong cách mã học phần HUST.`,
			status: "active",
		});
		courseMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_COURSES.length} courses`);

	for (const item of HUST_PREREQUISITES) {
		const courseId = courseMap[item.courseCode];
		const prerequisiteCourseId = courseMap[item.prerequisiteCode];
		if (!courseId || !prerequisiteCourseId) {
			throw new Error(`Missing prerequisite pair "${item.courseCode}" -> "${item.prerequisiteCode}"`);
		}

		await upsertCoursePrerequisite(courseId, prerequisiteCourseId);
	}
	console.log(`  [OK]   Synced ${HUST_PREREQUISITES.length} course prerequisites`);

	for (const item of HUST_PROGRAM_COURSES) {
		const programId = programMap[item.programCode];
		if (!programId) throw new Error(`Missing program "${item.programCode}"`);

		for (const courseCode of item.courseCodes) {
			const courseId = courseMap[courseCode];
			if (!courseId) throw new Error(`Missing course "${courseCode}"`);

			await upsertProgramCourse({
				programId,
				courseId,
				semesterNo: item.semesterNo,
				isRequired: 1,
			});
		}
	}
	console.log(`  [OK]   Synced program-course mappings`);

	return { facultyMap, departmentMap, majorMap, programMap };
}

async function seedHustFacilities() {
	console.log("\n-- HUST Facilities ------------------------");
	const buildingMap: Record<string, number> = {};
	for (const code of HUST_BUILDINGS) {
		const row = await upsertBuilding(code);
		buildingMap[code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_BUILDINGS.length} buildings`);

	for (const item of HUST_CLASSROOMS) {
		const buildingId = buildingMap[item.buildingCode];
		if (!buildingId) throw new Error(`Missing building "${item.buildingCode}"`);

		await upsertClassroom({
			code: item.code,
			buildingId,
			capacity: item.capacity,
			type: item.type,
			status: "active",
		});
	}
	console.log(`  [OK]   Synced ${HUST_CLASSROOMS.length} classrooms`);
}

async function seedHustPeopleAndClasses(context: {
	departmentMap: Record<string, number>;
	facultyMap: Record<string, number>;
	majorMap: Record<string, number>;
	programMap: Record<string, number>;
}) {
	console.log("\n-- HUST Lecturers, Classes, Students -------");
	for (const item of HUST_LECTURERS) {
		const departmentId = context.departmentMap[item.departmentCode];
		if (!departmentId) throw new Error(`Missing department "${item.departmentCode}"`);

		await upsertLecturer({
			name: item.name,
			dob: "1988-01-01",
			email: item.email,
			phone: item.phone,
			departmentId,
			position: item.position,
			status: "active",
		});
	}
	console.log(`  [OK]   Synced ${HUST_LECTURERS.length} synthetic lecturers`);

	const classMap: Record<string, number> = {};
	for (const item of HUST_STUDENT_CLASSES) {
		const facultyId = context.facultyMap[item.facultyCode];
		const majorId = context.majorMap[item.majorCode];
		const programId = context.programMap[item.programCode];
		if (!facultyId || !majorId || !programId) {
			throw new Error(`Missing class dependency for "${item.code}"`);
		}

		const row = await upsertStudentClass({
			code: item.code,
			name: item.name,
			facultyId,
			majorId,
			programId,
		});
		classMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_STUDENT_CLASSES.length} student classes`);

	for (const [index, item] of HUST_STUDENTS.entries()) {
		const classId = classMap[item.classCode];
		const programId = context.programMap[item.programCode];
		if (!classId || !programId) throw new Error(`Missing student dependency for "${item.studentCode}"`);

		await upsertStudent({
			studentCode: item.studentCode,
			name: item.name,
			dob: new Date(2006, index % 12, (index % 27) + 1),
			email: item.email,
			phone: item.phone,
			classId,
			programId,
			status: "active",
		});
	}
	console.log(`  [OK]   Synced ${HUST_STUDENTS.length} synthetic students`);
}

async function seedHustCalendarAndTime() {
	console.log("\n-- HUST Calendar & Time Slots -------------");
	const academicYearMap: Record<string, number> = {};
	for (const item of HUST_ACADEMIC_YEARS) {
		const row = await upsertAcademicYear(item);
		academicYearMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_ACADEMIC_YEARS.length} academic years`);

	const semesterMap: Record<string, number> = {};
	for (const item of HUST_SEMESTERS) {
		const academicYearId = academicYearMap[item.academicYearCode];
		if (!academicYearId) throw new Error(`Missing academic year "${item.academicYearCode}"`);

		const row = await upsertSemester({
			code: item.code,
			name: item.name,
			type: item.type,
			startDate: item.startDate,
			endDate: item.endDate,
			status: item.status,
			academicYearId,
		});
		semesterMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_SEMESTERS.length} semesters`);

	for (const item of HUST_SEMESTERS) {
		const semesterId = semesterMap[item.code];
		if (!semesterId) throw new Error(`Missing semester "${item.code}"`);

		const start = new Date(`${item.startDate}T00:00:00.000Z`);
		for (let weekNumber = 1; weekNumber <= 20; weekNumber += 1) {
			const weekStart = addDays(start, (weekNumber - 1) * 7);
			const weekEnd = addDays(weekStart, 6);
			const isTeachingWeek = item.code.endsWith("HK1")
				? weekNumber <= 16
				: weekNumber <= 7 || weekNumber >= 9;

			await upsertSemesterWeek({
				semesterId,
				weekNumber,
				startDate: toDateOnly(weekStart),
				endDate: toDateOnly(weekEnd),
				isTeachingWeek,
				note: isTeachingWeek ? "Tuần học" : "Tuần thi/nghỉ giữa kỳ",
			});
		}
	}
	console.log(`  [OK]   Synced semester weeks`);

	for (const item of HUST_HOLIDAYS) {
		const academicYearId = academicYearMap[item.academicYearCode];
		const semesterId = semesterMap[item.semesterCode];
		if (!academicYearId || !semesterId) throw new Error(`Missing holiday dependency "${item.name}"`);

		await upsertAcademicHoliday({
			academicYearId,
			semesterId,
			name: item.name,
			type: item.type,
			startDate: item.startDate,
			endDate: item.endDate,
			status: "active",
		});
	}
	console.log(`  [OK]   Synced ${HUST_HOLIDAYS.length} holidays`);

	const studyShiftMap: Record<string, number> = {};
	for (const item of HUST_STUDY_SHIFTS) {
		const row = await upsertStudyShift(item);
		studyShiftMap[item.code] = row.id;
	}
	console.log(`  [OK]   Synced ${HUST_STUDY_SHIFTS.length} study shifts`);

	for (const item of HUST_TIME_SLOTS) {
		const studyShiftId = studyShiftMap[item.studyShiftCode];
		if (!studyShiftId) throw new Error(`Missing study shift "${item.studyShiftCode}"`);

		await upsertTimeSlot({
			code: item.code,
			name: item.name,
			startTime: item.startTime,
			endTime: item.endTime,
			sortOrder: item.sortOrder,
			studyShiftId,
			status: "active",
		});
	}
	console.log(`  [OK]   Synced ${HUST_TIME_SLOTS.length} time slots`);
}

async function main() {
	console.log("\nStarting seed...\n");

	console.log("-- Roles ----------------------------------");
	const roleMap: Record<string, number> = {};

	for (const item of ROLES) {
		const inserted = await upsertRole(item);
		roleMap[inserted.role_name] = inserted.id;
	}

	console.log("\n-- Permissions ----------------------------");
	for (const item of [
		...SEED_PERMISSIONS,
		...ACADEMIC_CALENDAR_PERMISSIONS,
		...FACILITY_PERMISSIONS,
	]) {
		await upsertPermission(item);
	}

	const adminRoleId = roleMap.admin;

	if (!adminRoleId) {
		throw new Error('Missing role "admin" for permission grants');
	}

	console.log("\n-- Role Permissions -----------------------");
	await grantAdminFullPermissions(adminRoleId);

	console.log("\n-- Users ----------------------------------");
	for (const item of SEED_USERS) {
		const roleId = roleMap[item.roleName];

		if (!roleId) {
			console.error(`  [ERR]  Missing role "${item.roleName}" for user "${item.email}"`);
			continue;
		}

		await upsertUser(item, roleId);
	}

	const academicContext = await seedHustAcademicData();
	await seedHustFacilities();
	await seedHustPeopleAndClasses(academicContext);
	await seedHustCalendarAndTime();

	console.log("\nSeed completed.\n");
	console.log("Seed accounts:");
	console.log("  admin@tsms.edu.vn   / Admin@123456   (admin)");
	console.log("  dean@tsms.edu.vn    / Dean@123456    (dean)");
	console.log("  teacher@tsms.edu.vn / Teacher@123456 (teacher)");
	console.log();

	process.exit(0);
}

main().catch((error) => {
	console.error("\nSeed failed:", error);
	process.exit(1);
});
