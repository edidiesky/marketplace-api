import mongoose, { Types }           from "mongoose";
import { organizationRepository }    from "./organization.repository";
import { AppError }                  from "../../utils/AppError";
import logger                        from "../../utils/logger";
import { requestContext }            from "../../context/requestContext";
import { SERVICE_NAME }              from "../../constant";
import {
  CreateOrganizationDto,
  OrganizationListResponseDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
} from "./organization.dto";
import { IOrganization, OrganizationStatus } from "./organization.model";

function toDto(org: IOrganization): OrganizationResponseDto {
  return {
    organizationId: org._id.toString(),
    ownerId:        org.ownerId.toString(),
    ownerEmail:     org.ownerEmail,
    ownerName:      org.ownerName,
    name:           org?.name!,
    type:           org.type,
    billingPlan:    org.billingPlan,
    trialEndsAt:    org.trialEndsAt,
    status:       org.status,
    createdAt:      org.createdAt,
    updatedAt:      org.updatedAt,
  };
}

function deriveOrgName(ownerName: string, type: string): string {
  if (type === "individual") return `${ownerName}'s Account`;
  if (type === "agency")     return `${ownerName} Agency`;
  return `${ownerName} Organization`;
}

function trialEndsAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}

export const organizationService = {
  async createOrganization(
    dto: CreateOrganizationDto
  ): Promise<OrganizationResponseDto> {
    const existing = await organizationRepository.existsByOwnerId(dto.ownerId);
    if (existing) {
      throw AppError.conflict(
        "An organization already exists for this user."
      );
    }

    const session = await mongoose.startSession();
    let org!: IOrganization;

    await session.withTransaction(async () => {
      org = await organizationRepository.create(
        {
          ownerId:     new Types.ObjectId(dto.ownerId),
          ownerEmail:  dto.ownerEmail,
          ownerName:   dto.ownerName,
          name:        deriveOrgName(dto.ownerName, dto.type),
          type:        dto.type as IOrganization["type"],
          billingPlan: (dto.billingPlan as IOrganization["billingPlan"]) ?? "FREE",
          status:    OrganizationStatus.ACTIVE,
          trialEndsAt: trialEndsAt(),
        },
        session
      );
    });

    session.endSession();

    requestContext.set({ eventType: "organization.created" });

    logger.info("organization_created", {
      event:          "organization_created",
      service:        SERVICE_NAME,
      organizationId: org._id.toString(),
      ownerId:        dto.ownerId,
      requestId:      requestContext.get()?.requestId,
    });

    return toDto(org);
  },

  async getOrganizationById(
    organizationId: string
  ): Promise<OrganizationResponseDto> {
    const org = await organizationRepository.findById(organizationId);
    if (!org) throw AppError.notFound("Organization not found.");
    return toDto(org);
  },

  async getOrganizationByOwnerId(
    ownerId: string
  ): Promise<OrganizationResponseDto> {
    const org = await organizationRepository.findByOwnerId(ownerId);
    if (!org) throw AppError.notFound("Organization not found.");
    return toDto(org);
  },

  async getAllOrganizations(
    page:  number,
    limit: number
  ): Promise<OrganizationListResponseDto> {
    const skip  = (page - 1) * limit;
    const query = {};

    const [orgs, total] = await Promise.all([
      organizationRepository.findAll(query, skip, limit),
      organizationRepository.count(query),
    ]);

    return {
      organizations: orgs.map(toDto),
      totalCount:    total,
      totalPages:    Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async updateOrganization(
    organizationId: string,
    ownerId:        string,
    dto:            UpdateOrganizationDto
  ): Promise<OrganizationResponseDto> {
    const org = await organizationRepository.findById(organizationId);
    if (!org) throw AppError.notFound("Organization not found.");

    if (org.ownerId.toString() !== ownerId) {
      throw AppError.forbidden(
        "You do not have permission to update this organization."
      );
    }

    const updated = await organizationRepository.updateById(
      organizationId,
      dto
    );
    if (!updated) throw AppError.notFound("Organization not found.");

    logger.info("organization_updated", {
      event:          "organization_updated",
      service:        SERVICE_NAME,
      organizationId,
      updatedFields:  Object.keys(dto),
      requestId:      requestContext.get()?.requestId,
    });

    return toDto(updated);
  },
};