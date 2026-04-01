import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import * as multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

@Controller('uploads')
export class UploadsController {
  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Only image uploads are supported'), false);
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return new Promise<{ url: string; publicId: string; fileName: string; mimeType: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tro-assets',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestException(`Upload failed: ${error?.message || 'Unknown error'}`));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            fileName: result.public_id.split('/').pop() || result.asset_id,
            mimeType: result.format,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }
}
