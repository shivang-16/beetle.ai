export const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeDetector.ai</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
      <tr>
        <td style="padding: 40px 20px; text-align: center;">
          <div style="display: inline-flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background-color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px; font-weight: bold; color: #667eea;">&lt;/&gt;</span>
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
              CodeDetector.ai
            </h1>
          </div>
          <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
            AI-Powered Code Analysis & Security
          </p>
        </td>
      </tr>
    </table>

    <!-- Content -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 40px 30px;">
          ${content}
        </td>
      </tr>
    </table>

    <!-- Footer -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 30px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="text-align: left; vertical-align: top; width: 60%;">
                <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                  <div style="width: 24px; height: 24px; background-color: #667eea; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 14px; font-weight: bold; color: #ffffff;">&lt;/&gt;</span>
                  </div>
                  <span style="font-size: 18px; font-weight: 600; color: #1a202c;">CodeDetector.ai</span>
                </div>
                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                  Secure, intelligent code analysis<br>
                  powered by advanced AI technology.
                </p>
              </td>
              <td style="text-align: right; vertical-align: top; width: 40%;">
                <div style="margin-bottom: 16px;">
                  <a href="https://codetector.ai" style="display: inline-block; padding: 10px 20px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
                    Visit Dashboard
                  </a>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                  <a href="https://github.com/codetector-ai" style="color: #64748b; text-decoration: none;">
                    <span style="font-size: 14px;">GitHub</span>
                  </a>
                  <a href="https://twitter.com/codetector_ai" style="color: #64748b; text-decoration: none;">
                    <span style="font-size: 14px;">Twitter</span>
                  </a>
                  <a href="https://codetector.ai/docs" style="color: #64748b; text-decoration: none;">
                    <span style="font-size: 14px;">Docs</span>
                  </a>
                </div>
              </td>
            </tr>
          </table>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  <a href="https://codetector.ai/privacy" style="color: #94a3b8; text-decoration: underline;">Privacy Policy</a> | 
                  <a href="https://codetector.ai/terms" style="color: #94a3b8; text-decoration: underline;">Terms of Service</a> | 
                  <a href="https://codetector.ai/unsubscribe" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
                </p>
                <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
                  © 2024 CodeDetector.ai. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;