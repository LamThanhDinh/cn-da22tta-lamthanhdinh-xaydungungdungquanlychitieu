const nodemailer = require("nodemailer");

// Tạo transporter với Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Email Gmail của bạn
      pass: process.env.EMAIL_PASS, // App Password của Gmail
    },
  });
};

// Gửi email với mã xác thực
const sendResetPasswordEmail = async (email, resetToken, username) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: "Két Sắt Số",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Mã xác thực đặt lại mật khẩu - Két Sắt Số",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .email-header {
              background: linear-gradient(135deg, #1e90ff 0%, #1a7bb8 100%);
              padding: 30px;
              text-align: center;
              color: #ffffff;
            }
            .email-header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .email-body {
              padding: 40px 30px;
            }
            .email-body h2 {
              color: #333333;
              font-size: 20px;
              margin-bottom: 20px;
            }
            .email-body p {
              color: #666666;
              font-size: 15px;
              line-height: 1.6;
              margin: 15px 0;
            }
            .token-box {
              background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
              border: 2px solid #1e90ff;
              border-radius: 10px;
              padding: 25px;
              margin: 30px 0;
              text-align: center;
            }
            .token-code {
              font-size: 36px;
              font-weight: 700;
              color: #1e90ff;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
              margin: 10px 0;
            }
            .token-label {
              color: #666666;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .warning-box {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-box p {
              color: #856404;
              margin: 5px 0;
              font-size: 14px;
            }
            .email-footer {
              background-color: #f8f9fa;
              padding: 25px;
              text-align: center;
              color: #999999;
              font-size: 13px;
              border-top: 1px solid #e0e0e0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #1e90ff 0%, #1a7bb8 100%);
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
            }
            .highlight {
              color: #1e90ff;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>🔐 Đặt Lại Mật Khẩu</h1>
            </div>
            
            <div class="email-body">
              <h2>Xin chào ${username || "bạn"}!</h2>
              
              <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <span class="highlight">Két Sắt Số</span>.</p>
              
              <p>Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình đặt lại mật khẩu:</p>
              
              <div class="token-box">
                <div class="token-label">Mã Xác Thực</div>
                <div class="token-code">${resetToken}</div>
              </div>
              
              <div class="warning-box">
                <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
                <p>• Mã này có hiệu lực trong <strong>60 phút</strong></p>
                <p>• Không chia sẻ mã này với bất kỳ ai</p>
                <p>• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</p>
              </div>
              
              <p>Nếu bạn gặp khó khăn, vui lòng liên hệ với chúng tôi để được hỗ trợ.</p>
              
              <p style="margin-top: 30px;">Trân trọng,<br><strong>KÉT SẮT SỐ Team</strong></p>
            </div>
            
            <div class="email-footer">
              <p>© ${new Date().getFullYear()} KÉT SẮT SỐ. All rights reserved.</p>
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Xin chào ${username || "bạn"}!

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Mã xác thực của bạn là: ${resetToken}

Mã này có hiệu lực trong 60 phút.

Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
KÉT SẮT SỐ Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Không thể gửi email. Vui lòng thử lại sau.");
  }
};

module.exports = {
  sendResetPasswordEmail,
};
