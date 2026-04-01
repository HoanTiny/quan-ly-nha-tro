'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDemoContext } from '@/features/demo/api';
import {
  createExpense,
  deleteExpense,
  generateSettlement,
  getExpenses,
  getSettlements,
  updateExpense,
} from '@/features/expenses/api';
import { getMembers } from '@/features/members/api';
import { getRooms } from '@/features/rooms/api';
import { uploadImage } from '@/features/uploads/api';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { useToast } from '@/lib/toast/toast-context';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const currency = new Intl.NumberFormat('vi-VN');

function getCategoryLabel(category: string) {
  switch (category) {
    case 'ELECTRIC':
      return 'Điện';
    case 'WATER':
      return 'Nước';
    case 'INTERNET':
      return 'Internet';
    case 'RENT':
      return 'Tiền phòng';
    case 'REPAIR':
      return 'Sửa chữa';
    case 'SHARED_FOOD':
      return 'Ăn uống';
    case 'OTHER':
      return 'Khác';
    default:
      return category;
  }
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-');
  return `${month}/${year}`;
}

function buildDefaultDueDate(monthInput: string) {
  const [year, month] = monthInput.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `${nextYear}-${`${nextMonth}`.padStart(2, '0')}-10`;
}

export default function AdminBillsPage() {
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const ALL_MEMBERS = '__ALL_MEMBERS__';
  const SELECTED_MEMBERS = '__SELECTED_MEMBERS__';
  const UNEQUAL_SPLIT = '__UNEQUAL_SPLIT__';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ELECTRIC');
  const [splitMode, setSplitMode] = useState<
    typeof ALL_MEMBERS | typeof SELECTED_MEMBERS | typeof UNEQUAL_SPLIT
  >(ALL_MEMBERS);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [totalAmount, setTotalAmount] = useState('');
  const [rawTotalAmount, setRawTotalAmount] = useState(''); // Biến lưu trữ giá trị chưa định dạng
  const [roomId, setRoomId] = useState('');
  const [payerUserId, setPayerUserId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantWeights, setParticipantWeights] = useState<Record<string, number>>({});
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(buildDefaultDueDate(currentMonth));
  const [expenseError, setExpenseError] = useState('');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('ELECTRIC');
  const [editAmount, setEditAmount] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');

  const demoContextQuery = useQuery({
    queryKey: ['demo', 'context'],
    queryFn: getDemoContext,
  });

  const roomsQuery = useQuery({
    queryKey: ['rooms', demoContextQuery.data?.houseId],
    queryFn: () => getRooms(demoContextQuery.data!.houseId),
    enabled: Boolean(demoContextQuery.data?.houseId),
  });

  const membersQuery = useQuery({
    queryKey: ['members', demoContextQuery.data?.houseId],
    queryFn: () => getMembers(demoContextQuery.data!.houseId),
    enabled: Boolean(demoContextQuery.data?.houseId),
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', demoContextQuery.data?.houseId, monthInput],
    queryFn: () => getExpenses(demoContextQuery.data!.houseId, monthInput),
    enabled: Boolean(demoContextQuery.data?.houseId),
  });

  const settlementsQuery = useQuery({
    queryKey: ['settlements', demoContextQuery.data?.houseId, monthInput],
    queryFn: () => getSettlements(demoContextQuery.data!.houseId, monthInput),
    enabled: Boolean(demoContextQuery.data?.houseId),
  });

  const activeMembers = useMemo(
    () => (membersQuery.data ?? []).filter((member) => member.isActive),
    [membersQuery.data],
  );

  const scopedMembers = useMemo(() => {
    if (!roomId) {
      return activeMembers;
    }

    return activeMembers.filter((member) => member.roomId === roomId);
  }, [activeMembers, roomId]);

  useEffect(() => {
    if (!activeMembers.length) {
      return;
    }

    if (payerUserId) {
      return;
    }

    setPayerUserId(demoContextQuery.data?.ownerId ?? activeMembers[0].id);
  }, [activeMembers, demoContextQuery.data?.ownerId, payerUserId]);

  useEffect(() => {
    if (!scopedMembers.length) {
      return;
    }

    if (splitMode === ALL_MEMBERS) {
      // Khi chọn "chia đều", tự động chọn tất cả các thành viên trong phạm vi
      const allScopedMemberIds = scopedMembers
        .map((member) => member.membershipId!)
        .filter(Boolean) as string[];
      setParticipantIds(allScopedMemberIds);
    } else if (splitMode === SELECTED_MEMBERS) {
      // Khi chọn "thành viên cụ thể", chỉ giữ lại những thành viên vẫn thuộc phạm vi hiện tại
      const validParticipantIds = participantIds.filter((membershipId) =>
        scopedMembers.some((member) => member.membershipId === membershipId),
      );
      setParticipantIds(validParticipantIds);
    } else if (splitMode === UNEQUAL_SPLIT) {
      // Khi chọn "chia không đều", chọn tất cả và set weight = 1 cho mỗi người
      const allScopedMemberIds = scopedMembers
        .map((member) => member.membershipId!)
        .filter(Boolean) as string[];
      setParticipantIds(allScopedMemberIds);
      setParticipantWeights((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const member of scopedMembers) {
          if (member.membershipId && !(member.membershipId in next)) {
            next[member.membershipId] = 1;
          }
        }
        return next;
      });
    }
  }, [scopedMembers, splitMode]);

  const createExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!demoContextQuery.data?.houseId) {
        throw new Error('Missing house context');
      }

      let receiptImageUrl: string | undefined;
      if (receiptFile) {
        const uploaded = await uploadImage(receiptFile);
        receiptImageUrl = uploaded.url;
      }

      const payload: any = {
        createdById: session?.userId ?? demoContextQuery.data.ownerId,
        houseId: demoContextQuery.data.houseId,
        roomId: roomId || undefined,
        payerUserId:
          payerUserId || session?.userId || demoContextQuery.data.ownerId,
        title,
        description: description || undefined,
        category,
        splitMethod: splitMode === UNEQUAL_SPLIT ? 'BY_WEIGHT' : 'EQUAL',
        totalAmount: Number(totalAmount || 0),
        expenseDate: `${expenseDate}T00:00:00.000Z`,
        receiptImageUrl,
      };

      if (splitMode === SELECTED_MEMBERS || splitMode === UNEQUAL_SPLIT) {
        payload.participantMembershipIds = participantIds;
      }

      if (splitMode === UNEQUAL_SPLIT) {
        payload.participantWeights = participantIds.map((id) => ({
          membershipId: id,
          weight: participantWeights[id] ?? 1,
        }));
      }

      return createExpense(payload);
    },
    onSuccess: async () => {
      setTitle('');
      setDescription('');
      setCategory('ELECTRIC');
      setSplitMode(ALL_MEMBERS);
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setTotalAmount('');
      setRoomId('');
      setReceiptFile(null);
      setExpenseError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['settlements'] }),
      ]);
      showToast('Đã tạo khoản chi và cập nhật bill cho thành viên.', 'success');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Không tạo được khoản chi.';
      setExpenseError(message);
      showToast(message, 'error');
    },
  });

  const generateSettlementMutation = useMutation({
    mutationFn: () => {
      if (!demoContextQuery.data?.houseId) {
        throw new Error('Missing house context');
      }

      const [year, month] = monthInput.split('-').map(Number);
      return generateSettlement({
        houseId: demoContextQuery.data.houseId,
        month,
        year,
        dueDate: `${dueDate}T00:00:00.000Z`,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settlements'] });
      showToast('Đã chốt công nợ tháng thành công.', 'success');
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Không chốt được công nợ tháng.';
      showToast(message, 'error');
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async () => {
      if (!editingExpenseId) {
        throw new Error('Missing expense ID');
      }
      return updateExpense(editingExpenseId, {
        title: editTitle,
        description: editDescription || undefined,
        category: editCategory as any,
        totalAmount: Number(editAmount || 0),
        expenseDate: `${editExpenseDate}T00:00:00.000Z`,
      });
    },
    onSuccess: async () => {
      setEditingExpenseId(null);
      setEditTitle('');
      setEditDescription('');
      setEditCategory('ELECTRIC');
      setEditAmount('');
      setEditExpenseDate('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
      ]);
      showToast('Đã cập nhật khoản chi thành công.', 'success');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Không cập nhật được khoản chi.';
      showToast(message, 'error');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      return deleteExpense(expenseId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
      ]);
      showToast('Đã xóa khoản chi thành công.', 'success');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Không xóa được khoản chi.';
      showToast(message, 'error');
    },
  });

  const handleEditClick = (expense: any) => {
    setEditingExpenseId(expense.id);
    setEditTitle(expense.title);
    setEditDescription(expense.description || '');
    setEditCategory(expense.category);
    setEditAmount(String(expense.amount));
    setEditExpenseDate(expense.expenseDate.slice(0, 10));
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setEditTitle('');
    setEditDescription('');
    setEditCategory('ELECTRIC');
    setEditAmount('');
    setEditExpenseDate('');
  };

  const handleUpdateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateExpenseMutation.mutate();
  };

  const handleDeleteClick = async (expenseId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khoản chi này?')) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  const handleRoomChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRoomId = event.target.value;
    setRoomId(nextRoomId);
  };

  const handleMonthChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextMonth = event.target.value;
    setMonthInput(nextMonth);
    setDueDate(buildDefaultDueDate(nextMonth));
  };

  const handleExpenseSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (splitMode === SELECTED_MEMBERS && participantIds.length === 0) {
      setExpenseError('Hãy chọn ít nhất 1 thành viên để chia bill.');
      return;
    }

    createExpenseMutation.mutate();
  };

  if (
    demoContextQuery.isLoading ||
    roomsQuery.isLoading ||
    membersQuery.isLoading ||
    expensesQuery.isLoading ||
    settlementsQuery.isLoading
  ) {
    return <Card>Đang tải chi phí và settlement...</Card>;
  }

  if (
    demoContextQuery.error ||
    roomsQuery.error ||
    membersQuery.error ||
    expensesQuery.error ||
    settlementsQuery.error ||
    !demoContextQuery.data
  ) {
    return <Card>Không tải được dữ liệu chi phí.</Card>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý chi phí"
        description="Thêm hóa đơn điện nước wifi, upload biên lai và chốt settlement theo từng tháng."
      />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tạo khoản chi mới</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={handleExpenseSubmit}
            >
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Tên khoản chi</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Tiền điện tháng 03"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Danh mục</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="ELECTRIC">Điện</option>
                  <option value="WATER">Nước</option>
                  <option value="INTERNET">Internet</option>
                  <option value="RENT">Tiền phòng</option>
                  <option value="REPAIR">Sửa chữa</option>
                  <option value="SHARED_FOOD">Ăn uống</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="splitMode">Kiểu chia</Label>
                <select
                  id="splitMode"
                  value={splitMode}
                  onChange={(event) =>
                    setSplitMode(event.target.value as typeof splitMode)
                  }
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value={ALL_MEMBERS}>
                    Chia đều cho tất cả người trong phạm vi
                  </option>
                  <option value={SELECTED_MEMBERS}>
                    Chia cho các thành viên cụ thể
                  </option>
                  <option value={UNEQUAL_SPLIT}>
                    Chia không đều (theo hệ số)
                  </option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {splitMode === ALL_MEMBERS
                    ? 'Hệ thống sẽ tự động chia đều cho toàn bộ thành viên trong phạm vi đã chọn.'
                    : splitMode === SELECTED_MEMBERS
                    ? 'Bạn tự chọn đúng những thành viên cần tham gia bill, hệ thống sẽ chia đều trong nhóm đó.'
                    : 'Mỗi thành viên có hệ số chia khác nhau. Ví dụ: A x1 = 30k, B x1 = 30k, C x2 = 60k (tổng 120k).'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Số tiền</Label>
                <Input
                  id="amount"
                  type="text"
                  value={totalAmount ? currency.format(Number(totalAmount)) : ''}
                  onChange={(event) => {
                    const rawValue = event.target.value.replace(/[^\d,]/g, '');
                    setTotalAmount(rawValue);
                  }}
                  placeholder="4,200,000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">Ngày chi</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scopeRoom">Phạm vi</Label>
                <select
                  id="scopeRoom"
                  value={roomId}
                  onChange={handleRoomChange}
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Toàn nhà</option>
                  {roomsQuery.data?.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code ?? room.name} - {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payerUserId">Người thanh toán hóa đơn</Label>
                <select
                  id="payerUserId"
                  value={payerUserId}
                  onChange={(event) => setPayerUserId(event.target.value)}
                  className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Mô tả</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ghi chú thêm nếu cần..."
                  className="min-h-24 w-full rounded-2xl border bg-background px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="receiptImage">Ảnh hóa đơn</Label>
                <Input
                  id="receiptImage"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setReceiptFile(event.target.files?.[0] ?? null)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {receiptFile
                    ? `Đã chọn: ${receiptFile.name}`
                    : 'Chưa chọn file hóa đơn.'}
                </p>
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Thành viên tham gia chia bill</Label>
                  {splitMode === SELECTED_MEMBERS ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-pine"
                      onClick={() =>
                        setParticipantIds(
                          scopedMembers
                            .map((member) => member.membershipId!)
                            .filter(Boolean),
                        )
                      }
                    >
                      Chọn tất cả
                    </button>
                  ) : null}
                </div>

                <div className="rounded-2xl bg-sand px-4 py-3 text-sm text-ink">
                  {splitMode === ALL_MEMBERS ? (
                    <>
                      Đang chia đều cho{' '}
                      <span className="font-semibold">
                        {scopedMembers.length}
                      </span>{' '}
                      thành viên
                      {roomId ? ' trong phòng đã chọn' : ' trong toàn nhà'}.
                    </>
                  ) : splitMode === UNEQUAL_SPLIT ? (
                    <>
                      Đang chọn{' '}
                      <span className="font-semibold">
                        {participantIds.length}
                      </span>{' '}
                      thành viên. Tổng hệ số:{' '}
                      <span className="font-semibold">
                        {participantIds.reduce((sum, id) => sum + (participantWeights[id] ?? 1), 0)}
                      </span>
                    </>
                  ) : (
                    <>
                      Đang chọn{' '}
                      <span className="font-semibold">
                        {participantIds.length}
                      </span>{' '}
                      thành viên cụ thể để chia đều.
                    </>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {scopedMembers.map((member) => {
                    const membershipId = member.membershipId!;
                    const checked =
                      splitMode === ALL_MEMBERS
                        ? true
                        : participantIds.includes(membershipId);

                    return (
                      <label
                        key={membershipId}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                          splitMode === ALL_MEMBERS ? 'bg-secondary/70' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={splitMode === ALL_MEMBERS}
                            onChange={(event) =>
                              setParticipantIds((current) =>
                                event.target.checked
                                  ? [...current, membershipId]
                                  : current.filter(
                                      (item) => item !== membershipId,
                                    ),
                              )
                            }
                          />
                          <span>
                            {member.fullName}
                            <span className="ml-2 text-muted-foreground">
                              {member.roomName || 'Chưa xếp phòng'}
                            </span>
                          </span>
                        </div>
                        {splitMode === UNEQUAL_SPLIT && checked ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">x</span>
                            <select
                              value={participantWeights[membershipId] ?? 1}
                              onChange={(e) =>
                                setParticipantWeights((prev) => ({
                                  ...prev,
                                  [membershipId]: Number(e.target.value),
                                }))
                              }
                              className="h-8 w-16 rounded-lg border bg-background px-2 py-1 text-sm"
                            >
                              <option value={1}>1</option>
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                              <option value={5}>5</option>
                            </select>
                          </div>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>

              {expenseError ? (
                <p className="text-sm text-coral md:col-span-2">
                  {expenseError}
                </p>
              ) : null}

              <Button
                className="md:col-span-2"
                disabled={createExpenseMutation.isPending}
                type="submit"
              >
                {createExpenseMutation.isPending
                  ? 'Đang tạo khoản chi...'
                  : 'Thêm khoản chi'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chốt công nợ tháng</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="monthInput">Tháng</Label>
                <Input
                  id="monthInput"
                  type="month"
                  value={monthInput}
                  onChange={handleMonthChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Hạn đóng</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={generateSettlementMutation.isPending}
                  onClick={() => generateSettlementMutation.mutate()}
                >
                  {generateSettlementMutation.isPending
                    ? 'Đang chốt...'
                    : 'Generate settlement'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settlement đã tạo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settlementsQuery.data?.length ? (
                settlementsQuery.data.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="rounded-2xl border border-black/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {formatMonthLabel(settlement.monthKey)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {settlement.itemsCount} thành viên trong kỳ
                        </p>
                      </div>
                      <Badge
                        variant={
                          settlement.status === 'PAID' ? 'success' : 'warning'
                        }
                      >
                        {settlement.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                      <p>
                        Tổng chi: {currency.format(settlement.totalExpense)} VND
                      </p>
                      <p>Đã thu: {currency.format(settlement.totalPaid)} VND</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  Chưa có settlement cho tháng đang chọn.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Chi phí gần đây</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingExpenseId ? (
            <div className="rounded-2xl border border-black/10 p-4 bg-secondary/50">
              <form onSubmit={handleUpdateSubmit} className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-title">Tên khoản chi</Label>
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-category">Danh mục</Label>
                    <select
                      id="edit-category"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="flex h-10 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                    >
                      <option value="ELECTRIC">Điện</option>
                      <option value="WATER">Nước</option>
                      <option value="INTERNET">Internet</option>
                      <option value="RENT">Tiền phòng</option>
                      <option value="REPAIR">Sửa chữa</option>
                      <option value="SHARED_FOOD">Ăn uống</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-amount">Số tiền</Label>
                    <Input
                      id="edit-amount"
                      type="text"
                      value={editAmount ? currency.format(Number(editAmount)) : ''}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^\d,]/g, '');
                        setEditAmount(rawValue);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-date">Ngày chi</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editExpenseDate}
                      onChange={(e) => setEditExpenseDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-description">Mô tả</Label>
                  <Input
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateExpenseMutation.isPending}
                  >
                    {updateExpenseMutation.isPending ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
          {expensesQuery.data?.length ? (
            expensesQuery.data.map((expense) => (
              <div
                key={expense.id}
                className="rounded-2xl border border-black/10 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{expense.title}</p>
                      <Badge>{getCategoryLabel(expense.category)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(expense.expenseDate).toLocaleDateString(
                        'vi-VN',
                      )}{' '}
                      | Người chi: {expense.payerName ?? 'Không rõ'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {expense.participantCount} người tham gia chia bill
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {currency.format(expense.amount)} VND
                    </p>
                    {expense.receiptImageUrl ? (
                      <Link
                        className="text-sm font-medium text-pine"
                        href={expense.receiptImageUrl}
                        target="_blank"
                      >
                        Xem hóa đơn
                      </Link>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Không có ảnh hóa đơn
                      </p>
                    )}
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        className="text-sm font-medium text-blue-600 hover:underline"
                        onClick={() => handleEditClick(expense)}
                      >
                        Sửa
                      </button>
                      <button
                        className="text-sm font-medium text-red-600 hover:underline"
                        onClick={() => handleDeleteClick(expense.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Chưa có khoản chi nào trong tháng này.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
