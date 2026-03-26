"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDemoContext } from "@/features/demo/api";
import { assignMemberRoom, createMember, getMembers, removeMember } from "@/features/members/api";
import { getRooms } from "@/features/rooms/api";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast/toast-context";

const currency = new Intl.NumberFormat("vi-VN");

function getRoleLabel(role?: "OWNER" | "MANAGER" | "TENANT") {
  switch (role) {
    case "OWNER":
      return "Chủ trọ";
    case "MANAGER":
      return "Quản lý";
    case "TENANT":
      return "Thành viên";
    default:
      return "Thành viên";
  }
}

export default function AdminMembersPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("123456");
  const [role, setRole] = useState<"TENANT" | "MANAGER">("TENANT");
  const [roomId, setRoomId] = useState("");
  const [roomSelections, setRoomSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const demoContextQuery = useQuery({
    queryKey: ["demo", "context"],
    queryFn: getDemoContext
  });

  const roomsQuery = useQuery({
    queryKey: ["rooms", demoContextQuery.data?.houseId],
    queryFn: () => getRooms(demoContextQuery.data!.houseId),
    enabled: Boolean(demoContextQuery.data?.houseId)
  });

  const membersQuery = useQuery({
    queryKey: ["members", demoContextQuery.data?.houseId],
    queryFn: () => getMembers(demoContextQuery.data!.houseId),
    enabled: Boolean(demoContextQuery.data?.houseId)
  });

  useEffect(() => {
    if (!membersQuery.data) {
      return;
    }

    setRoomSelections((current) => {
      const next = { ...current };

      for (const member of membersQuery.data) {
        if (member.membershipId) {
          next[member.membershipId] = member.roomId ?? "";
        }
      }

      return next;
    });
  }, [membersQuery.data]);

  const createMemberMutation = useMutation({
    mutationFn: createMember,
    onSuccess: async () => {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("123456");
      setRole("TENANT");
      setRoomId("");
      setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] })
      ]);
      showToast("Đã thêm thành viên thành công.", "success");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Không tạo được thành viên.";
      setError(message);
      showToast(message, "error");
    }
  });

  const assignRoomMutation = useMutation({
    mutationFn: ({ membershipId, roomId: nextRoomId }: { membershipId: string; roomId?: string }) =>
      assignMemberRoom(membershipId, { roomId: nextRoomId || undefined }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] })
      ]);
      showToast("Đã cập nhật phòng cho thành viên.", "success");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không cập nhật được phòng.", "error");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] })
      ]);
      showToast("Đã xóa thành viên khỏi nhà trọ.", "success");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Không xóa được thành viên.", "error");
    }
  });

  const stats = useMemo(() => {
    const members = membersQuery.data ?? [];
    const activeMembers = members.filter((member) => member.isActive);
    const managers = activeMembers.filter((member) => member.role === "MANAGER").length;
    const assignedRooms = activeMembers.filter((member) => member.roomId).length;

    return {
      total: activeMembers.length,
      managers,
      assignedRooms
    };
  }, [membersQuery.data]);

  const handleCreateMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!demoContextQuery.data?.houseId) {
      return;
    }

    createMemberMutation.mutate({
      houseId: demoContextQuery.data.houseId,
      roomId: roomId || undefined,
      fullName,
      email,
      phone: phone || undefined,
      password,
      role
    });
  };

  if (demoContextQuery.isLoading || roomsQuery.isLoading || membersQuery.isLoading) {
    return <Card>Đang tải dữ liệu thành viên...</Card>;
  }

  if (demoContextQuery.error || roomsQuery.error || membersQuery.error || !demoContextQuery.data) {
    return <Card>Không tải được dữ liệu nhà trọ demo.</Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thành viên"
        description="Tạo tài khoản cho người thuê, gán phòng và khóa membership khi rời nhà trọ."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Thành viên đang hoạt động</p>
          <p className="mt-2 text-3xl font-semibold">{currency.format(stats.total)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Quản lý phòng</p>
          <p className="mt-2 text-3xl font-semibold">{currency.format(stats.managers)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Đã được xếp phòng</p>
          <p className="mt-2 text-3xl font-semibold">{currency.format(stats.assignedRooms)}</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Thêm thành viên mới</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-sand/70 p-4 text-sm leading-6 text-black/65">
              Nếu email chưa tồn tại, hệ thống sẽ tạo tài khoản đăng nhập cho người thuê ngay tại đây.
              Người thuê chỉ cần dùng email và mật khẩu tạm để đăng nhập, không cần tự tạo nhà trọ.
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateMember}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fullName">Họ tên</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tenant@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0901234567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu đăng nhập ban đầu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bạn có thể gửi lại mật khẩu này cho người thuê để họ đăng nhập lần đầu.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as "TENANT" | "MANAGER")}
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="TENANT">Thành viên</option>
                  <option value="MANAGER">Quản lý</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="roomId">Gán vào phòng</Label>
                <select
                  id="roomId"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Chưa xếp phòng</option>
                  {roomsQuery.data?.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code ?? room.name} - {room.name}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <p className="text-sm text-coral md:col-span-2">{error}</p> : null}

              <Button className="md:col-span-2" disabled={createMemberMutation.isPending} type="submit">
                {createMemberMutation.isPending ? "Đang tạo..." : "Thêm thành viên"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách thành viên</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {membersQuery.data?.map((member) => (
              <div key={member.membershipId} className="rounded-2xl border border-black/10 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold">{member.fullName}</p>
                      <Badge variant={member.isActive ? "success" : "destructive"}>
                        {member.isActive ? "Đang hoạt động" : "Đã rời đi"}
                      </Badge>
                      <Badge>{getRoleLabel(member.role)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.phone || "Chưa có số điện thoại"} | {member.roomName || "Chưa xếp phòng"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={member.membershipId ? roomSelections[member.membershipId] ?? "" : ""}
                      onChange={(event) =>
                        member.membershipId
                          ? setRoomSelections((current) => ({
                              ...current,
                              [member.membershipId!]: event.target.value
                            }))
                          : undefined
                      }
                      className="h-10 min-w-52 rounded-xl border bg-background px-3 py-2 text-sm"
                      disabled={!member.isActive || !member.membershipId}
                    >
                      <option value="">Chưa xếp phòng</option>
                      {roomsQuery.data?.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.code ?? room.name} - {room.name}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="outline"
                      disabled={!member.isActive || !member.membershipId || assignRoomMutation.isPending}
                      onClick={() =>
                        member.membershipId
                          ? assignRoomMutation.mutate({
                              membershipId: member.membershipId,
                              roomId: roomSelections[member.membershipId]
                            })
                          : undefined
                      }
                    >
                      Lưu phòng
                    </Button>

                    <Button
                      variant="ghost"
                      className="text-coral hover:bg-destructive"
                      disabled={!member.isActive || !member.membershipId || removeMemberMutation.isPending}
                      onClick={() => {
                        if (!member.membershipId || !window.confirm(`Xóa ${member.fullName} khỏi nhà trọ?`)) {
                          return;
                        }

                        removeMemberMutation.mutate(member.membershipId);
                      }}
                    >
                      Xóa khỏi nhà
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
