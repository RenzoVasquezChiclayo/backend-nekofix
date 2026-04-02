import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function productsUploadMulterOptions() {
  return {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads', 'products'),
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const safe = ALLOWED_EXT.has(ext) ? ext : '.jpg';
        cb(null, `${randomUUID()}${safe}`);
      },
    }),
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
      cb(null, true);
    },
  };
}
