"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getDemoContext } from "@/features/demo/api";
import { getMembers } from "@/features/members/api";
import { createRoom, getRooms } from "@/features/rooms/api";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast/toast-context";

export default function AdminRoomsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [floor, setFloor] = useState("");
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

  const createRoomMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: async () => {
      setCode("");
      setName("");
      setCapacity("4");
      setFloor("");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      showToast("Đã tạo phòng mới thành công.", "success");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Không tạo được phòng.";
      setError(message);
      showToast(message, "error");
    }
  });

  const roomMembers = useMemo(() => {
    const lookup = new Map<string, string[]>();

    for (const member of membersQuery.data ?? []) {
      if (!member.isActive || !member.roomId) {
        continue;
      }

      lookup.set(member.roomId, [...(lookup.get(member.roomId) ?? []), member.fullName]);
    }

    return lookup;
  }, [membersQuery.data]);

  const handleCreateRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!demoContextQuery.data?.houseId) {
      return;
    }

    createRoomMutation.mutate({
      houseId: demoContextQuery.data.houseId,
      code,
      name: name || undefined,
      capacity: Number(capacity),
      floor: floor ? Number(floor) : undefined
    });
  };

  if (demoContextQuery.isLoading || roomsQuery.isLoading || membersQuery.isLoading) {
    return <Card>Đang tải phòng trọ...</Card>;
  }

  if (demoContextQuery.error || roomsQuery.error || membersQuery.error || !demoContextQuery.data) {
    return <Card>Không tải được dữ liệu phòng.</Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý phòng"
        description="Thêm phòng mới, theo dõi sức chứa và xem nhanh ai đang ở từng phòng."
      />

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tạo phòng mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateRoom}>
              <div className="space-y-2">
                <Label htmlFor="code">Mã phòng</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="A101"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Phòng A101"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Sức chứa</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">Tầng</Label>
                <Input
                  id="floor"
                  type="number"
                  value={floor}
                  onChange={(event) => setFloor(event.target.value)}
                  placeholder="1"
                />
              </div>

              {error ? <p className="text-sm text-coral md:col-span-2">{error}</p> : null}

              <Button className="md:col-span-2" disabled={createRoomMutation.isPending} type="submit">
                {createRoomMutation.isPending ? "Đang tạo..." : "Thêm phòng"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roomsQuery.data?.map((room) => {
            const activeMembers = room.activeMembers ?? 0;
            const occupants = roomMembers.get(room.id) ?? [];

            return (
              <Card key={room.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {room.code ?? room.name}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{room.name}</h2>
                  </div>
                  <Badge variant={activeMembers > 0 ? "warning" : "secondary"}>
                    {activeMembers}/{room.capacity ?? 0}
                  </Badge>
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Tầng {room.floor ?? "-"}</p>
                  <p className="mt-1">
                    {activeMembers > 0 ? "Đang có người ở" : "Phòng trống"}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Thành viên trong phòng</p>
                  {occupants.length ? (
                    occupants.map((occupant) => (
                      <div key={occupant} className="rounded-xl bg-secondary px-3 py-2 text-sm">
                        {occupant}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      Chưa có thành viên nào được xếp vào phòng này.
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
