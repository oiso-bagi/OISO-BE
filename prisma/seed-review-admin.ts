import { PrismaClient, UserProvider, UserRole } from '@prisma/client';
import { PasswordHashService } from '../src/auth/services/password-hash.service';

const prisma = new PrismaClient();
const passwordHashService = new PasswordHashService();
const REVIEW_ADMIN_NICKNAME = '심사위원';

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

async function assertReviewAdminNicknameAvailable(email: string) {
  const nicknameOwner = await prisma.user.findUnique({
    where: { nickname: REVIEW_ADMIN_NICKNAME },
    select: { email: true },
  });

  if (nicknameOwner && nicknameOwner.email !== email) {
    throw new Error(
      `Cannot seed review admin because nickname "${REVIEW_ADMIN_NICKNAME}" is already owned by another user.`,
    );
  }
}

async function main() {
  const { email, password } = getReviewAdminCredentials();
  const passwordHash = passwordHashService.hashPassword(password);

  await assertReviewAdminNicknameAvailable(email);

  await prisma.user.upsert({
    where: { email },
    update: {
      nickname: REVIEW_ADMIN_NICKNAME,
      provider: UserProvider.LOCAL,
      providerId: null,
      role: UserRole.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      nickname: REVIEW_ADMIN_NICKNAME,
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
