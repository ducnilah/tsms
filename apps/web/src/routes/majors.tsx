import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@tsms/ui/components/button";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { Skeleton } from "@tsms/ui/components/skeleton";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@tsms/ui/components/card";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { orpc } from "@/utils/orpc";
import { hasPermission } from "@/utils/permissions";

type MajorStatus = "active" | "inactive";

type MajorItem = {
  id: number;
  name: string;
  code: string;
  facultyId: number;
  description: string | null;
  status: MajorStatus;
  programCount: number;
}

type FacultyOption = {
  id: number;
  code: string;
  name: string;
  status: MajorStatus;
}

export const Route = createFileRoute("/majors")({
	component: MajorsRoute,
});

function MajorsRoute() {
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
	const canRead = hasPermission(permissionMap, "majors", "read");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [facultyFilterId, setFacultyFilterId] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState(0);
  const limit = 6;

  const majorsQuery = useQuery({
    ...orpc["majors.list"].queryOptions({
      input: {
        page,
        limit,
        search: search.trim() || undefined,
        facultyId: facultyFilterId || undefined,
        status: statusFilter ? (statusFilter as MajorStatus) : undefined,
      }
    }),
    enabled: canRead,
    meta: { skipErrorToast: true },
  })

  const facultiesQuery = useQuery({
    ...orpc["faculties.options"].queryOptions(),
    enabled: Boolean(currentUser) && canRead,
    meta: { skipErrorToast: true },
  })

  const majors = (majorsQuery.data?.majors ?? []) as MajorItem[];
  const faculties = (facultiesQuery.data?.faculties ?? []) as FacultyOption[];
  const pagination = majorsQuery.data?.pagination;

  const getFacultyName = (facultyId: number) => {
    return faculties.find((item) => item.id === facultyId)?.name ?? "Không xác định";
  };

  useEffect(() => {
    if (selectedMajorId === 0 && majors.length > 0) {
      setSelectedMajorId(majors[0].id);
    }
  }, [majors, selectedMajorId]);

  useEffect(() => {
    if (majors.length === 0) {
      setSelectedMajorId(0);
      return;
    }

    if (!majors.some((item) => item.id === selectedMajorId)) {
      setSelectedMajorId(majors[0].id);
    }
  }, [majors, selectedMajorId]);

  const canGoPrevious = Boolean(pagination && pagination.page > 1);
  const canGoNext = Boolean(
    pagination && pagination.totalPages > 0 && pagination.page < pagination.totalPages,
  );

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
				pageTitle="Quản lý ngành học"
				pageDescription="Tài khoản này không có quyền xem khu vực quản lý ngành học."
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
			pageTitle="Quản lý ngành học"
			pageDescription="Quản lý ngành đào tạo, khoa phụ trách và các chương trình đào tạo thuộc ngành."
		>
			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_420px]">
				<Card>
          <CardHeader>
            <CardTitle>Danh sách ngành học</CardTitle>
            <CardDescription>
              Tìm kiếm, lọc và chọn một ngành để xem chi tiết.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="major-search">Tìm kiếm</Label>
                <Input
                  id="major-search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Nhập mã ngành hoặc tên ngành..."
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="major-filter-faculty">Khoa quản lý</Label>
                  <select
                    id="major-filter-faculty"
                    className="h-9 border bg-background px-3 text-sm"
                    value={facultyFilterId}
                    onChange={(event) => {
                      setFacultyFilterId(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={0}>Tất cả khoa</option>
                    {faculties.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="major-filter-status">Trạng thái</Label>
                  <select
                    id="major-filter-status"
                    className="h-9 border bg-background px-3 text-sm"
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              {pagination ? (
                <div className="flex flex-col gap-2 border bg-muted/30 px-3 py-2 text-muted-foreground text-xs md:flex-row md:items-center md:justify-between">
                  <span>
                    Trang {pagination.page} / {Math.max(pagination.totalPages, 1)} •{" "}
                    {pagination.total} bản ghi
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canGoPrevious}
                      onClick={() => setPage(pagination.page - 1)}
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canGoNext}
                      onClick={() => setPage(pagination.page + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {majorsQuery.isLoading || facultiesQuery.isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : majorsQuery.error || facultiesQuery.error ? (
              <p className="text-destructive text-sm">
                Không thể tải danh sách ngành học.
              </p>
            ) : majors.length === 0 ? (
              <div className="border border-dashed p-6 text-center text-muted-foreground text-sm">
                Không tìm thấy ngành học phù hợp.
              </div>
            ) : (
              <div className="overflow-x-auto border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted text-left text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="p-3">Mã ngành</th>
                      <th className="p-3">Tên ngành</th>
                      <th className="p-3">Khoa</th>
                      <th className="p-3">CTĐT</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {majors.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedMajorId(item.id)}
                        className={
                          selectedMajorId === item.id
                            ? "cursor-pointer border-t bg-muted/70"
                            : "cursor-pointer border-t hover:bg-muted/40"
                        }
                      >
                        <td className="p-3 font-medium">{item.code}</td>
                        <td className="p-3">{item.name}</td>
                        <td className="p-3">{getFacultyName(item.facultyId)}</td>
                        <td className="p-3">{item.programCount}</td>
                        <td className="p-3">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
			</div>
		</AppShell>
	);
}
