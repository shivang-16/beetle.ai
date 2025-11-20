import { logger } from "../../../utils/logger.js";

/**
 * Helper function to upsert a subscriber to MailerLite
 * This is a non-blocking operation - failures are logged as warnings only
 */
export async function upsertMailerLiteSubscriber(email: string, firstName: string, lastName: string): Promise<void> {
    const mailerLiteApiKey = process.env.MAILERLITE_API_TOKEN;
    const mailerLiteGroupId = process.env.MAILERLITE_GROUP_ID || '171347547518928518';
  
    // Skip if API key is not configured
    if (!mailerLiteApiKey) {
      logger.debug('MailerLite API key not configured, skipping subscriber upsert');
      return;
    }
  
    // Skip if email is not available
    if (!email) {
      logger.debug('Email not available, skipping MailerLite subscriber upsert');
      return;
    }
  
    try {
      const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mailerLiteApiKey}`,
        },
        body: JSON.stringify({
          email: email,
          fields: {
            first_name: firstName || '',
            last_name: lastName || '',
          },
          groups: [mailerLiteGroupId],
        }),
      });
  
      if (response.ok) {
        const status = response.status;
        if (status === 201) {
          logger.info(`Subscriber added to MailerLite: ${email}`);
        } else if (status === 200) {
          logger.info(`Subscriber updated in MailerLite: ${email}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        logger.warn(`MailerLite API returned error status ${response.status} for ${email}: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      // Log warning only - don't throw or affect user creation flow
      logger.warn(`Failed to upsert subscriber to MailerLite for ${email}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }