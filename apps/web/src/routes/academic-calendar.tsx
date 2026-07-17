import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@tsms/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import { CalendarDays, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

export const Route = createFileRoute("/academic-calendar")({
	component: AcademicCalendarRoute,
});

type SemesterStatus = "draft" | "open" | "locked" | "archived";
type SemesterType = "regular" | "summer";
type HolidayType = "holiday" | "event" | "exam" | "makeup" | "break" | "other";
type HolidayStatus = "active" | "inactive";
type TabKey = "semesters" | "weeks" | "holidays";

type AcademicYearOption = {
	id: number;
	code: string;
	name: string;
	status: string;
};

type SemesterItem = {
	id: number;
	academicYearId: number;
	code: string;
	name: string;
	type: SemesterType;
	startDate: string;
	endDate: string;
	status: SemesterStatus;
};

type SemesterOption = {
	id: number;
	academicYearId: number;
	code: string;
	name: string;
	type: SemesterType;
	status: SemesterStatus;
};

type SemesterFormState = {
	semesterId: number;
	academicYearId: number;
	code: string;
	name: string;
	type: SemesterType;
	startDate: string;
	endDate: string;
	status: SemesterStatus;
};

type SemesterWeekItem = {
	id: number;
	semesterId: number;
	weekNumber: number;
	startDate: string;
	endDate: string;
	isTeachingWeek: boolean;
	note: string;
};

type AcademicHolidayItem = {
	id: number;
	academicYearId: number;
	semesterId: number | null;
	name: string;
	type: HolidayType;
	startDate: string;
	endDate: string;
	status: HolidayStatus;
};

type HolidayFormState = {
	holidayId: number;
	academicYearId: number;
	semesterId: number;
	name: string;
	type: HolidayType;
	startDate: string;
	endDate: string;
	status: HolidayStatus;
};

const EMPTY_SEMESTER_FORM: SemesterFormState = {
	semesterId: 0,
	academicYearId: 0,
	code: "",
	name: "",
	type: "regular",
	startDate: "",
	endDate: "",
	status: "draft",
};

const EMPTY_HOLIDAY_FORM: HolidayFormState = {
	holidayId: 0,
	academicYearId: 0,
	semesterId: 0,
	name: "",
	type: "holiday",
	startDate: "",
	endDate: "",
	status: "active",
};

const SEMESTER_STATUS_LABEL: Record<SemesterStatus, string> = {
	draft: "Nháp",
	open: "Đang mở",
	locked: "Đã khóa",
	archived: "Lưu trữ",
};

const SEMESTER_TYPE_LABEL: Record<SemesterType, string> = {
	regular: "Chính quy",
	summer: "Học kỳ hè",
};

const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
	holiday: "Nghỉ lễ",
	event: "Sự kiện",
	exam: "Thi",
	makeup: "Học bù",
	break: "Nghỉ giữa kỳ",
	other: "Khác",
};

const HOLIDAY_STATUS_LABEL: Record<HolidayStatus, string> = {
	active: "Đang áp dụng",
	inactive: "Ngừng áp dụng",
};

function AcademicCalendarRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});

	useEffect(() => {
		if (meQuery.isError && !meQuery.data?.user) {
			navigate({ to: "/login" });
		}
	}, [meQuery.data, meQuery.isError, navigate]);

	const currentUser = meQuery.data?.user ?? null;
	const permissionMap = meQuery.data?.permissionMap ?? {};
	const canReadSemesters = hasPermission(permissionMap, "semesters", "read");
	const canCreateSemesters = hasPermission(permissionMap, "semesters", "create");
	const canUpdateSemesters = hasPermission(permissionMap, "semesters", "update");
	const canDeleteSemesters = hasPermission(permissionMap, "semesters", "delete");
	const canReadWeeks = hasPermission(permissionMap, "semester-weeks", "read");
	const canUpdateWeeks = hasPermission(permissionMap, "semester-weeks", "update");
	const canReadHolidays = hasPermission(permissionMap, "academic-holidays", "read");
	const canCreateHolidays = hasPermission(permissionMap, "academic-holidays", "create");
	const canUpdateHolidays = hasPermission(permissionMap, "academic-holidays", "update");
	const canDeleteHolidays = hasPermission(permissionMap, "academic-holidays", "delete");
	const canRead = canReadSemesters || canReadWeeks || canReadHolidays;

	const [activeTab, setActiveTab] = useState<TabKey>("semesters");
	const [academicYearFilterId, setAcademicYearFilterId] = useState(0);
	const [selectedSemesterId, setSelectedSemesterId] = useState(0);
	const [semesterPage, setSemesterPage] = useState(1);
	const [semesterSearch, setSemesterSearch] = useState("");
	const [semesterStatusFilter, setSemesterStatusFilter] = useState("");
	const [semesterTypeFilter, setSemesterTypeFilter] = useState("");
	const [semesterForm, setSemesterForm] =
		useState<SemesterFormState>(EMPTY_SEMESTER_FORM);
	const [isCreatingSemester, setIsCreatingSemester] = useState(false);
	const [holidayPage, setHolidayPage] = useState(1);
	const [holidaySearch, setHolidaySearch] = useState("");
	const [holidayTypeFilter, setHolidayTypeFilter] = useState("");
	const [holidayStatusFilter, setHolidayStatusFilter] = useState("");
	const [holidayForm, setHolidayForm] =
		useState<HolidayFormState>(EMPTY_HOLIDAY_FORM);
	const [isCreatingHoliday, setIsCreatingHoliday] = useState(false);
	const [weekNotes, setWeekNotes] = useState<Record<number, string>>({});
	const limit = 6;

	const academicYearsQuery = useQuery({
		...orpc["academicYears.options"].queryOptions(),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const semestersQuery = useQuery({
		...orpc["semesters.list"].queryOptions({
			input: {
				page: semesterPage,
				limit,
				search: semesterSearch.trim() || undefined,
				academicYearId: academicYearFilterId || undefined,
				type: semesterTypeFilter ? (semesterTypeFilter as SemesterType) : undefined,
				status: semesterStatusFilter
					? (semesterStatusFilter as SemesterStatus)
					: undefined,
			},
		}),
		enabled: Boolean(currentUser) && canReadSemesters,
		meta: { skipErrorToast: !canReadSemesters },
	});

	const semesterOptionsQuery = useQuery({
		...orpc["semesters.options"].queryOptions({
			input: { academicYearId: academicYearFilterId || undefined },
		}),
		enabled: Boolean(currentUser) && canRead,
		meta: { skipErrorToast: !canRead },
	});

	const weeksQuery = useQuery({
		...orpc["academicWeeks.listBySemester"].queryOptions({
			input: { semesterId: selectedSemesterId },
		}),
		enabled: Boolean(currentUser) && canReadWeeks && selectedSemesterId > 0,
		meta: { skipErrorToast: !canReadWeeks },
	});

	const holidaysQuery = useQuery({
		...orpc["academicHolidays.list"].queryOptions({
			input: {
				page: holidayPage,
				limit,
				search: holidaySearch.trim() || undefined,
				academicYearId: academicYearFilterId || undefined,
				semesterId: selectedSemesterId || undefined,
				type: holidayTypeFilter ? (holidayTypeFilter as HolidayType) : undefined,
				status: holidayStatusFilter
					? (holidayStatusFilter as HolidayStatus)
					: undefined,
			},
		}),
		enabled: Boolean(currentUser) && canReadHolidays,
		meta: { skipErrorToast: !canReadHolidays },
	});

	const academicYears = (academicYearsQuery.data?.academicYears ??
		[]) as AcademicYearOption[];
	const semesters = (semestersQuery.data?.semesters ?? []) as SemesterItem[];
	const semesterOptions = (semesterOptionsQuery.data?.semesters ??
		[]) as SemesterOption[];
	const weeks = (weeksQuery.data?.weeks ?? []) as SemesterWeekItem[];
	const holidays = (holidaysQuery.data?.holidays ?? []) as AcademicHolidayItem[];
	const semesterPagination = semestersQuery.data?.pagination;
	const holidayPagination = holidaysQuery.data?.pagination;
	const selectedSemester = useMemo(
		() =>
			semesterOptions.find((item) => item.id === selectedSemesterId) ??
			semesters.find((item) => item.id === selectedSemesterId) ??
			null,
		[semesterOptions, semesters, selectedSemesterId],
	);

	useEffect(() => {
		if (selectedSemesterId === 0 && semesterOptions.length > 0) {
			setSelectedSemesterId(semesterOptions[0].id);
		}
	}, [selectedSemesterId, semesterOptions]);

	useEffect(() => {
		if (weeks.length === 0) {
			return;
		}

		setWeekNotes((current) => ({
			...Object.fromEntries(weeks.map((week) => [week.id, week.note])),
			...current,
		}));
	}, [weeks]);

	const invalidateAcademicCalendar = async () => {
		await queryClient.invalidateQueries();
	};

	const createSemesterMutation = useMutation(
		orpc["semesters.create"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã tạo học kỳ");
				setIsCreatingSemester(false);
				setSelectedSemesterId(data.semester.id);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateSemesterMutation = useMutation(
		orpc["semesters.update"].mutationOptions({
			onSuccess: async (data) => {
				toast.success("Đã cập nhật học kỳ");
				setIsCreatingSemester(false);
				setSelectedSemesterId(data.semester.id);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteSemesterMutation = useMutation(
		orpc["semesters.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa học kỳ");
				setSelectedSemesterId(0);
				setSemesterForm(EMPTY_SEMESTER_FORM);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateWeekMutation = useMutation(
		orpc["academicWeeks.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật tuần học");
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const createHolidayMutation = useMutation(
		orpc["academicHolidays.create"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã tạo ngày nghỉ/lễ");
				setIsCreatingHoliday(false);
				setHolidayForm(EMPTY_HOLIDAY_FORM);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateHolidayMutation = useMutation(
		orpc["academicHolidays.update"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã cập nhật ngày nghỉ/lễ");
				setIsCreatingHoliday(false);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteHolidayMutation = useMutation(
		orpc["academicHolidays.delete"].mutationOptions({
			onSuccess: async () => {
				toast.success("Đã xóa ngày nghỉ/lễ");
				setHolidayForm(EMPTY_HOLIDAY_FORM);
				await invalidateAcademicCalendar();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const beginCreateSemester = () => {
		setIsCreatingSemester(true);
		setSemesterForm({
			...EMPTY_SEMESTER_FORM,
			academicYearId: academicYearFilterId || academicYears[0]?.id || 0,
		});
	};

	const beginEditSemester = (semester: SemesterItem) => {
		setIsCreatingSemester(false);
		setSelectedSemesterId(semester.id);
		setSemesterForm({
			semesterId: semester.id,
			academicYearId: semester.academicYearId,
			code: semester.code,
			name: semester.name,
			type: semester.type,
			startDate: semester.startDate,
			endDate: semester.endDate,
			status: semester.status,
		});
	};

	const beginCreateHoliday = () => {
		setIsCreatingHoliday(true);
		setHolidayForm({
			...EMPTY_HOLIDAY_FORM,
			academicYearId: academicYearFilterId || academicYears[0]?.id || 0,
			semesterId: selectedSemesterId,
		});
	};

	const beginEditHoliday = (holiday: AcademicHolidayItem) => {
		setIsCreatingHoliday(false);
		setHolidayForm({
			holidayId: holiday.id,
			academicYearId: holiday.academicYearId,
			semesterId: holiday.semesterId ?? 0,
			name: holiday.name,
			type: holiday.type,
			startDate: holiday.startDate,
			endDate: holiday.endDate,
			status: holiday.status,
		});
	};

	const handleSaveSemester = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!semesterForm.academicYearId) {
			toast.error("Vui lòng chọn năm học");
			return;
		}

		if (semesterForm.endDate <= semesterForm.startDate) {
			toast.error("Ngày kết thúc phải sau ngày bắt đầu");
			return;
		}

		if (semesterForm.semesterId > 0) {
			updateSemesterMutation.mutate(semesterForm);
			return;
		}

		createSemesterMutation.mutate({
			academicYearId: semesterForm.academicYearId,
			code: semesterForm.code,
			name: semesterForm.name,
			type: semesterForm.type,
			startDate: semesterForm.startDate,
			endDate: semesterForm.endDate,
			status: semesterForm.status,
		});
	};

	const handleSaveHoliday = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!holidayForm.academicYearId) {
			toast.error("Vui lòng chọn năm học");
			return;
		}

		if (holidayForm.endDate < holidayForm.startDate) {
			toast.error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
			return;
		}

		const payload = {
			academicYearId: holidayForm.academicYearId,
			semesterId: holidayForm.semesterId || undefined,
			name: holidayForm.name,
			type: holidayForm.type,
			startDate: holidayForm.startDate,
			endDate: holidayForm.endDate,
			status: holidayForm.status,
		};

		if (holidayForm.holidayId > 0) {
			updateHolidayMutation.mutate({
				holidayId: holidayForm.holidayId,
				...payload,
			});
			return;
		}

		createHolidayMutation.mutate(payload);
	};

	if (meQuery.isLoading) {
		return <main className="p-6 text-sm">Đang tải dữ liệu...</main>;
	}

	if (!currentUser) {
		return null;
	}

	if (!canRead) {
		return (
			<AppShell
				currentUser={currentUser}
				permissionMap={permissionMap}
				pageTitle="Lịch học vụ"
				pageDescription="Tài khoản này không có quyền xem module học vụ."
			>
				<Card>
					<CardContent className="p-6 text-muted-foreground text-sm">
						Vui lòng liên hệ quản trị viên để được cấp quyền phù hợp.
					</CardContent>
				</Card>
			</AppShell>
		);
	}

	return (
		<AppShell
			currentUser={currentUser}
			permissionMap={permissionMap}
			pageTitle="Lịch học vụ"
			pageDescription="Quản lý học kỳ, tuần học và ngày nghỉ/lễ trong một module thống nhất."
		>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<CardTitle>Bộ lọc chung</CardTitle>
							<CardDescription>
								Chọn năm học và học kỳ để xem tuần học, ngày nghỉ/lễ liên quan.
							</CardDescription>
						</div>
						<div className="flex flex-wrap gap-2">
							{canCreateSemesters ? (
								<Button type="button" variant="outline" onClick={beginCreateSemester}>
									<Plus data-icon="inline-start" />
									Thêm học kỳ
								</Button>
							) : null}
							{canCreateHolidays ? (
								<Button type="button" variant="outline" onClick={beginCreateHoliday}>
									<Plus data-icon="inline-start" />
									Thêm ngày nghỉ/lễ
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="academic-year-filter">Năm học</Label>
							<select
								id="academic-year-filter"
								className="h-9 border bg-background px-3 text-sm"
								value={academicYearFilterId}
								onChange={(event) => {
									setAcademicYearFilterId(Number(event.target.value));
									setSelectedSemesterId(0);
									setSemesterPage(1);
									setHolidayPage(1);
								}}
							>
								<option value={0}>Tất cả năm học</option>
								{academicYears.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name} ({item.code})
									</option>
								))}
							</select>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="semester-filter">Học kỳ</Label>
							<select
								id="semester-filter"
								className="h-9 border bg-background px-3 text-sm"
								value={selectedSemesterId}
								onChange={(event) => {
									setSelectedSemesterId(Number(event.target.value));
									setHolidayPage(1);
								}}
							>
								<option value={0}>Tất cả học kỳ</option>
								{semesterOptions.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name} ({item.code})
									</option>
								))}
							</select>
						</div>

						<div className="flex flex-col gap-2">
							<Label>Module</Label>
							<div className="grid grid-cols-3 gap-2">
								<Button
									type="button"
									variant={activeTab === "semesters" ? "default" : "outline"}
									onClick={() => setActiveTab("semesters")}
								>
									Học kỳ
								</Button>
								<Button
									type="button"
									variant={activeTab === "weeks" ? "default" : "outline"}
									onClick={() => setActiveTab("weeks")}
								>
									Tuần
								</Button>
								<Button
									type="button"
									variant={activeTab === "holidays" ? "default" : "outline"}
									onClick={() => setActiveTab("holidays")}
								>
									Nghỉ/lễ
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{activeTab === "semesters" ? (
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
					<Card>
						<CardHeader>
							<CardTitle>Danh sách học kỳ</CardTitle>
							<CardDescription>
								Tìm kiếm, lọc và chọn học kỳ để chỉnh sửa hoặc xem tuần học.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-4 grid gap-3 md:grid-cols-4">
								<div className="flex flex-col gap-2 md:col-span-2">
									<Label htmlFor="semester-search">Tìm kiếm</Label>
									<Input
										id="semester-search"
										value={semesterSearch}
										onChange={(event) => {
											setSemesterSearch(event.target.value);
											setSemesterPage(1);
										}}
										placeholder="Tìm theo mã hoặc tên học kỳ"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="semester-type">Loại</Label>
									<select
										id="semester-type"
										className="h-9 border bg-background px-3 text-sm"
										value={semesterTypeFilter}
										onChange={(event) => {
											setSemesterTypeFilter(event.target.value);
											setSemesterPage(1);
										}}
									>
										<option value="">Tất cả</option>
										<option value="regular">Chính quy</option>
										<option value="summer">Học kỳ hè</option>
									</select>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="semester-status">Trạng thái</Label>
									<select
										id="semester-status"
										className="h-9 border bg-background px-3 text-sm"
										value={semesterStatusFilter}
										onChange={(event) => {
											setSemesterStatusFilter(event.target.value);
											setSemesterPage(1);
										}}
									>
										<option value="">Tất cả</option>
										<option value="draft">Nháp</option>
										<option value="open">Đang mở</option>
										<option value="locked">Đã khóa</option>
										<option value="archived">Lưu trữ</option>
									</select>
								</div>
							</div>

							{semestersQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							) : semesters.length === 0 ? (
								<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
									Không tìm thấy học kỳ phù hợp.
								</div>
							) : (
								<div className="overflow-x-auto border">
									<table className="w-full min-w-[860px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Học kỳ</th>
												<th className="p-3">Loại</th>
												<th className="p-3">Thời gian</th>
												<th className="p-3">Trạng thái</th>
												<th className="p-3 text-right">Thao tác</th>
											</tr>
										</thead>
										<tbody>
											{semesters.map((item) => (
												<tr
													key={item.id}
													className={
														selectedSemesterId === item.id
															? "border-t bg-muted/70"
															: "border-t hover:bg-muted/40"
													}
												>
													<td className="p-3">
														<div className="font-medium">{item.name}</div>
														<div className="text-muted-foreground text-xs">{item.code}</div>
													</td>
													<td className="p-3">{SEMESTER_TYPE_LABEL[item.type]}</td>
													<td className="p-3">
														{item.startDate} → {item.endDate}
													</td>
													<td className="p-3">{SEMESTER_STATUS_LABEL[item.status]}</td>
													<td className="p-3">
														<div className="flex justify-end gap-2">
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() => {
																	setSelectedSemesterId(item.id);
																	setActiveTab("weeks");
																}}
															>
																Xem tuần
															</Button>
															{canUpdateSemesters ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => beginEditSemester(item)}
																>
																	<Pencil data-icon="inline-start" />
																	Sửa
																</Button>
															) : null}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{semesterPagination ? (
								<div className="mt-3 flex items-center justify-between border bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
									<span>
										Trang {semesterPagination.page} /{" "}
										{Math.max(semesterPagination.totalPages, 1)} •{" "}
										{semesterPagination.total} bản ghi
									</span>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={semesterPagination.page <= 1}
											onClick={() => setSemesterPage((page) => Math.max(page - 1, 1))}
										>
											Trước
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={
												semesterPagination.totalPages === 0 ||
												semesterPagination.page >= semesterPagination.totalPages
											}
											onClick={() => setSemesterPage((page) => page + 1)}
										>
											Sau
										</Button>
									</div>
								</div>
							) : null}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{semesterForm.semesterId > 0 ? "Cập nhật học kỳ" : "Tạo học kỳ"}
							</CardTitle>
							<CardDescription>
								Khi tạo học kỳ, hệ thống tự sinh danh sách tuần học theo mốc ngày.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form className="flex flex-col gap-4" onSubmit={handleSaveSemester}>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="semester-code">Mã học kỳ</Label>
										<Input
											id="semester-code"
											value={semesterForm.code}
											onChange={(event) =>
												setSemesterForm((current) => ({
													...current,
													code: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="semester-status-form">Trạng thái</Label>
										<select
											id="semester-status-form"
											className="h-9 border bg-background px-3 text-sm"
											value={semesterForm.status}
											onChange={(event) =>
												setSemesterForm((current) => ({
													...current,
													status: event.target.value as SemesterStatus,
												}))
											}
										>
											<option value="draft">Nháp</option>
											<option value="open">Đang mở</option>
											<option value="locked">Đã khóa</option>
											<option value="archived">Lưu trữ</option>
										</select>
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="semester-name">Tên học kỳ</Label>
									<Input
										id="semester-name"
										value={semesterForm.name}
										onChange={(event) =>
											setSemesterForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="semester-academic-year">Năm học</Label>
									<select
										id="semester-academic-year"
										className="h-9 border bg-background px-3 text-sm"
										value={semesterForm.academicYearId}
										onChange={(event) =>
											setSemesterForm((current) => ({
												...current,
												academicYearId: Number(event.target.value),
											}))
										}
										required
									>
										<option value={0}>Chọn năm học</option>
										{academicYears.map((item) => (
											<option key={item.id} value={item.id}>
												{item.name} ({item.code})
											</option>
										))}
									</select>
								</div>

								<div className="grid gap-3 md:grid-cols-3">
									<div className="flex flex-col gap-2">
										<Label htmlFor="semester-type-form">Loại</Label>
										<select
											id="semester-type-form"
											className="h-9 border bg-background px-3 text-sm"
											value={semesterForm.type}
											onChange={(event) =>
												setSemesterForm((current) => ({
													...current,
													type: event.target.value as SemesterType,
												}))
											}
										>
											<option value="regular">Chính quy</option>
											<option value="summer">Học kỳ hè</option>
										</select>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="semester-start">Ngày bắt đầu</Label>
										<Input
											id="semester-start"
											type="date"
											value={semesterForm.startDate}
											onChange={(event) =>
												setSemesterForm((current) => ({
													...current,
													startDate: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="semester-end">Ngày kết thúc</Label>
										<Input
											id="semester-end"
											type="date"
											value={semesterForm.endDate}
											onChange={(event) =>
												setSemesterForm((current) => ({
													...current,
													endDate: event.target.value,
												}))
											}
											required
										/>
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									{(semesterForm.semesterId > 0
										? canUpdateSemesters
										: canCreateSemesters) ? (
										<Button
											type="submit"
											disabled={
												createSemesterMutation.isPending ||
												updateSemesterMutation.isPending
											}
										>
											<Save data-icon="inline-start" />
											Lưu học kỳ
										</Button>
									) : null}
									<Button type="button" variant="outline" onClick={beginCreateSemester}>
										Làm mới
									</Button>
									{semesterForm.semesterId > 0 && canDeleteSemesters ? (
										<Button
											type="button"
											variant="destructive"
											disabled={deleteSemesterMutation.isPending}
											onClick={() => {
												if (confirm(`Xóa học kỳ ${semesterForm.code}?`)) {
													deleteSemesterMutation.mutate({
														semesterId: semesterForm.semesterId,
													});
												}
											}}
										>
											<Trash2 data-icon="inline-start" />
											Xóa
										</Button>
									) : null}
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			) : null}

			{activeTab === "weeks" ? (
				<Card>
					<CardHeader>
						<CardTitle>Tuần học</CardTitle>
						<CardDescription>
							{selectedSemester
								? `Cấu hình tuần học cho ${selectedSemester.name}.`
								: "Chọn học kỳ để xem và cấu hình tuần học."}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{selectedSemesterId === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Vui lòng chọn một học kỳ ở bộ lọc chung.
							</div>
						) : weeksQuery.isLoading ? (
							<div className="flex flex-col gap-3">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
						) : weeks.length === 0 ? (
							<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
								Học kỳ này chưa có tuần học.
							</div>
						) : (
							<div className="overflow-x-auto border">
								<table className="w-full min-w-[900px] text-sm">
									<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
										<tr>
											<th className="p-3">Tuần</th>
											<th className="p-3">Thời gian</th>
											<th className="p-3">Trạng thái</th>
											<th className="p-3">Ghi chú</th>
											<th className="p-3 text-right">Thao tác</th>
										</tr>
									</thead>
									<tbody>
										{weeks.map((week) => (
											<tr key={week.id} className="border-t">
												<td className="p-3 font-medium">Tuần {week.weekNumber}</td>
												<td className="p-3">
													{week.startDate} → {week.endDate}
												</td>
												<td className="p-3">
													{week.isTeachingWeek ? "Tuần học" : "Nghỉ/không học"}
												</td>
												<td className="p-3">
													<Input
														value={weekNotes[week.id] ?? week.note}
														onChange={(event) =>
															setWeekNotes((current) => ({
																...current,
																[week.id]: event.target.value,
															}))
														}
														disabled={!canUpdateWeeks}
														placeholder="VD: Tuần thi giữa kỳ"
													/>
												</td>
												<td className="p-3">
													<div className="flex justify-end gap-2">
														{canUpdateWeeks ? (
															<>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	disabled={updateWeekMutation.isPending}
																	onClick={() =>
																		updateWeekMutation.mutate({
																			weekId: week.id,
																			isTeachingWeek: !week.isTeachingWeek,
																			note: weekNotes[week.id] ?? week.note,
																		})
																	}
																>
																	{week.isTeachingWeek ? "Đánh dấu nghỉ" : "Đánh dấu học"}
																</Button>
																<Button
																	type="button"
																	size="sm"
																	disabled={updateWeekMutation.isPending}
																	onClick={() =>
																		updateWeekMutation.mutate({
																			weekId: week.id,
																			isTeachingWeek: week.isTeachingWeek,
																			note: weekNotes[week.id] ?? week.note,
																		})
																	}
																>
																	Lưu ghi chú
																</Button>
															</>
														) : null}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			) : null}

			{activeTab === "holidays" ? (
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
					<Card>
						<CardHeader>
							<CardTitle>Ngày nghỉ/lễ</CardTitle>
							<CardDescription>
								Quản lý các mốc nghỉ lễ, tuần thi, nghỉ giữa kỳ hoặc sự kiện học vụ.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-4 grid gap-3 md:grid-cols-4">
								<div className="flex flex-col gap-2 md:col-span-2">
									<Label htmlFor="holiday-search">Tìm kiếm</Label>
									<Input
										id="holiday-search"
										value={holidaySearch}
										onChange={(event) => {
											setHolidaySearch(event.target.value);
											setHolidayPage(1);
										}}
										placeholder="Tìm theo tên ngày nghỉ/lễ"
									/>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="holiday-type-filter">Loại</Label>
									<select
										id="holiday-type-filter"
										className="h-9 border bg-background px-3 text-sm"
										value={holidayTypeFilter}
										onChange={(event) => {
											setHolidayTypeFilter(event.target.value);
											setHolidayPage(1);
										}}
									>
										<option value="">Tất cả</option>
										{Object.entries(HOLIDAY_TYPE_LABEL).map(([value, label]) => (
											<option key={value} value={value}>
												{label}
											</option>
										))}
									</select>
								</div>
								<div className="flex flex-col gap-2">
									<Label htmlFor="holiday-status-filter">Trạng thái</Label>
									<select
										id="holiday-status-filter"
										className="h-9 border bg-background px-3 text-sm"
										value={holidayStatusFilter}
										onChange={(event) => {
											setHolidayStatusFilter(event.target.value);
											setHolidayPage(1);
										}}
									>
										<option value="">Tất cả</option>
										<option value="active">Đang áp dụng</option>
										<option value="inactive">Ngừng áp dụng</option>
									</select>
								</div>
							</div>

							{holidaysQuery.isLoading ? (
								<div className="flex flex-col gap-3">
									<Skeleton className="h-12 w-full" />
									<Skeleton className="h-12 w-full" />
								</div>
							) : holidays.length === 0 ? (
								<div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
									Không tìm thấy ngày nghỉ/lễ phù hợp.
								</div>
							) : (
								<div className="overflow-x-auto border">
									<table className="w-full min-w-[860px] text-sm">
										<thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
											<tr>
												<th className="p-3">Tên</th>
												<th className="p-3">Loại</th>
												<th className="p-3">Thời gian</th>
												<th className="p-3">Trạng thái</th>
												<th className="p-3 text-right">Thao tác</th>
											</tr>
										</thead>
										<tbody>
											{holidays.map((item) => (
												<tr key={item.id} className="border-t hover:bg-muted/40">
													<td className="p-3 font-medium">{item.name}</td>
													<td className="p-3">{HOLIDAY_TYPE_LABEL[item.type]}</td>
													<td className="p-3">
														{item.startDate} → {item.endDate}
													</td>
													<td className="p-3">{HOLIDAY_STATUS_LABEL[item.status]}</td>
													<td className="p-3">
														<div className="flex justify-end gap-2">
															{canUpdateHolidays ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => beginEditHoliday(item)}
																>
																	Sửa
																</Button>
															) : null}
															{canDeleteHolidays ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	disabled={deleteHolidayMutation.isPending}
																	onClick={() => {
																		if (confirm(`Xóa ${item.name}?`)) {
																			deleteHolidayMutation.mutate({
																				holidayId: item.id,
																			});
																		}
																	}}
																>
																	Xóa
																</Button>
															) : null}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}

							{holidayPagination ? (
								<div className="mt-3 flex items-center justify-between border bg-muted/30 px-3 py-2 text-muted-foreground text-xs">
									<span>
										Trang {holidayPagination.page} /{" "}
										{Math.max(holidayPagination.totalPages, 1)} •{" "}
										{holidayPagination.total} bản ghi
									</span>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={holidayPagination.page <= 1}
											onClick={() => setHolidayPage((page) => Math.max(page - 1, 1))}
										>
											Trước
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={
												holidayPagination.totalPages === 0 ||
												holidayPagination.page >= holidayPagination.totalPages
											}
											onClick={() => setHolidayPage((page) => page + 1)}
										>
											Sau
										</Button>
									</div>
								</div>
							) : null}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{holidayForm.holidayId > 0
									? "Cập nhật ngày nghỉ/lễ"
									: "Tạo ngày nghỉ/lễ"}
							</CardTitle>
							<CardDescription>
								Có thể gắn ngày nghỉ/lễ với toàn năm học hoặc một học kỳ cụ thể.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form className="flex flex-col gap-4" onSubmit={handleSaveHoliday}>
								<div className="flex flex-col gap-2">
									<Label htmlFor="holiday-name">Tên ngày nghỉ/lễ</Label>
									<Input
										id="holiday-name"
										value={holidayForm.name}
										onChange={(event) =>
											setHolidayForm((current) => ({
												...current,
												name: event.target.value,
											}))
										}
										required
									/>
								</div>

								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-year">Năm học</Label>
										<select
											id="holiday-year"
											className="h-9 border bg-background px-3 text-sm"
											value={holidayForm.academicYearId}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													academicYearId: Number(event.target.value),
													semesterId: 0,
												}))
											}
											required
										>
											<option value={0}>Chọn năm học</option>
											{academicYears.map((item) => (
												<option key={item.id} value={item.id}>
													{item.name} ({item.code})
												</option>
											))}
										</select>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-semester">Học kỳ</Label>
										<select
											id="holiday-semester"
											className="h-9 border bg-background px-3 text-sm"
											value={holidayForm.semesterId}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													semesterId: Number(event.target.value),
												}))
											}
										>
											<option value={0}>Toàn năm học</option>
											{semesterOptions
												.filter(
													(item) =>
														!holidayForm.academicYearId ||
														item.academicYearId === holidayForm.academicYearId,
												)
												.map((item) => (
													<option key={item.id} value={item.id}>
														{item.name} ({item.code})
													</option>
												))}
										</select>
									</div>
								</div>

								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-type">Loại</Label>
										<select
											id="holiday-type"
											className="h-9 border bg-background px-3 text-sm"
											value={holidayForm.type}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													type: event.target.value as HolidayType,
												}))
											}
										>
											{Object.entries(HOLIDAY_TYPE_LABEL).map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
										</select>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-status">Trạng thái</Label>
										<select
											id="holiday-status"
											className="h-9 border bg-background px-3 text-sm"
											value={holidayForm.status}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													status: event.target.value as HolidayStatus,
												}))
											}
										>
											<option value="active">Đang áp dụng</option>
											<option value="inactive">Ngừng áp dụng</option>
										</select>
									</div>
								</div>

								<div className="grid gap-3 md:grid-cols-2">
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-start">Ngày bắt đầu</Label>
										<Input
											id="holiday-start"
											type="date"
											value={holidayForm.startDate}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													startDate: event.target.value,
												}))
											}
											required
										/>
									</div>
									<div className="flex flex-col gap-2">
										<Label htmlFor="holiday-end">Ngày kết thúc</Label>
										<Input
											id="holiday-end"
											type="date"
											value={holidayForm.endDate}
											onChange={(event) =>
												setHolidayForm((current) => ({
													...current,
													endDate: event.target.value,
												}))
											}
											required
										/>
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									{(holidayForm.holidayId > 0
										? canUpdateHolidays
										: canCreateHolidays) ? (
										<Button
											type="submit"
											disabled={
												createHolidayMutation.isPending ||
												updateHolidayMutation.isPending
											}
										>
											<Save data-icon="inline-start" />
											Lưu ngày nghỉ/lễ
										</Button>
									) : null}
									<Button type="button" variant="outline" onClick={beginCreateHoliday}>
										Làm mới
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			) : null}
		</AppShell>
	);
}
