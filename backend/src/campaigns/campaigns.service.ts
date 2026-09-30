import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CampaignRole,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  deadline?: string | null;
}

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  findAll(userId: number) {
    return this.prisma.campaign.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },

      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },

        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    name: string,
    ownerId: number,
    description?: string,
    deadline?: string | null,
  ) {
    if (!name?.trim()) {
      throw new BadRequestException(
        'Campaign name is required',
      );
    }

    const owner =
      await this.prisma.user.findUnique({
        where: {
          id: ownerId,
        },

        select: {
          id: true,
        },
      });

    if (!owner) {
      throw new NotFoundException(
        'Campaign owner not found',
      );
    }

    const parsedDeadline =
      this.parseDeadline(
        deadline,
      );

    return this.prisma.$transaction(
      async (tx) => {
        const campaign =
          await tx.campaign.create({
            data: {
              name: name.trim(),

              description:
                description?.trim() ||
                null,

              deadline:
                parsedDeadline,

              ownerId,

              members: {
                create: {
                  userId: ownerId,
                  role: CampaignRole.ADMIN,
                },
              },
            },

            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },

              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'CAMPAIGN_CREATED',

            entityType:
              'Campaign',

            entityId:
              campaign.id,

            userId:
              ownerId,

            details:
              JSON.stringify({
                name:
                  campaign.name,

                description:
                  campaign.description,

                deadline:
                  campaign.deadline,

                ownerId,
              }),
          },
        });

        return campaign;
      },
    );
  }

  async updateCampaign(
    campaignId: number,
    actorUserId: number,
    input: UpdateCampaignInput,
  ) {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.getManageableCampaign(
        campaignId,
        actorUserId,
      );

    const nextName =
      input.name === undefined
        ? campaign.name
        : input.name.trim();

    if (!nextName) {
      throw new BadRequestException(
        'Campaign name is required',
      );
    }

    const nextDescription =
      input.description === undefined
        ? campaign.description
        : input.description?.trim() ||
          null;

    const nextDeadline =
      input.deadline === undefined
        ? campaign.deadline
        : this.parseDeadline(
            input.deadline,
          );

    return this.prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.campaign.update({
            where: {
              id: campaignId,
            },

            data: {
              name:
                nextName,

              description:
                nextDescription,

              deadline:
                nextDeadline,
            },

            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },

              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'CAMPAIGN_UPDATED',

            entityType:
              'Campaign',

            entityId:
              campaignId,

            userId:
              actorUserId,

            details:
              JSON.stringify({
                before: {
                  name:
                    campaign.name,

                  description:
                    campaign.description,

                  deadline:
                    campaign.deadline,
                },

                after: {
                  name:
                    updated.name,

                  description:
                    updated.description,

                  deadline:
                    updated.deadline,
                },
              }),
          },
        });

        return updated;
      },
    );
  }

  async getMembers(
    campaignId: number,
    actorUserId: number,
  ) {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id: campaignId,
        },

        include: {
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },

          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },

            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    const membership =
      campaign.members.find(
        (member) =>
          member.userId ===
          actorUserId,
      );

    const isOwner =
      campaign.ownerId ===
      actorUserId;

    if (
      !isOwner &&
      !membership
    ) {
      throw new ForbiddenException(
        'You do not have access to this campaign',
      );
    }

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,

        owner: {
          ...campaign.owner,
          role: 'OWNER',
        },
      },

      members:
        campaign.members.map(
          (member) => ({
            id: member.id,

            campaignId:
              member.campaignId,

            userId:
              member.userId,

            role:
              member.role,

            isOwner:
              member.userId ===
              campaign.ownerId,

            user:
              member.user,

            createdAt:
              member.createdAt,
          }),
        ),
    };
  }

  async addMember(
    campaignId: number,
    actorUserId: number,
    email: string,
    role: string,
  ) {
    this.validateCampaignId(
      campaignId,
    );

    const campaign =
      await this.getManageableCampaign(
        campaignId,
        actorUserId,
      );

    const parsedRole =
      this.parseRole(
        role,
      );

    if (!email?.trim()) {
      throw new BadRequestException(
        'Email is required',
      );
    }

    const normalizedEmail =
      email.trim();

    const targetUser =
      await this.prisma.user.findFirst({
        where: {
          email: {
            equals:
              normalizedEmail,

            mode:
              'insensitive',
          },
        },

        select: {
          id: true,
          email: true,
          name: true,
        },
      });

    if (!targetUser) {
      throw new NotFoundException(
        'User with this email was not found',
      );
    }

    if (
      targetUser.id ===
      campaign.ownerId
    ) {
      throw new BadRequestException(
        'Campaign owner is already part of the campaign',
      );
    }

    const existingMembership =
      await this.prisma.campaignMember.findUnique({
        where: {
          campaignId_userId: {
            campaignId,
            userId:
              targetUser.id,
          },
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of this campaign',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const membership =
          await tx.campaignMember.create({
            data: {
              campaignId,

              userId:
                targetUser.id,

              role:
                parsedRole,
            },

            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'CAMPAIGN_MEMBER_ADDED',

            entityType:
              'CampaignMember',

            entityId:
              membership.id,

            userId:
              actorUserId,

            details:
              JSON.stringify({
                campaignId,

                memberId:
                  membership.id,

                memberUserId:
                  targetUser.id,

                memberEmail:
                  targetUser.email,

                role:
                  parsedRole,
              }),
          },
        });

        return {
          message:
            'Campaign member added successfully',

          member:
            membership,
        };
      },
    );
  }

  async updateMemberRole(
    campaignId: number,
    memberId: number,
    actorUserId: number,
    role: string,
  ) {
    this.validateCampaignId(
      campaignId,
    );

    this.validateMemberId(
      memberId,
    );

    const campaign =
      await this.getManageableCampaign(
        campaignId,
        actorUserId,
      );

    const parsedRole =
      this.parseRole(
        role,
      );

    const membership =
      await this.prisma.campaignMember.findFirst({
        where: {
          id: memberId,
          campaignId,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Campaign member not found',
      );
    }

    if (
      membership.userId ===
      campaign.ownerId
    ) {
      throw new ForbiddenException(
        'Campaign owner role cannot be changed',
      );
    }

    if (
      membership.role ===
      parsedRole
    ) {
      return {
        message:
          'Campaign member already has this role',

        member:
          membership,
      };
    }

    const previousRole =
      membership.role;

    return this.prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.campaignMember.update({
            where: {
              id: memberId,
            },

            data: {
              role:
                parsedRole,
            },

            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            action:
              'CAMPAIGN_MEMBER_ROLE_CHANGED',

            entityType:
              'CampaignMember',

            entityId:
              memberId,

            userId:
              actorUserId,

            details:
              JSON.stringify({
                campaignId,

                memberId,

                memberUserId:
                  updated.userId,

                memberEmail:
                  updated.user.email,

                fromRole:
                  previousRole,

                toRole:
                  parsedRole,
              }),
          },
        });

        return {
          message:
            'Campaign member role updated successfully',

          member:
            updated,
        };
      },
    );
  }

  async removeMember(
    campaignId: number,
    memberId: number,
    actorUserId: number,
  ) {
    this.validateCampaignId(
      campaignId,
    );

    this.validateMemberId(
      memberId,
    );

    const campaign =
      await this.getManageableCampaign(
        campaignId,
        actorUserId,
      );

    const membership =
      await this.prisma.campaignMember.findFirst({
        where: {
          id: memberId,
          campaignId,
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Campaign member not found',
      );
    }

    if (
      membership.userId ===
      campaign.ownerId
    ) {
      throw new ForbiddenException(
        'Campaign owner cannot be removed',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.campaignMember.delete({
          where: {
            id:
              memberId,
          },
        });

        await tx.auditLog.create({
          data: {
            action:
              'CAMPAIGN_MEMBER_REMOVED',

            entityType:
              'CampaignMember',

            entityId:
              memberId,

            userId:
              actorUserId,

            details:
              JSON.stringify({
                campaignId,

                memberId,

                memberUserId:
                  membership.userId,

                memberEmail:
                  membership.user.email,

                previousRole:
                  membership.role,
              }),
          },
        });

        return {
          message:
            'Campaign member removed successfully',

          removedMember: {
            id:
              membership.id,

            userId:
              membership.userId,

            role:
              membership.role,

            user:
              membership.user,
          },
        };
      },
    );
  }

  private async getManageableCampaign(
    campaignId: number,
    actorUserId: number,
  ) {
    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id:
            campaignId,
        },

        include: {
          members:
            true,
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    const actorMembership =
      campaign.members.find(
        (member) =>
          member.userId ===
          actorUserId,
      );

    const isOwner =
      campaign.ownerId ===
      actorUserId;

    const isAdmin =
      actorMembership?.role ===
      CampaignRole.ADMIN;

    if (
      !isOwner &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'Only campaign owner or admin can manage this campaign',
      );
    }

    return campaign;
  }

  private parseRole(
    role: string,
  ): CampaignRole {
    if (
      role ===
        CampaignRole.MAKER ||
      role ===
        CampaignRole.CHECKER ||
      role ===
        CampaignRole.ADMIN
    ) {
      return role as CampaignRole;
    }

    throw new BadRequestException(
      'Role must be MAKER, CHECKER, or ADMIN',
    );
  }

  private parseDeadline(
    deadline?: string | null,
  ) {
    if (
      deadline === undefined ||
      deadline === null ||
      deadline.trim() === ''
    ) {
      return null;
    }

    const value =
      deadline.trim();

    const parsed =
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
        ? new Date(
            `${value}T00:00:00.000Z`,
          )
        : new Date(value);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      throw new BadRequestException(
        'Campaign deadline is invalid',
      );
    }

    return parsed;
  }

  private validateCampaignId(
    campaignId: number,
  ) {
    if (
      !Number.isInteger(
        campaignId,
      ) ||
      campaignId <= 0
    ) {
      throw new BadRequestException(
        'campaignId must be a positive integer',
      );
    }
  }

  private validateMemberId(
    memberId: number,
  ) {
    if (
      !Number.isInteger(
        memberId,
      ) ||
      memberId <= 0
    ) {
      throw new BadRequestException(
        'memberId must be a positive integer',
      );
    }
  }
}
