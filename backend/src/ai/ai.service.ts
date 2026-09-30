import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  StorageService,
} from '../storage/storage.service.js';

import {
  LlmGatewayService,
  MarketingAssetInput,
} from './llm-gateway.service.js';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly llmGateway:
      LlmGatewayService,

    private readonly storage:
      StorageService,
  ) {}

  private async loadMarketingAsset(
    versionId: number,
  ) {
    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            versionId,
        },

        include: {
          asset:
            true,
        },
      });

    if (!version) {
      throw new NotFoundException(
        `AssetVersion ${versionId} not found`,
      );
    }

    if (
      !version.mimeType
    ) {
      throw new BadRequestException(
        'Asset version has no MIME type',
      );
    }

    const buffer =
      await this.storage.read(
        version.fileUrl,
      );

    if (
      !buffer ||
      buffer.length ===
        0
    ) {
      throw new NotFoundException(
        'Asset file is empty or unavailable',
      );
    }

    const base64 =
      buffer.toString(
        'base64',
      );

    let marketingAsset:
      MarketingAssetInput;

    if (
      version.mimeType.startsWith(
        'image/',
      )
    ) {
      marketingAsset = {
        kind:
          'image',

        imageDataUrl:
          `data:${version.mimeType};base64,${base64}`,
      };
    } else if (
      version.mimeType ===
      'application/pdf'
    ) {
      marketingAsset = {
        kind:
          'pdf',

        fileName:
          version.fileName,

        fileData:
          `data:application/pdf;base64,${base64}`,
      };
    } else {
      throw new BadRequestException(
        `Unsupported marketing asset type: ${version.mimeType}`,
      );
    }

    return {
      version,
      marketingAsset,
    };
  }

  async analyzeVersion(
    versionId: number,
  ) {
    const {
      version,
      marketingAsset,
    } =
      await this.loadMarketingAsset(
        versionId,
      );

    const analysis =
      await this.llmGateway.describeAsset(
        marketingAsset,
      );

    return {
      success:
        true,

      versionId:
        version.id,

      versionNumber:
        version.versionNumber,

      assetId:
        version.assetId,

      assetName:
        version.asset.name,

      campaignId:
        version.asset.campaignId,

      fileName:
        version.fileName,

      mimeType:
        version.mimeType,

      model:
        'gpt-5.6-luna',

      analysis,
    };
  }

  async scoreVersion(
    versionId: number,
  ) {
    const {
      version,
      marketingAsset,
    } =
      await this.loadMarketingAsset(
        versionId,
      );

    const campaignId =
      version.asset.campaignId;

    const result =
      await this.llmGateway.scoreAssetCompliance(
        marketingAsset,
        campaignId,
      );

    return {
      versionId:
        version.id,

      versionNumber:
        version.versionNumber,

      campaignId,

      model:
        'gpt-5.6-luna',

      promptVersion:
        '3.0',

      checks: [
        {
          checkType:
            'FOREIGN_LOGO' as const,

          score:
            result.foreignLogo.score,

          reason:
            result.foreignLogo.reason,

          ruleReference:
            result.foreignLogo.ruleReference,

          sourceQuote:
            result.foreignLogo.sourceQuote,

          uncertainty:
            result.foreignLogo.uncertainty,
        },

        {
          checkType:
            'BRAND_COMPLIANCE' as const,

          score:
            result.brandCompliance.score,

          reason:
            result.brandCompliance.reason,

          ruleReference:
            result.brandCompliance.ruleReference,

          sourceQuote:
            result.brandCompliance.sourceQuote,

          uncertainty:
            result.brandCompliance.uncertainty,
        },

        {
          checkType:
            'MAS_ADVERTISING' as const,

          score:
            result.masAdvertising.score,

          reason:
            result.masAdvertising.reason,

          ruleReference:
            result.masAdvertising.ruleReference,

          sourceQuote:
            result.masAdvertising.sourceQuote,

          uncertainty:
            result.masAdvertising.uncertainty,
        },
      ],
    };
  }
}
