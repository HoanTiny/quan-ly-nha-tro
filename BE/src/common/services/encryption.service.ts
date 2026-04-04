import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  cipher: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('EVN_ENCRYPTION_KEY');

    if (!keyHex) {
      this.logger.warn(
        'EVN_ENCRYPTION_KEY not configured. Using a temporary random key. ' +
        'Set EVN_ENCRYPTION_KEY in .env file for production.',
      );
      this.key = crypto.randomBytes(32);
    } else {
      this.key = Buffer.from(keyHex, 'hex');
    }
  }

  /**
   * Encrypt a string value using AES-256-GCM
   */
  encrypt(value: string): EncryptedData {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    return {
      cipher: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  /**
   * Decrypt previously encrypted data
   */
  decrypt(encrypted: EncryptedData): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.cipher, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }
}
