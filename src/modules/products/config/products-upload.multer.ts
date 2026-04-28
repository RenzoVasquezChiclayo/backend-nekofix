import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function productsUploadMulterOptions() {
  return {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (
      _req: unknown,
      file: { mimetype: string; originalname: string },
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(
          new BadRequestException(
            'Solo se permiten imágenes JPG, JPEG, PNG o WEBP',
          ),
          false,
        );
      }
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      const normalizedExtension = extension ? `.${extension}` : '';
      if (
        normalizedExtension &&
        !ALLOWED_EXT.has(normalizedExtension)
      ) {
        return cb(
          new BadRequestException(
            'Extensión no permitida. Usa JPG, JPEG, PNG o WEBP',
          ),
          false,
        );
      }
      cb(null, true);
    },
  };
}
