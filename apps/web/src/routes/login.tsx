import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { CalendarCheck, GraduationCap, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/login")({
	component: LoginRoute,
});

function LoginRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (meQuery.data?.user) {
			navigate({ to: "/dashboard" });
		}
	}, [meQuery.data?.user, navigate]);

	const loginMutation = useMutation(
		orpc["auth.login"].mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				toast.success("Đăng nhập thành công");
				navigate({ to: "/dashboard" });
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginMutation.mutate({ email, password });
	};

	return (
		<main className="min-h-svh bg-[linear-gradient(120deg,var(--background),var(--muted)_52%,var(--secondary))]">
			<section className="mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1fr_420px]">
				<div className="flex flex-col gap-8">
					<div className="flex items-center gap-3">
						<div className="flex size-11 items-center justify-center border bg-background shadow-sm">
							<GraduationCap />
						</div>
						<div>
							<p className="text-xs uppercase tracking-widest text-muted-foreground">
								Phòng Đào tạo
							</p>
							<h1 className="text-xl font-semibold">TSMS</h1>
						</div>
					</div>

					<div className="flex max-w-2xl flex-col gap-4">
						<div className="inline-flex w-fit items-center gap-2 border bg-background px-3 py-1 text-xs text-muted-foreground">
							<CalendarCheck data-icon="inline-start" />
							Hệ thống quản lý lịch dạy
						</div>
						<h2 className="text-4xl font-semibold tracking-normal md:text-6xl">
							Cổng đăng nhập quản lý lịch giảng dạy.
						</h2>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground">
							Tra cứu lịch, phân công giảng viên, theo dõi phòng học và kiểm soát xung đột lịch
							trong một hệ thống tập trung.
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Đăng nhập</CardTitle>
						<CardDescription>Nhập tài khoản nội bộ để truy cập hệ thống.</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="giangvien@university.edu.vn"
									disabled={loginMutation.isPending}
									required
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="password">Mật khẩu</Label>
								<Input
									id="password"
									type="password"
									autoComplete="current-password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="Nhập mật khẩu"
									disabled={loginMutation.isPending}
									required
								/>
							</div>

							<Button type="submit" disabled={loginMutation.isPending}>
								{loginMutation.isPending ? (
									<Loader2 data-icon="inline-start" className="animate-spin" />
								) : (
									<LockKeyhole data-icon="inline-start" />
								)}
								Đăng nhập
							</Button>
						</form>

						<p className="mt-4 text-xs text-muted-foreground">
							Chưa có tài khoản?{" "}
							<Link to="/register" className="text-foreground underline underline-offset-4">
								Đăng ký tại đây
							</Link>
						</p>
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
