import { Link, useNavigate } from "@tanstack/react-router";
import { buttonVariants } from "@tsms/ui/components/button";
import {
	Building,
	Building2,
	BookOpen,
	CalendarDays,
	GraduationCap,
	Home,
	LogOut,
	NotebookTabs,
	DoorOpen,
	School,
	ShieldCheck,
	UserRound,
	Users,
	type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
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

type SidebarItem = {
	label: string;
	icon: LucideIcon;
	to:
		| "/dashboard"
		| "/users"
		| "/roles"
		| "/faculties"
		| "/departments"
		| "/lecturers"
		| "/buildings"
		| "/classrooms"
		| "/courses"
		| "/academic-years";
};

export function AppShell({
	children,
	currentUser,
	permissionMap,
	logoutPending = false,
	pageTitle,
	pageDescription,
}: AppShellProps) {
	const navigate = useNavigate();

	const sidebarItems: SidebarItem[] = [
		{ label: "Trang chủ", icon: Home, to: "/dashboard" },
		...(hasPermission(permissionMap, "users", "read")
			? [
					{
						label: "Quản lý người dùng",
						icon: Users,
						to: "/users" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "roles", "read")
			? [
					{
						label: "Quản lý vai trò",
						icon: ShieldCheck,
						to: "/roles" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "faculties", "read")
			? [
					{
						label: "Quản lý khoa",
						icon: School,
						to: "/faculties" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "departments", "read")
			? [
					{
						label: "Quản lý bộ môn",
						icon: NotebookTabs,
						to: "/departments" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "lecturers", "read")
			? [
					{
						label: "Quản lý giảng viên",
						icon: UserRound,
						to: "/lecturers" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "buildings", "read")
			? [
					{
						label: "Quản lý tòa nhà",
						icon: Building,
						to: "/buildings" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "classrooms", "read")
			? [
					{
						label: "Quản lý phòng học",
						icon: DoorOpen,
						to: "/classrooms" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "courses", "read")
			? [
					{
						label: "Quản lý học phần",
						icon: BookOpen,
						to: "/courses" as const,
					},
				]
			: []),
		...(hasPermission(permissionMap, "academic-years", "read")
			? [
					{
						label: "Quản lý năm học",
						icon: CalendarDays,
						to: "/academic-years" as const,
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
		<main className="min-h-svh bg-muted/30">
			<div className="grid h-full lg:grid-cols-[260px_1fr]">
				<aside className="sticky top-0 h-svh border-r bg-background">
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
								const Icon = item.icon;

								return (
									<Link
										key={item.label}
										to={item.to}
										activeProps={{
											className:
												"border-foreground bg-foreground text-background",
										}}
										inactiveProps={{
											className:
												"border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
										}}
										className="flex h-9 w-full items-center gap-2 border px-3 text-left text-xs transition-colors"
									>
										<Icon data-icon="inline-start" />
										{item.label}
									</Link>
								);
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

				<section className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
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
