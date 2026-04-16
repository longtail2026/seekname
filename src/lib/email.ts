/**
 * 邮件发送服务
 * 支持 SendGrid、Mailgun、QQ企业邮箱等 SMTP 服务
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

// 获取邮件配置
function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from: from || `SeekName <${user}>`,
  };
}

// 发送邮件（使用 Node.js 内置的 SMTP）
async function sendEmailSMTP(options: EmailOptions, config: EmailConfig): Promise<boolean> {
  // 构建邮件内容
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
    return true;
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return false;
  }
}

// 发送邮件入口
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // 开发环境模拟发送
  if (process.env.NODE_ENV !== "production" || !process.env.SMTP_HOST) {
    console.log("[Email] Mock mode - email not sent:");
    console.log("  To:", options.to);
    console.log("  Subject:", options.subject);
    return true; // 开发环境模拟成功
  }

  const config = getEmailConfig();
  if (!config) {
    console.error("[Email] SMTP not configured");
    return false;
  }

  return sendEmailSMTP(options, config);
}

// 邮件模板：起名完成通知
export function buildNamingCompleteEmail(params: {
  userName: string;
  name: string;
  type: "personal" | "company" | "pet";
  names: Array<{ name: string; score: number }>;
}): { subject: string; html: string } {
  const namesList = params.names
    .map((n) => `<li><strong>${n.name}</strong> - 评分 ${n.score}</li>`)
    .join("");

  return {
    subject: `【寻名网】您的${params.type === "personal" ? "个人" : params.type === "company" ? "公司" : "宠物"}名字已生成`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E86A17, #D55A0B); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .name-card { background: #FFF8F4; border: 1px solid #FFE4CC; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .name-card h3 { color: #E86A17; margin: 0 0 12px; }
    .name-list { list-style: none; padding: 0; margin: 0; }
    .name-list li { padding: 8px 0; border-bottom: 1px dashed #eee; }
    .name-list li:last-child { border-bottom: none; }
    .btn { display: inline-block; background: linear-gradient(135deg, #E86A17, #D55A0B); color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏮 寻名网</h1>
    </div>
    <div class="content">
      <p>亲爱的 ${params.userName}：</p>
      <p>您的名字已经生成完毕！以下是为您推荐的<span style="color: #E86A17; font-weight: bold;">${params.names.length} 个好名字</span>：</p>
      
      <div class="name-card">
        <h3>📜 推荐名字</h3>
        <ul class="name-list">
          ${namesList}
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/naming" class="btn">查看完整分析 →</a>
      </p>
      
      <p style="margin-top: 24px; color: #666; font-size: 14px;">
        💡 <strong>小提示：</strong>开通 VIP 会员可解锁无限生成、深度五行分析、AI典籍解读等全部功能。
      </p>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿回复</p>
      <p>寻名网 | seznam.cn</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// 邮件模板：VIP 开通成功
export function buildVipSuccessEmail(params: {
  userName: string;
  tier: number;
  expireDate: string;
}): { subject: string; html: string } {
  const tierName = params.tier === 2 ? "SVIP 年卡" : "VIP 月卡";
  const tierColor = params.tier === 2 ? "#D4941A" : "#E86A17";

  return {
    subject: `【寻名网】恭喜您开通 ${tierName}！`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${tierColor}, #D55A0B); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    .vip-badge { display: inline-block; background: ${tierColor}; color: white; padding: 8px 20px; border-radius: 20px; font-size: 18px; font-weight: bold; }
    .info-box { background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: ${tierColor}; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏮 寻名网</h1>
    </div>
    <div class="content">
      <div class="success-icon">🎉</div>
      <p style="text-align: center;">恭喜 <strong>${params.userName}</strong> 开通成功！</p>
      <p style="text-align: center;">
        <span class="vip-badge">${tierName}</span>
      </p>
      
      <div class="info-box">
        <p><strong>会员有效期：</strong>${params.expireDate}</p>
        <p><strong>权益说明：</strong></p>
        <ul>
          <li>✅ 无限名字生成</li>
          <li>✅ 深度五行分析</li>
          <li>✅ AI 典籍完整解读</li>
          ${params.tier === 2 ? "<li>✅ 7×24 小时专属客服</li>" : ""}
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/naming" class="btn">立即体验 →</a>
      </p>
    </div>
    <div class="footer">
      <p>如有疑问，请联系客服</p>
      <p>寻名网 | seznam.cn</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

// 邮件模板：订阅确认
export function buildSubscribeConfirmEmail(params: {
  email: string;
  token: string;
}): { subject: string; html: string } {
  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/subscribe/confirm?token=${params.token}`;

  return {
    subject: "【寻名网】请确认您的邮件订阅",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E86A17, #D55A0B); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .btn { display: inline-block; background: #E86A17; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏮 寻名网</h1>
    </div>
    <div class="content">
      <p>感谢您订阅寻名网！</p>
      <p>请点击下面的按钮确认您的邮箱：</p>
      <p style="text-align: center;">
        <a href="${confirmUrl}" class="btn">确认订阅</a>
      </p>
      <p style="margin-top: 20px; color: #666; font-size: 14px;">
        如果按钮无法点击，请复制以下链接到浏览器打开：<br>
        <a href="${confirmUrl}" style="color: #E86A17;">${confirmUrl}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        如果您没有订阅寻名网，请忽略此邮件。
      </p>
    </div>
    <div class="footer">
      <p>寻名网 | seznam.cn</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}
