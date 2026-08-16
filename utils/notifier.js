const SibApiV3Sdk = require("sib-api-v3-sdk");

// CHECK ENV VARIABLES
if (!process.env.BREVO_API_KEY) {
    console.log("❌ BREVO_API_KEY ENV VARIABLE MISSING");
}

// CONFIGURE BREVO CLIENT
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const transactionalApi = new SibApiV3Sdk.TransactionalEmailsApi();

console.log("✅ EMAIL SERVICE READY (Brevo)");

/**
 * HELPER: SEND EMAIL VIA BREVO
 */
const sendEmail = async ({ to, subject, html }) => {
    console.log(`📧 Attempting to send email to: ${to} | Subject: ${subject}`);
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    const senderEmail = process.env.EMAIL_FROM || "mande@ageafrica.org";
    const senderName = process.env.SENDER_NAME || "AGE Africa SMS";

    sendSmtpEmail.sender = { name: senderName, email: senderEmail };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    try {
        const result = await transactionalApi.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Email SUCCESS: Sent to ${to}. MessageId: ${result.messageId}`);
        return result;
    } catch (error) {
        console.error(`❌ Email CRITICAL FAILURE for ${to}:`, error.message);
        if (error.status === 401) console.error("   Reason: Invalid Brevo API Key.");
        if (error.status === 403) console.error(`   Reason: Sender [${senderEmail}] is not verified in your Brevo account.`);
        if (error.status === 402) console.error("   Reason: Brevo account quota exceeded.");
        throw error;
    }
};

/**
 * COMMON HTML WRAPPER
 */
const htmlWrapper = (title, content) => `
  <div style="
    font-family: Arial, sans-serif;
    padding: 20px;
    background: #f4f4f4;
  ">
    <div style="
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color:#4C3C32; margin: 0;">
          ${title}
        </h2>
      </div>

      <div style="color: #333; line-height: 1.6;">
        ${content}
      </div>

      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>

      <p style="font-size:12px;color:gray;text-align: center;">
        AGE Africa - Scholar Management System
      </p>
    </div>
  </div>
`;

/**
 * SEND OTP EMAIL
 */
const sendOTP = async (user, otp, password, roleName = null) => {
    const name = user.fullName || user.full_name || 'User';
    const role = roleName || user.role_name || 'Staff Member';
    const loginUrl = process.env.FRONTEND_URL || "https://scholar-management-system.onrender.com";

    const title = `Welcome ${name}`;
    const content = `
        <p>Your account for the <b>AGE Africa Scholar Management System</b> has been successfully provisioned.</p>

        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4C3C32; margin: 20px 0;">
            <p style="margin: 5px 0;"><b>Assigned Role:</b> ${role}</p>
            <p style="margin: 5px 0;"><b>System Username:</b> ${user.username}</p>
            <p style="margin: 5px 0;"><b>Temporary Password:</b> <span style="font-family: monospace; background: #eee; padding: 2px 4px;">${password}</span></p>
        </div>

        <p>To finalize your registration and secure your account, please use the following <b>One-Time Password (OTP)</b> for your initial login. You will be prompted to create a new permanent password immediately.</p>

        <div style="
            font-size: 32px;
            color: #E05B1C;
            font-weight: bold;
            letter-spacing: 5px;
            text-align: center;
            padding: 25px;
            background: #FAF2DB;
            border-radius: 12px;
            margin: 25px 0;
            border: 1px dashed #E05B1C;
        ">
          ${otp}
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="
                background-color: #4C3C32;
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                display: inline-block;
            ">ACCESS SYSTEM PORTAL</a>
        </div>

        <p style="font-size: 13px; color: #666;">
            <b>Security Note:</b> This access code expires in 48 hours. If you did not request this account, please contact the IT Department immediately.
        </p>
    `;

    try {
        return await sendEmail({
            to: user.email,
            subject: 'System Access Provisioned - Initial Login Credentials',
            html: htmlWrapper(title, content)
        });
    } catch (err) {
        console.log("❌ SEND OTP EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * SEND WELCOME EMAIL (After activation)
 */
const sendWelcomeEmail = async ({ email, name, role }) => {
    try {
        await sendEmail({
            to: email,
            subject: "Welcome to AGE Africa - Account Activated",
            html: htmlWrapper(
                `Welcome ${name}`,
                `
                    <p>Your account has been successfully activated.</p>
                    <p><b>Role:</b> ${role}</p>
                    <p>You can now log in to the system and start managing scholar data.</p>
                `
            ),
        });
        return true;
    } catch (err) {
        console.log("❌ WELCOME EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * SEND PASSWORD RESET OTP
 */
const sendPasswordResetEmail = async ({ email, name, otp }) => {
    try {
        await sendEmail({
            to: email,
            subject: "Password Reset Request",
            html: htmlWrapper(
                `Password Reset`,
                `
                    <p>Hello ${name},</p>
                    <p>We received a request to reset your password. Use the code below to proceed:</p>
                    <div style="font-size:32px;color:#E05B1C;font-weight:bold;letter-spacing:5px;text-align:center;padding:20px;background:#f9f9f9;border-radius:8px;">
                      ${otp}
                    </div>
                `
            ),
        });
        return true;
    } catch (err) {
        console.log("❌ RESET EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * DUTY ASSIGNMENT EMAIL
 */
const sendDutyAssignmentEmail = async ({
    email,
    name,
    officerId,
    dutyType,
    location,
    week,
    time,
    shift,
    task,
}) => {
    try {
        const info = await sendEmail({
            to: email,
            subject: "New Duty Assignment",
            html: htmlWrapper(
                `Duty Assigned to ${name}`,
                `
          <p><b>User ID:</b> ${officerId}</p>
          <p><b>Duty Type:</b> ${dutyType}</p>
          <p><b>Location:</b> ${location}</p>
          <p><b>Week:</b> ${week}</p>
          <p><b>Shift:</b> ${shift}</p>
          <p><b>Time:</b> ${time || "Not specified"}</p>
          <hr/>
          <p>${task || "No task description"}</p>
        `
            ),
        });

        console.log("✅ Duty email sent:", info.messageId);
        return true;
    } catch (err) {
        console.log("❌ DUTY EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * SEND EVENT NOTIFICATION EMAIL
 */
const sendEventNotificationEmail = async ({ email, name, event }) => {
    try {
        const loginUrl = process.env.FRONTEND_URL || "https://scholar-management-system.onrender.com";

        await sendEmail({
            to: email,
            subject: `New Event: ${event.title}`,
            html: htmlWrapper(
                `New Event Announcement`,
                `
                    <p>Hello ${name},</p>
                    <p>A new event has been scheduled in the Scholar Management System:</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #9AB334;">
                        <h3 style="margin-top: 0; color: #4C3C32;">${event.title}</h3>
                        <p><b>Category:</b> ${event.category}</p>
                        <p><b>Date:</b> ${new Date(event.eventDate).toDateString()}</p>
                        <p><b>Time:</b> ${event.eventTime}</p>
                        <p><b>Location:</b> ${event.location}</p>
                        ${event.organizer ? `<p><b>Organized By:</b> ${event.organizer}</p>` : ''}
                    </div>
                    <p><b>Description:</b></p>
                    <p>${event.description || 'No description provided.'}</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl}" style="
                            background-color: #9AB334;
                            color: white;
                            padding: 14px 28px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            display: inline-block;
                        ">VIEW EVENT DETAILS</a>
                    </div>

                    <p>Please log in to the system for more details.</p>
                `
            ),
        });
        return true;
    } catch (err) {
        console.log("❌ EVENT NOTIFICATION EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * SEND INTERNSHIP ALLOCATION EMAIL
 */
const sendInternshipAllocationEmail = async ({
    email,
    name,
    workplace,
    location,
    supervisor,
    startDate,
    endDate
}) => {
    try {
        await sendEmail({
            to: email,
            subject: "Internship Allocation - AGE Africa",
            html: htmlWrapper(
                "Internship Placement Confirmed",
                `
                    <p>Congratulations ${name},</p>
                    <p>You have been officially allocated an internship under AGE Africa at the following workplace:</p>
                    <div style="background: #FAF2DB; padding: 15px; border-radius: 8px; border-left: 4px solid #E05B1C;">
                        <h3 style="margin-top: 0; color: #4C3C32;">${workplace}</h3>
                        <p><b>Location:</b> ${location || 'N/A'}</p>
                        <p><b>Supervisor:</b> ${supervisor || 'N/A'}</p>
                        <p><b>Duration:</b> ${startDate} to ${endDate || 'TBD'}</p>
                    </div>
                    <p>This internship is a key part of your transition and professional development. Please report to your supervisor on the starting date.</p>
                    <p>Best regards,<br/><b>AGE Africa Program Management</b></p>
                `
            ),
        });
        return true;
    } catch (err) {
        console.log("❌ INTERNSHIP EMAIL ERROR:", err.message);
        return false;
    }
};

/**
 * SEND MEETING NOTIFICATION EMAIL
 */
const sendMeetingNotificationEmail = async ({ email, name, meeting }) => {
    try {
        const loginUrl = process.env.FRONTEND_URL || "https://scholar-management-system.onrender.com";
        // The link will direct them to the login page with a redirect instruction
        const redirectUrl = `${loginUrl}/login?redirect=/events/live-meeting-join&id=${meeting._id}`;

        await sendEmail({
            to: email,
            subject: `Meeting Invitation: ${meeting.title}`,
            html: htmlWrapper(
                `Meeting Invitation`,
                `
                    <p>Hello ${name},</p>
                    <p>You have been invited to a live meeting on the AGE Africa Scholar Management System.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #9AB334;">
                        <h3 style="margin-top: 0; color: #4C3C32;">${meeting.title}</h3>
                        <p><b>Description:</b> ${meeting.description || 'No description provided.'}</p>
                        <p><b>Date:</b> ${new Date(meeting.meetingDate).toDateString()}</p>
                        <p><b>Time:</b> ${meeting.meetingTime || 'TBD'}</p>
                    </div>
                    <p>To attend this meeting, please click the button below to log in to the system. You will be redirected to the meeting room where you can join the video conference.</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${redirectUrl}" style="
                            background-color: #9AB334;
                            color: white;
                            padding: 14px 28px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            display: inline-block;
                        ">LOG IN TO JOIN MEETING</a>
                    </div>

                    <p style="font-size: 12px; color: #666;">
                        If the button above doesn't work, copy and paste this link into your browser:<br/>
                        ${redirectUrl}
                    </p>
                `
            ),
        });
        return true;
    } catch (err) {
        console.log("❌ MEETING NOTIFICATION EMAIL ERROR:", err.message);
        return false;
    }
};

module.exports = {
    sendEmail,
    sendOTP,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendDutyAssignmentEmail,
    sendEventNotificationEmail,
    sendInternshipAllocationEmail,
    sendMeetingNotificationEmail
};
