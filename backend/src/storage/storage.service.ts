import {
  randomUUID,
} from 'node:crypto';

import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';

import {
  dirname,
  resolve,
} from 'node:path';

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

type StorageDriver =
  | 'local'
  | 'r2';

interface SaveFileInput {
  folder: string;
  buffer: Buffer;
  extension: string;
  contentType: string;
}

@Injectable()
export class StorageService {
  private readonly driver:
    StorageDriver;

  private readonly r2Client:
    S3Client | null;

  private readonly r2Bucket:
    string | null;

  constructor() {
    this.driver =
      process.env.STORAGE_DRIVER ===
      'r2'
        ? 'r2'
        : 'local';

    if (
      this.driver === 'r2'
    ) {
      const accountId =
        process.env.R2_ACCOUNT_ID;

      const accessKeyId =
        process.env.R2_ACCESS_KEY_ID;

      const secretAccessKey =
        process.env.R2_SECRET_ACCESS_KEY;

      const bucket =
        process.env.R2_BUCKET;

      if (
        !accountId ||
        !accessKeyId ||
        !secretAccessKey ||
        !bucket
      ) {
        throw new Error(
          'R2 storage configuration is incomplete',
        );
      }

      this.r2Bucket =
        bucket;

      this.r2Client =
        new S3Client({
          region:
            'auto',

          endpoint:
            `https://${accountId}.r2.cloudflarestorage.com`,

          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
    } else {
      this.r2Bucket =
        null;

      this.r2Client =
        null;
    }
  }

  async save(
    input: SaveFileInput,
  ) {
    const now =
      new Date();

    const year =
      String(
        now.getUTCFullYear(),
      );

    const month =
      String(
        now.getUTCMonth() + 1,
      ).padStart(
        2,
        '0',
      );

    const extension =
      input.extension.startsWith(
        '.',
      )
        ? input.extension
        : `.${input.extension}`;

    const key =
      `${input.folder}/${year}/${month}/${randomUUID()}${extension}`;

    if (
      this.driver === 'r2'
    ) {
      await this.saveToR2(
        key,
        input.buffer,
        input.contentType,
      );

      return `r2://${key}`;
    }

    const relativePath =
      `uploads/${key}`;

    const absolutePath =
      resolve(
        process.cwd(),
        relativePath,
      );

    await mkdir(
      dirname(
        absolutePath,
      ),
      {
        recursive:
          true,
      },
    );

    await writeFile(
      absolutePath,
      input.buffer,
    );

    return `local://${relativePath}`;
  }

  async read(
    storageLocation: string,
  ): Promise<Buffer> {
    if (
      storageLocation.startsWith(
        'r2://',
      )
    ) {
      const key =
        storageLocation.slice(
          'r2://'.length,
        );

      return this.readFromR2(
        key,
      );
    }

    const relativePath =
      storageLocation.startsWith(
        'local://',
      )
        ? storageLocation.slice(
            'local://'.length,
          )
        : storageLocation;

    const normalizedPath =
      relativePath.replace(
        /\\/g,
        '/',
      );

    try {
      return await readFile(
        resolve(
          process.cwd(),
          normalizedPath,
        ),
      );
    } catch {
      throw new NotFoundException(
        'Stored file not found',
      );
    }
  }

  async delete(
    storageLocation: string,
  ) {
    if (
      storageLocation.startsWith(
        'r2://',
      )
    ) {
      const key =
        storageLocation.slice(
          'r2://'.length,
        );

      await this.deleteFromR2(
        key,
      );

      return;
    }

    const relativePath =
      storageLocation.startsWith(
        'local://',
      )
        ? storageLocation.slice(
            'local://'.length,
          )
        : storageLocation;

    const normalizedPath =
      relativePath.replace(
        /\\/g,
        '/',
      );

    try {
      await unlink(
        resolve(
          process.cwd(),
          normalizedPath,
        ),
      );
    } catch {
      return;
    }
  }

  private async saveToR2(
    key: string,
    buffer: Buffer,
    contentType: string,
  ) {
    if (
      !this.r2Client ||
      !this.r2Bucket
    ) {
      throw new InternalServerErrorException(
        'R2 storage is not configured',
      );
    }

    await this.r2Client.send(
      new PutObjectCommand({
        Bucket:
          this.r2Bucket,

        Key:
          key,

        Body:
          buffer,

        ContentType:
          contentType,
      }),
    );
  }

  private async readFromR2(
    key: string,
  ) {
    if (
      !this.r2Client ||
      !this.r2Bucket
    ) {
      throw new InternalServerErrorException(
        'R2 storage is not configured',
      );
    }

    const response =
      await this.r2Client.send(
        new GetObjectCommand({
          Bucket:
            this.r2Bucket,

          Key:
            key,
        }),
      );

    if (!response.Body) {
      throw new NotFoundException(
        'Stored file not found',
      );
    }

    const bytes =
      await response.Body
        .transformToByteArray();

    return Buffer.from(
      bytes,
    );
  }

  private async deleteFromR2(
    key: string,
  ) {
    if (
      !this.r2Client ||
      !this.r2Bucket
    ) {
      throw new InternalServerErrorException(
        'R2 storage is not configured',
      );
    }

    await this.r2Client.send(
      new DeleteObjectCommand({
        Bucket:
          this.r2Bucket,

        Key:
          key,
      }),
    );
  }
}