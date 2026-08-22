import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '@/config';
import type { IStorageService, UploadResult } from '@/core/interfaces/storage.interface';

export class S3StorageService implements IStorageService {
    private readonly client: S3Client;
    private readonly bucket: string;

    constructor() {
        this.client = new S3Client({
            endpoint: config.aws.endpoint,
            region: config.aws.region,
            credentials: {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
            },
            forcePathStyle: true,
        });
        this.bucket = config.aws.s3Bucket;
    }

    async upload(buffer: Buffer, folder: string, filename?: string): Promise<UploadResult> {
        const key = filename ? `${folder}/${filename}` : `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const upload = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: 'application/octet-stream',
            },
        });
        await upload.done();
        const url = `${config.aws.endpoint}/${this.bucket}/${key}`;
        return { url, publicId: key };
    }

    async delete(publicId: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: publicId,
            }),
        );
    }

    async ensureBucket(): Promise<void> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucket,
                    Key: '.floci-keep',
                    Body: '',
                }),
            );
        } catch {
            try {
                const { CreateBucketCommand } = await import('@aws-sdk/client-s3');
                await this.client.send(
                    new CreateBucketCommand({ Bucket: this.bucket }),
                );
            } catch (err: any) {
                if (err.name !== 'BucketAlreadyOwnedByYou' && err.name !== 'BucketAlreadyExists') {
                    throw err;
                }
            }
        }
    }
}

export const s3StorageService = new S3StorageService();
