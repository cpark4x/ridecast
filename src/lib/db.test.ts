import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from './db';

// Run `docker compose up -d db` to start the database and enable these tests.
const dbAvailable = await prisma.$queryRaw`SELECT 1`
  .then(() => true)
  .catch(() => false);

describe.skipIf(!dbAvailable)('Prisma client', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Clean up created test data
    for (const id of createdUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => {}); // Ignore if already deleted
    }
    await prisma.$disconnect();
  });

  it('can create and query a user', async () => {
    const testId = `test-user-${Math.random().toString(36).slice(2)}`;
    const user = await prisma.user.create({
      data: { id: testId, name: 'Test User' },
    });

    createdUserIds.push(user.id);

    expect(user.id).toBe(testId);
    expect(user.name).toBe('Test User');
  });
});
