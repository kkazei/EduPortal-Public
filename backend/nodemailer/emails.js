import { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, ACCOUNT_ACTIVATION_TEMPLATE, EMAIL_CHANGED_NOTIFICATION_TEMPLATE, ACTION_CODE_TEMPLATE } from "./emailTemplate.js";
import { sendEmail, sender } from "./email.config.js";

export const sendVerificationEmail = async (email, verificationToken) => {
    try {
        const response = await sendEmail(
            email,
            "Verify your email",
            VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken)
        );
        console.log("Verification email sent", response);
        return response;
    } catch (error) {
        console.error("Failed to send verification email", error);
        throw new Error(`Failed to send verification email: ${error}`);
    }
};

export const sendPasswordResetEmail = async (email, resetURL) => {
    try {
        console.log('Sending password reset email to:', email);
        console.log('With reset URL:', resetURL);
        
        // Validate the URL
        if (!resetURL || typeof resetURL !== 'string' || !resetURL.startsWith('http')) {
            throw new Error(`Invalid reset URL: ${resetURL}`);
        }
        
        const response = await sendEmail(
            email,
            "Reset your password - EduPortal",
            PASSWORD_RESET_REQUEST_TEMPLATE.replace(/{resetURL}/g, resetURL)
        );
        
        console.log("Password reset email sent successfully:", response);
        return response;
    } catch (error) {
        console.error(`Error sending password reset email:`, error);
        throw new Error(`Error sending password reset email: ${error.message}`);
    }
};

export const sendResetSuccessEmail = async (email) => {
    try {
        const response = await sendEmail(
            email,
            "Password reset successful",
            PASSWORD_RESET_SUCCESS_TEMPLATE
        );
        console.log("Password reset success email sent", response);
        return response;
    } catch (error) {
        console.error("Error sending password reset success email", error);
        throw new Error(`Error sending password reset success email: ${error}`);
    }
};

// Update this function to match the correct parameter order
export const sendForgotPasswordEmail = async (email, userName, resetURL) => {
    console.log('sendForgotPasswordEmail called with:', { email, userName, resetURL });
    return sendPasswordResetEmail(email, resetURL);
};

export const sendAccountActivationEmail = async (email, teacherName, activationURL) => {
  try {
    console.log('Sending account activation email to:', email);
    console.log('With activation URL:', activationURL);
    
    const subject = 'Activate Your EduPortal Teacher Account';
    const html = ACCOUNT_ACTIVATION_TEMPLATE
      .replace(/{teacherName}/g, teacherName)
      .replace(/{activationURL}/g, activationURL);

    const response = await sendEmail(email, subject, html);
    console.log("Account activation email sent successfully:", response);
    return response;
  } catch (error) {
    console.error(`Error sending account activation email:`, error);
    throw new Error(`Error sending account activation email: ${error.message}`);
  }
};

export const sendEmailChangedNotification = async (oldEmail, userName, newEmail) => {
    try {
        const subject = 'Your EduPortal email was changed';
        const html = EMAIL_CHANGED_NOTIFICATION_TEMPLATE
            .replace(/{userName}/g, userName || 'User')
            .replace(/{newEmail}/g, newEmail || 'your new email');
        const response = await sendEmail(oldEmail, subject, html);
        return response;
    } catch (error) {
        console.error('Error sending email changed notification:', error);
        throw new Error(error.message || 'Failed to send notification');
    }
};

export const sendActionSecurityCodeEmail = async (email, actionLabel, code) => {
    try {
        const subject = `Confirm ${actionLabel} - EduPortal`;
        const html = ACTION_CODE_TEMPLATE
            .replace(/{actionLabel}/g, actionLabel)
            .replace(/{actionCode}/g, code);
        const response = await sendEmail(email, subject, html);
        return response;
    } catch (error) {
        console.error('Error sending action security code email:', error);
        throw new Error(error.message || 'Failed to send action code');
    }
};