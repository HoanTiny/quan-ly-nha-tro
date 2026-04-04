import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('Deleting old EVN credentials...');

  const result = await prisma.evnCredential.deleteMany();

  console.log(`Deleted ${result.count} credential(s)`);

  await prisma.$disconnect();
}

main().catch(console.error);
