type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info("[email:log]", payload.subject, "→", payload.to);
    return { ok: true, logged: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "DigitalForge <hello@digitalforge.dev>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });
  return { ok: res.ok, logged: false };
}

export function welcomeEmail(name: string) {
  return {
    subject: "Welcome to DigitalForge",
    html: `<p>Hi ${name},</p><p>Your account is ready. Browse templates, prompts and starter kits built to ship faster.</p>`,
  };
}

export function leadMagnetEmail(name: string) {
  return {
    subject: "Your free AI prompt pack is ready",
    html: `<p>Hi ${name},</p><p>Your 100+ AI business prompts are waiting in your inbox library. Unlock the complete library at 70% off today.</p>`,
  };
}

export function purchaseEmail(name: string, orderNumber: string) {
  return {
    subject: `Order ${orderNumber} confirmed`,
    html: `<p>Hi ${name},</p><p>Your DigitalForge order ${orderNumber} is confirmed. Downloads are in your dashboard.</p>`,
  };
}

export function abandonedCartEmail(name: string) {
  return {
    subject: "Your cart is still here",
    html: `<p>Hi ${name},</p><p>You left something in your DigitalForge cart. Complete checkout whenever you are ready.</p>`,
  };
}
