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
import { Building2, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/register")({
	component: RegisterRoute,
});

function RegisterRoute() {
	const navigate = useNavigate();
	const meQuery = useQuery({
		...orpc["auth.me"].queryOptions(),
		retry: false,
		meta: { skipErrorToast: true },
	});
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (meQuery.data?.user) {
			navigate({ to: "/dashboard" });
		}
	}, [meQuery.data?.user, navigate]);

	const registerMutation = useMutation(
		orpc["auth.register"].mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries();
				toast.success("Tạo tài khoản thành công");
				navigate({ to: "/dashboard" });
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		registerMutation.mutate({ username, email, password });
	};

	return (
		<main className="min-h-svh bg-[linear-gradient(135deg,var(--secondary),var(--background)_48%,var(--muted))]">
			<section className="mx-auto grid min-h-svh w-full max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[420px_1fr]">
				<Card>
					<CardHeader>
						<CardTitle>Đăng ký tài khoản</CardTitle>
						<CardDescription>
							Tạo tài khoản thử nghiệm để truy cập hệ thống quản lý lịch dạy.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="username">Tên đăng nhập</Label>
								<Input
									id="username"
									autoComplete="username"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="gv_nguyenvana"
									disabled={registerMutation.isPending}
									required
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="giangvien@university.edu.vn"
									disabled={registerMutation.isPending}
									required
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="password">Mật khẩu</Label>
								<Input
									id="password"
									type="password"
									autoComplete="new-password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="Tối thiểu 6 ký tự"
									disabled={registerMutation.isPending}
									minLength={6}
									required
								/>
							</div>

							<Button type="submit" disabled={registerMutation.isPending}>
								{registerMutation.isPending ? (
									<Loader2 data-icon="inline-start" className="animate-spin" />
								) : (
									<UserPlus data-icon="inline-start" />
								)}
								Tạo tài khoản
							</Button>
						</form>

						<p className="mt-4 text-xs text-muted-foreground">
							Đã có tài khoản?{" "}
							<Link to="/login" className="text-foreground underline underline-offset-4">
								Quay lại đăng nhập
							</Link>
						</p>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-8 lg:items-end lg:text-right">
					<div className="flex items-center gap-3 lg:flex-row-reverse">
						<div className="flex size-11 items-center justify-center border bg-background shadow-sm">
							<Building2 />
						</div>
						<div>
							<p className="text-xs uppercase tracking-widest text-muted-foreground">
								Trường Đại học
							</p>
							<h1 className="text-xl font-semibold">Hồ sơ truy cập TSMS</h1>
						</div>
					</div>

					<div className="flex max-w-2xl flex-col gap-4">
						<h2 className="text-4xl font-semibold tracking-normal md:text-6xl">
							Khởi tạo tài khoản cho quy trình xếp lịch.
						</h2>
						<p className="max-w-xl text-sm leading-6 text-muted-foreground lg:self-end">
							Tài khoản sau khi tạo sẽ có phiên đăng nhập để tiếp tục vào bảng điều khiển. Phân
							quyền chi tiết theo vai trò sẽ được bổ sung ở các bước phát triển tiếp theo.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
