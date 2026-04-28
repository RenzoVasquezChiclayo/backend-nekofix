import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadProductImage(
    fileBuffer: Buffer,
    options?: { folder?: string; filename?: string },
  ): Promise<string> {
    try {
      const response = await new Promise<{ secure_url: string }>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: options?.folder ?? 'nekofix/products',
              resource_type: 'image',
              public_id: options?.filename,
              overwrite: false,
            },
            (error, result) => {
              if (error || !result?.secure_url) {
                return reject(error ?? new Error('Cloudinary upload failed'));
              }
              resolve({ secure_url: result.secure_url });
            },
          );

          stream.end(fileBuffer);
        },
      );

      return response.secure_url;
    } catch {
      throw new InternalServerErrorException(
        'No se pudo subir la imagen a Cloudinary',
      );
    }
  }
}
