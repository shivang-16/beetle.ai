import { WelcomeOptions } from '../types.js';
import { baseTemplate } from './baseTemplate.js';

export const welcomeTemplate = (options: WelcomeOptions) => {
  const { username, dashboardLink } = options;

  return baseTemplate(`
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; border-radius: 8px; margin-bottom: 16px;">
        <span style="font-size: 20px; margin-right: 8px;">🎉</span>
        <span style="font-size: 18px; font-weight: 600;">Welcome to CodeDetector.ai</span>
      </div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937;">
        Welcome${username ? `, ${username}` : ''}!
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">
        You're now ready to start analyzing your code with AI-powered insights
      </p>
    </div>

    <!-- Getting Started -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
        🚀 Getting Started
      </h2>
      <p style="margin: 0 0 20px 0; color: #6b7280; line-height: 1.6;">
        CodeDetector.ai helps you identify security vulnerabilities, performance issues, and code quality problems using advanced AI models. Here's how to get started:
      </p>
      
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold; font-size: 16px; flex-shrink: 0;">1</div>
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Connect Your Repository</h3>
            <p style="margin: 0; color: #6b7280; line-height: 1.5;">Link your GitHub repository or upload your code for analysis</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold; font-size: 16px; flex-shrink: 0;">2</div>
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Choose Analysis Type</h3>
            <p style="margin: 0; color: #6b7280; line-height: 1.5;">Select from security, performance, quality, or comprehensive analysis</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
          <div style="width: 32px; height: 32px; background-color: #667eea; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-weight: bold; font-size: 16px; flex-shrink: 0;">3</div>
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1f2937;">Review Results</h3>
            <p style="margin: 0; color: #6b7280; line-height: 1.5;">Get detailed reports with actionable recommendations and fixes</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
        ✨ What You Can Do
      </h2>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
        <div style="padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">🔒 Security Analysis</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Detect vulnerabilities, injection flaws, and security anti-patterns</p>
        </div>
        
        <div style="padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">⚡ Performance Optimization</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Identify bottlenecks and optimization opportunities</p>
        </div>
        
        <div style="padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">📊 Code Quality</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Improve maintainability and follow best practices</p>
        </div>
        
        <div style="padding: 16px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #8b5cf6;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">🤖 AI-Powered Insights</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">Get intelligent recommendations from advanced AI models</p>
        </div>
      </div>
    </div>

    <!-- Resources -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1e40af;">
        📚 Helpful Resources
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <a href="https://codetector.ai/docs" style="display: block; padding: 16px; background-color: white; border-radius: 6px; text-decoration: none; color: #1e40af; border: 1px solid #bfdbfe;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">📖 Documentation</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Learn how to use all features</p>
        </a>
        
        <a href="https://codetector.ai/examples" style="display: block; padding: 16px; background-color: white; border-radius: 6px; text-decoration: none; color: #1e40af; border: 1px solid #bfdbfe;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">💡 Examples</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">See analysis examples</p>
        </a>
        
        <a href="https://codetector.ai/support" style="display: block; padding: 16px; background-color: white; border-radius: 6px; text-decoration: none; color: #1e40af; border: 1px solid #bfdbfe;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">🆘 Support</h3>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Get help when you need it</p>
        </a>
      </div>
    </div>

    <!-- Call to Action -->
    <div style="text-align: center; margin-top: 32px;">
      ${dashboardLink ? `
        <a href="${dashboardLink}" style="display: inline-block; padding: 16px 32px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin-bottom: 16px;">
          Start Your First Analysis
        </a>
      ` : ''}
      <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
        Questions? Reply to this email or visit our <a href="https://codetector.ai/support" style="color: #667eea;">support center</a>.
      </p>
    </div>
  `);
};