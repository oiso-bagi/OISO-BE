import { PrismaClient, UserProvider, UserRole } from '@prisma/client';
import { PasswordHashService } from '../src/auth/services/password-hash.service';

const prisma = new PrismaClient();
const passwordHashService = new PasswordHashService();

function getReviewAdminCredentials() {
  const email = process.env.REVIEW_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.REVIEW_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'REVIEW_ADMIN_EMAIL and REVIEW_ADMIN_PASSWORD are required.',
    );
  }

  return { email, password };
}

async function main() {
  const { email, password } = getReviewAdminCredentials();
  const passwordHash = passwordHashService.hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: {
      nickname: '심사위원',
      provider: UserProvider.LOCAL,
      providerId: null,
      role: UserRole.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      nickname: '심사위원',
      provider: UserProvider.LOCAL,
      providerId: null,
      role: UserRole.ADMIN,
      passwordHash,
      isActive: true,
    },
  });

  console.log('Review admin account seeded.');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Review admin seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
