import { Resend } from 'resend';
import dotenv from "dotenv";

dotenv.config();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender information (keep same structure for compatibility)
export const sender = {
  email: process.env.FROM_EMAIL || "onboarding@resend.dev",
  name: "EduPortal"
};

// Resend email sending function (same interface as nodemailer)
export const sendEmail = async (to, subject, html, retries = 1) => {
  try {
    console.log(`Sending email to: ${to}`);
    console.log('Email config:', {
      fromEmail: sender.email,
      hasApiKey: !!process.env.RESEND_API_KEY
    });

    const { data, error } = await resend.emails.send({
      from: `"${sender.name}" <${sender.email}>`,
      to: [to],
      subject,
      html
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    console.log("Email sent successfully:", data.id);
    return { success: true, messageId: data.id };
    
  } catch (error) {
    console.error("Email sending failed:", error.message);
    throw error;
  }
};

// Legacy transporter object for backward compatibility
export const transporter = {
  sendMail: async (mailOptions) => {
    return sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
  },
  verify: () => {
    // No-op for compatibility - Resend doesn't need verification
    return Promise.resolve(true);
  }
};

