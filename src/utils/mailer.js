import nodemailer from "nodemailer";

let cachedTransporter = null;

// Debug: Check if nodemailer is properly imported
console.log("📦 Nodemailer import check:", {
  hasNodemailer: !!nodemailer,
  hasCreateTransport: !!nodemailer?.createTransport,
  nodeMailerType: typeof nodemailer
});

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
    console.error("SMTP Config Check:", { 
      hasHost: !!SMTP_HOST, 
      hasUser: !!SMTP_USER, 
      hasPass: !!SMTP_PASS 
    });
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  console.log("📧 Configuring SMTP with:", {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    user: SMTP_USER.replace(/(.{3}).*(@.*)/, "$1***$2") // Hide email for security
  });

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
      console.error("❌ SMTP connection failed:", error.message);
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
    const transporter = buildTransporter();
    const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;

    console.log("📤 Sending email:", {
      to: to.replace(/(.{3}).*(@.*)/, "$1***$2"), // Hide email for security
      subject,
      from: sender
    });

    const result = await transporter.sendMail({
      from: sender,
      to,
      subject,
      text,
      html
    });

    console.log("✅ Email sent successfully:", result.messageId);
    return result;

  } catch (error) {
    console.error("❌ Failed to send email:", {
      error: error.message,
      to: to.replace(/(.{3}).*(@.*)/, "$1***$2"),
      subject
    });
    throw error;
  }
};

