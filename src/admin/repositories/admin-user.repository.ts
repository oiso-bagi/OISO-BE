import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { AdminUserListQueryDto } from '@/admin/dto/admin-list-query.dto';
import { AdminUserListItemDto } from '@/admin/dto/admin-user.dto';
import { PrismaService } from '@/prisma/prisma.service';

const adminUserSelect = {
  id: true,
  email: true,
  nickname: true,
  provider: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type AdminUserSelected = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

type UserTransactionClient = Pick<Prisma.TransactionClient, 'user'>;

@Injectable()
export class AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers(params: AdminUserListQueryDto) {
    const { page, size, q, provider, isActive, role } = params;
    const trimmedQuery = q?.trim();
    const trimmedProvider = provider?.trim();
    const skip = (page - 1) * size;

    const where: Prisma.UserWhereInput = {
      ...(trimmedProvider ? { provider: trimmedProvider } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(role ? { role } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { email: { contains: trimmedQuery, mode: 'insensitive' } },
              { nickname: { contains: trimmedQuery, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalCount, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: adminUserSelect,
      }),
    ]);

    return {
      items: users.map((user) => this.toListItem(user)),
      totalCount,
    };
  }

  runInSerializableTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async findById(id: string, tx: UserTransactionClient = this.prisma) {
    return tx.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });
  }

  async countActiveAdmins(
    tx: UserTransactionClient = this.prisma,
  ): Promise<number> {
    return tx.user.count({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
  }

  async updateActiveStatus(
    id: string,
    isActive: boolean,
    tx: UserTransactionClient = this.prisma,
  ): Promise<AdminUserListItemDto> {
    const updated = await tx.user.update({
      where: { id },
      data: { isActive },
      select: adminUserSelect,
    });

    return this.toListItem(updated);
  }

  async updateRole(
    id: string,
    role: UserRole,
    tx: UserTransactionClient = this.prisma,
  ): Promise<AdminUserListItemDto> {
    const updated = await tx.user.update({
      where: { id },
      data: { role },
      select: adminUserSelect,
    });

    return this.toListItem(updated);
  }

  private toListItem(user: AdminUserSelected): AdminUserListItemDto {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      provider: user.provider,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
