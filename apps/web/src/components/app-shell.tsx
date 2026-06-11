import { Link, useNavigate } from "@tanstack/react-router";
import { buttonVariants } from "@tsms/ui/components/button";
import { Building2, GraduationCap, Home, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { clearAuth, getRefreshToken } from "@/utils/auth-storage";
import { orpc } from "@/utils/orpc";

type ShellUser = {
	email: string;
	roles: {
		id: number;
		roleName: string;
	}[];
};

type AppShellProps = {
	children: ReactNode;
	currentUser: ShellUser | null;
	logoutPending?: boolean;
	pageTitle: string;
	pageDescription: string;
};

type SidebarItem = {
	label: string;
	icon: typeof Home;
	to: "/dashboard" | "/users";
};

export function AppShell({
	children,
	currentUser,
	logoutPending = false,
	pageTitle,
	pageDescription,
}: AppShellProps) {
	const navigate = useNavigate();
	const isAdmin =
		currentUser?.roles.some((role) => role.roleName === "admin") ?? false;
	const sidebarItems: SidebarItem[] = [
		{ label: "Trang chủ", icon: Home, to: "/dashboard" },
		...(isAdmin
			? [{ label: "Quản lý người dùng", icon: Users, to: "/users" as const }]
			: []),
	];

	const handleLogout = async () => {
		const refreshToken = getRefreshToken();

		if (!refreshToken) {
			clearAuth();
			navigate({ to: "/login" });
			return;
		}

		try {
			await orpc["auth.logout"].call({ refreshToken });
			toast.success("Đã đăng xuất");
		} catch {
			// Clear stale local auth even if the refresh token is already invalid.
		} finally {
			clearAuth();
			navigate({ to: "/login" });
		}
	};

	return (
		<main className="min-h-svh bg-muted/30">
			<div className="grid min-h-svh lg:grid-cols-[260px_1fr]">
				<aside className="border-r bg-background">
					<div className="flex h-full flex-col">
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

						<nav className="flex flex-1 flex-col gap-1 p-3">
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

						<div className="border-t p-3">
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

				<section className="flex min-w-0 flex-col">
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
									{isAdmin ? "Quyền quản trị" : "Người dùng thường"}
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
