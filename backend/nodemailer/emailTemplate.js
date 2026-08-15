export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - EduPortal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">📚 EduPortal</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: white; border-radius: 14px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="color: #2563eb; font-size: 24px; margin: 0 0 20px; text-align: center; font-weight: 700;">Email Verification</h1>
            
            <p style="color: #64748b; margin-bottom: 25px; text-align: center;">Thank you for signing up with EduPortal! To complete your registration, please verify your email using the code below:</p>
            
            <div style="text-align: center; margin: 30px 0; background-color: #f1f5f9; border-radius: 12px; padding: 20px; border: 1px dashed #cbd5e1;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; font-family: monospace;">{verificationCode}</span>
            </div>
            
            <p style="color: #64748b; text-align: center;">This verification code will expire in 15 minutes.</p>
            
            <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 14px;">If you did not sign up for EduPortal, please disregard this email.</p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 25px; color: #94a3b8; font-size: 13px;">
          <p>&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - EduPortal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">📚 EduPortal</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: white; border-radius: 14px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="color: #2563eb; font-size: 24px; margin: 0 0 20px; text-align: center; font-weight: 700;">Reset Your Password</h1>
            
            <p style="color: #64748b; margin-bottom: 25px; text-align: center;">We received a request to reset your password for your EduPortal account. Please click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="{resetURL}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #3b82f6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25); transition: all 0.3s ease;">Reset Password</a>
            </div>
            
            <p style="color: #64748b; text-align: center; margin-bottom: 25px;">This link will expire in 1 hour.</p>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 15px; margin-top: 25px;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">If the button above doesn't work, copy and paste the following URL into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 10px; font-family: monospace; background: #f1f5f9; padding: 10px; border-radius: 6px;">{resetURL}</p>
            </div>
            
            <div style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 25px; color: #94a3b8; font-size: 13px;">
          <p>&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful - EduPortal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">📚 EduPortal</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: white; border-radius: 14px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="color: #2563eb; font-size: 24px; margin: 0 0 20px; text-align: center; font-weight: 700;">Password Reset Successful</h1>
            
            <!-- Success Icon -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background-color: #ecfdf5; width: 80px; height: 80px; line-height: 80px; border-radius: 50%; border: 2px solid #10b981; font-size: 40px; color: #10b981;">
                ✓
              </div>
            </div>
            
            <p style="color: #64748b; margin-bottom: 25px; text-align: center;">Your password has been successfully reset. You can now log in to your EduPortal account with your new password.</p>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 25px; border-left: 4px solid #2563eb;">
              <h3 style="color: #2563eb; margin-top: 0; font-size: 16px;">Security Tips</h3>
              <ul style="color: #64748b; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px;">Use a strong, unique password with a mix of letters, numbers, and symbols</li>
                <li style="margin-bottom: 10px;">Don't reuse passwords across multiple websites</li>
                <li style="margin-bottom: 10px;">Keep your login credentials secure</li>
              </ul>
            </div>
            
            <div style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 14px;">If you did not request this password reset, please contact our support team immediately.</p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 25px; color: #94a3b8; font-size: 13px;">
          <p>&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const ACCOUNT_ACTIVATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your EduPortal Account</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">📚 EduPortal</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: white; border-radius: 14px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="color: #2563eb; font-size: 24px; margin: 0 0 20px; text-align: center; font-weight: 700;">Welcome to EduPortal!</h1>
            
            <p style="color: #64748b; margin-bottom: 25px; text-align: center;">Hello {teacherName},</p>
            
            <p style="color: #64748b; line-height: 1.6; margin-bottom: 20px;">
              Your EduPortal teacher account has been created by the administration. To complete your account setup and start using the platform, please activate your account by setting up your password.
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="{activationURL}" style="display: inline-block; background: linear-gradient(to right, #2563eb, #3b82f6); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25); transition: all 0.3s ease;">Activate Account & Set Password</a>
            </div>
            
            <p style="color: #64748b; text-align: center; margin-bottom: 25px;">This activation link will expire in 24 hours.</p>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #2563eb; margin-top: 0; font-size: 16px;">What you can do with EduPortal:</h3>
              <ul style="color: #64748b; padding-left: 20px; margin-bottom: 0;">
                <li style="margin-bottom: 10px;">Manage your classes and students</li>
                <li style="margin-bottom: 10px;">Create and share announcements</li>
                <li style="margin-bottom: 10px;">Track student attendance and grades</li>
                <li style="margin-bottom: 10px;">Generate comprehensive reports</li>
              </ul>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 15px; margin-top: 25px;">
              <p style="color: #64748b; margin: 0; font-size: 14px;">If the button above doesn't work, copy and paste the following URL into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #6b7280; margin-top: 10px; font-family: monospace; background: #f1f5f9; padding: 10px; border-radius: 6px;">{activationURL}</p>
            </div>
            
            <div style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="color: #94a3b8; font-size: 14px;">If you didn't expect this account creation, please contact the school administration.</p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 25px; color: #94a3b8; font-size: 13px;">
          <p>&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const ACTION_CODE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm Sensitive Action - EduPortal</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 26px; margin: 0; font-weight: 700;">📚 EduPortal</h1>
        </div>
        <div style="background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: #ffffff; border-radius: 14px; padding: 28px;">
            <h2 style="color:#1e293b; font-size: 22px; margin:0 0 16px; text-align:center; font-weight:700;">Action Confirmation Required</h2>
            <p style="color:#475569; margin:0 0 18px; text-align:center;">You initiated a <strong>{actionLabel}</strong>. Enter the code below in EduPortal to proceed. This code expires in <strong>5 minutes</strong>.</p>
            <div style="text-align:center; margin: 26px 0; background:#f1f5f9; border:1px dashed #cbd5e1; padding:20px; border-radius:12px;">
              <span style="font-size:34px; font-weight:700; letter-spacing:6px; color:#4f46e5; font-family: monospace;">{actionCode}</span>
            </div>
            <p style="color:#64748b; font-size:14px; text-align:center;">If you did not request this, ignore this email. No changes were made.</p>
            <div style="margin-top:28px; padding-top:18px; border-top:1px solid #e2e8f0; text-align:center;">
              <p style="color:#94a3b8; font-size:12px; margin:0;">For security, codes are single‑use.</p>
            </div>
          </div>
        </div>
        <div style="text-align:center; margin-top:24px; color:#94a3b8; font-size:12px;">
          <p style="margin:0;">&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
          <p style="margin:4px 0 0;">Automated message • Do not reply</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const EMAIL_CHANGED_NOTIFICATION_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your EduPortal Email Was Changed</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:'Inter',Arial,sans-serif;}</style>
  </head>
<body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; margin: 0; padding: 0; border: none;">
    <tr>
      <td style="padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2563eb; font-size: 24px; margin: 0;">EduPortal Security Notice</h1>
        </div>
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 2px; border-radius: 16px;">
          <div style="background-color: white; border-radius: 14px; padding: 24px;">
            <p style="margin: 0 0 16px;">Hello {userName},</p>
            <p style="margin: 0 0 16px;">This is a confirmation that the email associated with your EduPortal account was changed.</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:16px 0;">
              <p style="margin:0;color:#334155;"><strong>New email:</strong> {newEmail}</p>
            </div>
            <p style="margin: 0 0 12px;">If you made this change, no further action is needed.</p>
            <p style="margin: 0 0 12px; color:#b91c1c;"><strong>If you did NOT change your email</strong>, please contact your school administrator immediately.</p>
            <p style="margin: 24px 0 0; font-size: 12px; color: #64748b;">This alert was sent to your previous email address for your security.</p>
          </div>
        </div>
        <div style="text-align:center;margin-top: 16px; color: #94a3b8; font-size: 13px;">
          <p>&copy; ${new Date().getFullYear()} EduPortal. All rights reserved.</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;