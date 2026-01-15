import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Conclick <noreply@conclick.com>';

export async function sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    return resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset your password - Conclick',
        html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Reset your password</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
          This link expires in 1 hour. If you didn't request this, you can ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
    });
}

export async function sendWelcomeEmail(email: string, username: string) {
    return resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Welcome to Conclick! 🎉',
        html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Welcome to Conclick, ${username}! 🎉</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
          Your 14-day free trial has started. Here's what you can do:
        </p>
        <ul style="color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 24px; margin-bottom: 24px;">
          <li>Track unlimited websites</li>
          <li>See real-time visitor data</li>
          <li>Privacy-focused analytics</li>
          <li>Beautiful, minimal dashboard</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/websites" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin-bottom: 24px;">
          Add Your First Website
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
    });
}

export async function sendTrialEndingEmail(email: string, daysLeft: number) {
    return resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Your Conclick trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Don't lose access to your analytics data. Upgrade now to continue tracking your websites.
        </p>
        <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #18181b; font-weight: 600; margin-bottom: 8px;">Pro Plan</p>
          <p style="color: #52525b; font-size: 14px; margin-bottom: 4px;">$9/month or $7/month billed yearly</p>
          <p style="color: #71717a; font-size: 14px;">Unlimited websites • Unlimited tracking</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/account/billing" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Upgrade Now
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
    });
}

export async function sendSubscriptionConfirmation(email: string, plan: string) {
    const planDisplay = plan === 'annual' ? '$7/month (billed yearly)' : '$9/month';

    return resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Your Conclick subscription is active! 🚀',
        html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #18181b; font-size: 24px; font-weight: 600; margin-bottom: 24px;">You're all set! 🚀</h1>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Your Conclick Pro subscription is now active.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #166534; font-weight: 600; margin-bottom: 4px;">Pro Plan Active</p>
          <p style="color: #15803d; font-size: 14px;">${planDisplay}</p>
        </div>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          You now have access to:
        </p>
        <ul style="color: #52525b; font-size: 16px; line-height: 1.8; padding-left: 24px; margin-bottom: 24px;">
          <li>Unlimited websites</li>
          <li>Unlimited tracking</li>
          <li>Priority support</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/websites" style="display: inline-block; background: #4f46e5; color: white; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px;">
          Go to Dashboard
        </a>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          Conclick - Analytics that respect privacy
        </p>
      </div>
    `,
    });
}
