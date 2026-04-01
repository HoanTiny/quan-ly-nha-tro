import { SplitMethod } from '@prisma/client';

type Participant = {
  userId: string;
  roomId?: string | null;
  weight?: number;
};

export function calculateShares(
  totalAmount: number,
  participants: Participant[],
  method: SplitMethod,
) {
  const roomCounts = participants.reduce<Record<string, number>>((acc, p) => {
    const roomKey = p.roomId ?? 'NO_ROOM';
    acc[roomKey] = (acc[roomKey] ?? 0) + 1;
    return acc;
  }, {});

  const weightedParticipants = participants.map((participant) => {
    if (method === 'BY_ROOM') {
      const roomSize = roomCounts[participant.roomId ?? 'NO_ROOM'] ?? 1;
      return { ...participant, weight: 1 / roomSize };
    }

    if (method === 'BY_WEIGHT') {
      return { ...participant, weight: participant.weight ?? 1 };
    }

    return { ...participant, weight: participant.weight ?? 1 };
  });

  const totalWeight = weightedParticipants.reduce((sum, item) => sum + (item.weight ?? 1), 0);

  // Làm tròn lên đến đơn vị nghìn đồng
  const rawShares = weightedParticipants.map((item) => ({
    userId: item.userId,
    amount: (totalAmount * (item.weight ?? 1)) / totalWeight,
  }));

  const rounded = rawShares.map((item) => ({
    userId: item.userId,
    amount: Math.ceil(item.amount / 1000) * 1000,
    fraction: item.amount - Math.ceil(item.amount / 1000) * 1000,
  }));

  // Nếu tổng vượt quá, trừ dần từ những phần có fraction nhỏ nhất (gần 0 nhất)
  let remainder = rounded.reduce((sum, item) => sum + item.amount, 0) - totalAmount;
  rounded.sort((a, b) => a.fraction - b.fraction);

  // Phân phối phần dư bằng cách trừ 1000 từ các phần tử, có thể lặp lại nếu cần
  let index = 0;
  while (remainder >= 1000) {
    rounded[index % rounded.length].amount -= 1000;
    remainder -= 1000;
    index += 1;
  }

  return Object.fromEntries(
    rounded.map((item) => [item.userId, item.amount]),
  );
}
