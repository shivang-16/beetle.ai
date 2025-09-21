import nodemailer from 'nodemailer';
import { 
  MailServiceConfig, 
  AnalysisCompleteOptions, 
  AnalysisErrorOptions, 
  WelcomeOptions, 
  PasswordResetOptions, 
  MarketingOptions, 
  CustomMailOptions 
} from './types.js';
import { 
  analysisCompleteTemplate, 
  analysisErrorTemplate, 
  welcomeTemplate, 
} from './mail_templates/index.js';
import dotenv from "dotenv";

dotenv.config();

export class MailService {
  private transporter: nodemailer.Transporter;
  private config: MailServiceConfig;
  private rateLimitMap: Map<string, number[]> = new Map();

  constructor(config: MailServiceConfig) {
    // Use provided auth credentials or fallback to environment variables
    const authUser = config.auth?.user || process.env.SMTP_USER || '';
    const authPass = config.auth?.pass || process.env.SMTP_PASS || '';

    console.log(authUser, authPass, "auth user and pass")
    
    // Use auth user as from address if provided, otherwise use config.from or env fallback
    const fromAddress = config.auth?.user || process.env.SMTP_USER;
    
    this.config = {
      ...config,
      from: fromAddress
    };
    
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: authUser,
        pass: authPass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  private checkRateLimit(email: string): boolean {
    if (!this.config.rateLimitPerMinute) return true;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    if (!this.rateLimitMap.has(email)) {
      this.rateLimitMap.set(email, []);
    }
    
    const timestamps = this.rateLimitMap.get(email)!;
    const recentTimestamps = timestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (recentTimestamps.length >= this.config.rateLimitPerMinute) {
      return false;
    }
    
    recentTimestamps.push(now);
    this.rateLimitMap.set(email, recentTimestamps);
    return true;
  }

  private async sendEmail(to: string, subject: string, html: string, from?: string): Promise<void> {
    if (!this.checkRateLimit(to)) {
      throw new Error('Rate limit exceeded for this email address');
    }

    const mailOptions = {
      from: from || this.config.from,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analysis related emails
  async analysisComplete(options: AnalysisCompleteOptions): Promise<void> {
    const subject = `Analysis Complete - ${options.repositoryName}`;
    const html = analysisCompleteTemplate(options);
    await this.sendEmail(options.to, subject, html, options.from);
  }

  async analysisError(options: AnalysisErrorOptions): Promise<void> {
    const subject = `Analysis Failed - ${options.repositoryName}`;
    const html = analysisErrorTemplate(options);
    await this.sendEmail(options.to, subject, html, options.from);
  }

  // User management emails
  async welcome(options: WelcomeOptions): Promise<void> {
    const subject = 'Welcome to CodeDetector.ai!';
    const html = welcomeTemplate(options);
    await this.sendEmail(options.to, subject, html, options.from);
  }

  // Marketing emails
  async marketing(options: MarketingOptions): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${options.username}!</h2>
        <div>${options.content}</div>
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="${options.unsubscribeLink}">Unsubscribe</a> | 
          <a href="${options.preferencesLink}">Email Preferences</a>
        </p>
      </div>
    `;
    await this.sendEmail(options.to, options.subject, html, options.from);
  }

  // Custom emails
  async custom(options: CustomMailOptions): Promise<void> {
    await this.sendEmail(options.to, options.subject, options.htmlContent, options.from);
  }

  // Utility methods
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Mail service connection failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    this.transporter.close();
  }
}

// Create and export a default instance
const defaultConfig: MailServiceConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  rateLimitPerMinute: parseInt(process.env.MAIL_RATE_LIMIT || '10'),
};

console.log("📧 Mail service config:", {
  host: defaultConfig.host,
  port: defaultConfig.port,
  secure: defaultConfig.secure,
  hasSmtpUser: !!process.env.SMTP_USER,
  hasSmtpPass: !!process.env.SMTP_PASS
});

export const mailService = new MailService(defaultConfig);
console.log("📧 MailService instance created successfully");

// Export types for convenience
export * from './types.js';
