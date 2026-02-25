import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from './db';

describe('Prisma client', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Clean up created test data
    for (const id of createdUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('can create and query a user', async () => {
    const user = await prisma.user.create({
      data: { name: 'Test User' },
    });

    createdUserIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('string');
    expect(user.id.length).toBeGreaterThan(0);
    expect(user.name).toBe('Test User');
  });
});