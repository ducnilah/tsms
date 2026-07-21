import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { buttonVariants } from "@tsms/ui/components/button";
import {
	BookOpen,
	Building,
	Building2,
	CalendarDays,
	CalendarOff,
	ChevronDown,
	Clock,
	DoorOpen,
	GraduationCap,
	Home,
	LogOut,
	NotebookTabs,
	School,
	ShieldCheck,
	UserRound,
	Users,
	type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";
import { hasPermission, type PermissionMap } from "@/utils/permissions";

type ShellUser = {
	email: string;
};

type AppShellProps = {
	children: ReactNode;
	currentUser: ShellUser | null;
	permissionMap?: PermissionMap;
	logoutPending?: boolean;
	pageTitle: string;
	pageDescription: string;
};

type SidebarRoute =
	| "/dashboard"
	| "/users"
	| "/roles"
	| "/faculties"
	| "/departments"
	| "/students"
	| "/lecturers"
	| "/buildings"
	| "/classrooms"
	| "/courses"
	| "/course-classes"
	| "/time-slots"
	| "/majors"
	| "/programs"
	| "/semesters"
	| "/academic-weeks"
	| "/academic-holidays"
	| "/academic-years";

type SidebarLinkItem = {
	type: "link";
	label: string;
	icon: LucideIcon;
	to: SidebarRoute;
};

type SidebarPlaceholderItem = {
	type: "placeholder";
	label: string;
	icon: LucideIcon;
};

type SidebarGroupChild = SidebarLinkItem | SidebarPlaceholderItem;

type SidebarGroupItem = {
	type: "group";
	label: string;
	icon: LucideIcon;
	children: SidebarGroupChild[];
};

type SidebarItem = SidebarLinkItem | SidebarGroupItem;

function SidebarLink({ item, nested = false }: { item: SidebarLinkItem; nested?: boolean }) {
	const Icon = item.icon;

	return (
		<Link
			key={item.label}
			to={item.to}
			activeProps={{
				className: "border-foreground bg-foreground text-background",
			}}
			inactiveProps={{
				className:
					"border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
			}}
			className={`flex w-full items-center gap-2 border px-3 text-left text-xs transition-colors ${
				nested ? "h-8" : "h-9"
			}`}
		>
			<Icon data-icon="inline-start" />
			{item.label}
		</Link>
	);
}

function SidebarStaticItem({ item }: { item: SidebarPlaceholderItem }) {
	const Icon = item.icon;

	return (
		<div className="flex h-8 w-full items-center gap-2 border border-transparent px-3 text-left text-muted-foreground text-xs">
			<Icon data-icon="inline-start" />
			<span>{item.label}</span>
		</div>
	);
}

export function AppShell({
	children,
	currentUser,
	permissionMap,
	logoutPending = false,
	pageTitle,
	pageDescription,
}: AppShellProps) {
	const navigate = useNavigate();
	const currentPath = useRouterState({
		select: (state) => state.location.pathname,
	});
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

	const accountManagementItems: SidebarGroupChild[] = [
		...(hasPermission(permissionMap, "users", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý người dùng",
						icon: Users,
						to: "/users" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "roles", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý vai trò",
						icon: ShieldCheck,
						to: "/roles" as const,
					},
				]
			: []),
	];

	const academicManagementItems: SidebarGroupChild[] = [
		...(hasPermission(permissionMap, "programs", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý CTĐT",
						icon: GraduationCap,
						to: "/programs" as const,
					},
				]
			: []),
		{
			type: "placeholder",
			label: "Quản lý lớp sinh viên",
			icon: Users,
		},
		...(hasPermission(permissionMap, "faculties", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý khoa",
						icon: School,
						to: "/faculties" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "departments", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý bộ môn",
						icon: NotebookTabs,
						to: "/departments" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "courses", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý học phần",
						icon: BookOpen,
						to: "/courses" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "course-classes", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý lớp học phần",
						icon: BookOpen,
						to: "/course-classes" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "students", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý sinh viên",
						icon: UserRound,
						to: "/students" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "lecturers", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý giảng viên",
						icon: UserRound,
						to: "/lecturers" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "majors", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý ngành học",
						icon: BookOpen,
						to: "/majors" as const,
					},
				]
			: []),
	];

	const semesterManagementItems: SidebarGroupChild[] = [
		...(hasPermission(permissionMap, "academic-years", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý năm học",
						icon: CalendarDays,
						to: "/academic-years" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "semesters", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý học kỳ",
						icon: CalendarDays,
						to: "/semesters" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "semester-weeks", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý tuần học",
						icon: CalendarDays,
						to: "/academic-weeks" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "time-slots", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý tiết học",
						icon: Clock,
						to: "/time-slots" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "academic-holidays", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý ngày nghỉ lễ",
						icon: CalendarOff,
						to: "/academic-holidays" as const,
					},
				]
			: []),
	];

	const facilityManagementItems: SidebarGroupChild[] = [
		...(hasPermission(permissionMap, "buildings", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý tòa nhà",
						icon: Building,
						to: "/buildings" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "classrooms", "read")
			? [
					{
						type: "link" as const,
						label: "Quản lý phòng học",
						icon: DoorOpen,
						to: "/classrooms" as const,
					},
				]
			: []),
	];

	const sidebarItems: SidebarItem[] = [
		{ type: "link", label: "Trang chủ", icon: Home, to: "/dashboard" },
		...(accountManagementItems.length > 0
			? [
					{
						type: "group" as const,
						label: "Quản lý tài khoản",
						icon: ShieldCheck,
						children: accountManagementItems,
					},
				]
			: []),
		...(academicManagementItems.length > 0
			? [
					{
						type: "group" as const,
						label: "Quản lý học vụ",
						icon: GraduationCap,
						children: academicManagementItems,
					},
				]
			: []),
		...(semesterManagementItems.length > 0
			? [
					{
						type: "group" as const,
						label: "Quản lý học kỳ",
						icon: CalendarDays,
						children: semesterManagementItems,
					},
				]
			: []),
		...(facilityManagementItems.length > 0
			? [
					{
						type: "group" as const,
						label: "Quản lý cơ sở vật chất",
						icon: Building,
						children: facilityManagementItems,
					},
				]
			: []),
	];

	const handleLogout = async () => {
		try {
			await orpc["auth.logout"].call();
			toast.success("Đã đăng xuất");
		} catch {
			toast.error("Không thể đăng xuất sạch phiên hiện tại");
		} finally {
			queryClient.clear();
			navigate({ to: "/login" });
		}
	};

	return (
		<main className="h-svh overflow-hidden bg-muted/30">
			<div className="h-full lg:pl-[260px]">
				<aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r bg-background lg:block">
					<div className="flex h-full min-h-0 flex-col">
						<div className="border-b px-4 py-5">
							<div className="flex items-center gap-3">
								<div className="flex size-10 items-center justify-center border bg-muted">
									<GraduationCap />
								</div>
								<div>
									<p className="text-muted-foreground text-xs">TSMS</p>
									<h1 className="font-semibold text-sm">Quản lý lịch dạy</h1>
								</div>
							</div>
						</div>

						<nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
							{sidebarItems.map((item) => {
								if (item.type === "group") {
									const Icon = item.icon;
									const hasActiveChild = item.children.some(
										(child) => child.type === "link" && child.to === currentPath,
									);
									const isExpanded = expandedGroups[item.label] ?? hasActiveChild;

									return (
										<div key={item.label} className="space-y-1">
											<button
												type="button"
												className="flex h-9 w-full items-center gap-2 border border-border bg-muted px-3 text-left font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
												onClick={() =>
													setExpandedGroups((current) => ({
														...current,
														[item.label]: !isExpanded,
													}))
												}
											>
												<Icon data-icon="inline-start" />
												{item.label}
												<ChevronDown
													className={`ml-auto size-4 transition-transform ${
														isExpanded ? "rotate-180" : ""
													}`}
												/>
											</button>
											{isExpanded ? (
												<div className="ml-4 flex flex-col gap-1 border-l pl-2">
													{item.children.map((child) =>
														child.type === "link" ? (
															<SidebarLink key={child.label} item={child} nested />
														) : (
															<SidebarStaticItem key={child.label} item={child} />
														),
													)}
												</div>
											) : null}
										</div>
									);
								}

								return <SidebarLink key={item.label} item={item} />;
							})}
						</nav>

						<div className="shrink-0 border-t p-3">
							<button
								type="button"
								className={buttonVariants({
									variant: "outline",
									className: "w-full",
								})}
								disabled={logoutPending}
								onClick={handleLogout}
							>
								<LogOut data-icon="inline-start" />
								Đăng xuất
							</button>
						</div>
					</div>
				</aside>

				<section className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto">
					<header className="border-b bg-background px-5 py-5">
						<div className="flex flex-col gap-2">
							<p className="text-muted-foreground text-xs uppercase tracking-widest">
								Phòng Đào tạo
							</p>
							<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
								<div>
									<h2 className="font-semibold text-2xl">{pageTitle}</h2>
									<p className="text-muted-foreground text-sm">
										{pageDescription}
									</p>
								</div>
								<div className="inline-flex w-fit items-center gap-2 border bg-muted px-3 py-1 text-muted-foreground text-xs">
									<Building2 data-icon="inline-start" />
									{currentUser
										? `Đang đăng nhập: ${currentUser.email}`
										: "Chưa xác định"}
								</div>
							</div>
						</div>
					</header>

					<div className="flex flex-col gap-5 p-5">{children}</div>
				</section>
			</div>
		</main>
	);
}
