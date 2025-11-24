import nodemailer from "nodemailer";

let cachedTransporter = null;

// Nodemailer imported

const buildTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT = 587,
    SMTP_SECURE = "false",
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // SMTP config missing
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  // Configuring SMTP

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  // Test the connection
  cachedTransporter.verify()
    .then(() => {
      console.log("✅ SMTP connection verified successfully");
    })
    .catch((error) => {
      console.log("❌ SMTP connection failed:", error.message);
    });

  return cachedTransporter;
};

export const sendMail = async ({ to, subject, text, html, from }) => {
  if (!to) {
    throw new Error("Recipient email (to) is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  if (!text && !html) {
    throw new Error("Email content (text or html) is required");
  }

  try {
    console.log(`📧 Preparing to send email to: ${to}`);
    console.log(`📬 Email subject: ${subject}`);
    
    const transporter = buildTransporter();
    const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;

    console.log(`📤 Sending email from: ${sender}`);

    const result = await transporter.sendMail({
      from: sender,
      to,
      subject,
      text,
      html
    });

    console.log(`✅ Email sent successfully to ${to}, Message ID: ${result.messageId}`);
    return result;

  } catch (error) {
    console.log(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

