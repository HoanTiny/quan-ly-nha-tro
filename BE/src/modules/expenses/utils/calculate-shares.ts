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

    return { ...participant, weight: participant.weight ?? 1 };
  });

  const totalWeight = weightedParticipants.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  const totalCents = Math.round(totalAmount * 100);
  const rawShares = weightedParticipants.map((item) => ({
    userId: item.userId,
    cents: (totalCents * (item.weight ?? 1)) / totalWeight,
  }));

  const rounded = rawShares.map((item) => ({
    userId: item.userId,
    cents: Math.floor(item.cents),
    fraction: item.cents - Math.floor(item.cents),
  }));

  let remainder = totalCents - rounded.reduce((sum, item) => sum + item.cents, 0);
  rounded.sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; index < remainder; index += 1) {
    rounded[index].cents += 1;
  }

  return Object.fromEntries(
    rounded.map((item) => [item.userId, Number((item.cents / 100).toFixed(2))]),
  );
}
