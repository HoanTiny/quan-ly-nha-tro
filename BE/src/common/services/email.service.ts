import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const fromEmail = this.configService.get<string>('SMTP_FROM');

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email service configured with SMTP');
    } else {
      this.logger.warn(
        'SMTP not configured. Email sending is disabled. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env',
      );
    }

    this.logger.log(`Emails will be sent from: ${fromEmail || '(not configured)'}`);
  }

  async sendPasswordReset(email: string, resetLink: string) {
    const fromEmail = this.configService.get<string>('SMTP_FROM') || 'noreply@tro-manager.com';

    if (!this.transporter) {
      // Fallback: log to console for development
      this.logger.log(`[DEV MODE] Password reset link for ${email}: ${resetLink}`);
      return { sent: false, reason: 'SMTP not configured' };
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Tro Manager - Quản lý nhà trọ" <${fromEmail}>`,
      to: email,
      subject: 'Khôi phục mật khẩu Tro Manager',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Khôi phục mật khẩu</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Tro Manager</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Quản lý chi tiêu nhà trọ</p>
            </div>

            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">
              <h2 style="margin-top: 0; color: #333; font-size: 20px;">Khôi phục mật khẩu</h2>

              <p style="color: #555; font-size: 15px;">
                Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản <strong>${email}</strong>.
              </p>

              <p style="color: #555; font-size: 15px;">
                Nhấn vào nút bên dưới để đặt lại mật khẩu mới (link có hiệu lực trong 15 phút):
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);">
                  Đặt lại mật khẩu
                </a>
              </div>

              <p style="color: #555; font-size: 14px;">
                Hoặc copy link này vào trình duyệt:
              </p>
              <p style="background: #e9ecef; padding: 12px; border-radius: 6px; font-size: 13px; word-break: break-all; color: #495057;">
                ${resetLink}
              </p>

              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">

              <p style="color: #6c757d; font-size: 13px; margin: 0;">
                <strong>Lưu ý:</strong>
                <ul style="color: #6c757d; font-size: 13px; margin: 10px 0; padding-left: 20px;">
                  <li>Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.</li>
                  <li>Link khôi phục chỉ có hiệu lực trong <strong>15 phút</strong>.</li>
                  <li>Không chia sẻ link này với bất kỳ ai.</li>
                </ul>
              </p>

              <p style="color: #6c757d; font-size: 13px; margin-top: 20px;">
                Trân trọng,<br>
                <strong>Đội ngũ Tro Manager</strong>
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
              <p style="margin: 0;">Đây là email tự động, vui lòng không trả lời.</p>
              <p style="margin: 8px 0 0 0;">© 2026 Tro Manager. Tất cả quyền được bảo lưu.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Khôi phục mật khẩu Tro Manager

        Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản ${email}.

        Nhấn vào link bên dưới để đặt lại mật khẩu mới (link có hiệu lực trong 15 phút):
        ${resetLink}

        Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.

        Trân trọng,
        Đội ngũ Tro Manager
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${email}: ${errorMessage}`);
      throw error;
    }
  }
}
