const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin                  = require('firebase-admin');
const crypto                 = require('crypto');
const { Resend }             = require('resend');

admin.initializeApp();
const db = admin.firestore();

/* ── helpers ──────────────────────────────────────────────────────────── */

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function buildOtpEmail(toName, otpCode, toEmail) {
  return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="color-scheme" content="light only">
  <title>Verification Code</title>
  <style>:root{color-scheme:light only;}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;" bgcolor="#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
  style="background:#ffffff;border-radius:4px;overflow:hidden;max-width:560px;width:100%;">
  <tr>
    <td style="background:#0a0a0a;padding:24px 36px;border-bottom:4px solid #c8102e;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:16px;vertical-align:middle;">
          <img src="https://republica3334.github.io/sito/emblem-white.png"
               width="48" height="48" alt="Stars" style="display:block;border:0;">
        </td>
        <td style="vertical-align:middle;">
          <div style="font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#ffffff;line-height:1.2;">United Republic of Stars</div>
          <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#666666;margin-top:4px;">Citizen Portal &middot; Account Security</div>
        </td>
      </tr></table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 36px 28px;">
      <p style="font-family:Arial,sans-serif;font-size:15px;color:#444444;line-height:1.7;margin:0 0 24px;">
        Hello <strong style="color:#0a0a0a;">${toName}</strong>,<br>
        a verification code was requested for your account on
        <strong style="color:#0a0a0a;">United Republic of Stars</strong>.<br>
        Enter the code below to complete verification.
      </p>
      <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#999999;margin:0 0 10px;">Your verification code</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
        <td style="background:#f7f7f7;border:1px solid #e0e0e0;border-left:4px solid #c8102e;border-radius:4px;padding:20px 24px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:26px;font-weight:700;letter-spacing:4px;color:#0a0a0a;line-height:1;white-space:nowrap;">${otpCode}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#999999;margin-top:10px;">Valid for <span style="color:#c8102e;font-weight:600;">5 minutes</span>.</div>
        </td>
      </tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
        <td style="background:#fff8f8;border:1px solid #f5c0c8;border-radius:4px;padding:14px 18px;font-family:Arial,sans-serif;font-size:13px;color:#7a1a24;line-height:1.6;">
          <strong>Didn't request this?</strong> Ignore this email &mdash; your account is safe.
        </td>
      </tr></table>
      <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;">
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#555555;line-height:1.8;margin:0;">
        Kind regards,<br>
        <strong style="color:#0a0a0a;">Ministry of the Interior &mdash; United Republic of Stars</strong><br>
        <span style="font-size:12px;color:#aaaaaa;">This is an automated message, please do not reply.</span>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f7f7f7;border-top:1px solid #e8e8e8;padding:18px 36px;text-align:center;">
      <p style="font-family:Arial,sans-serif;font-size:11px;color:#aaaaaa;line-height:1.7;margin:0;">
        &copy; United Republic of Stars &mdash; Official Citizen Portal<br>
        Sent to <strong>${toEmail}</strong> because it is linked to your account.
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ── sendOtp ──────────────────────────────────────────────────────────── */

exports.sendOtp = onCall({ invoker: 'public' }, async (request) => {
  const userId = (request.data.userId || '').toString().trim();
  if (!userId) throw new HttpsError('invalid-argument', 'userId required');

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

  const user = userDoc.data();
  if (!user.twofa || !user.email) {
    throw new HttpsError('failed-precondition', '2FA not enabled for this user');
  }

  // Rate-limit: block if a valid OTP was sent in the last 60 seconds
  const existing = await db.collection('otp_sessions').doc(userId).get();
  if (existing.exists) {
    const sentAt = existing.data().sentAt || 0;
    if (Date.now() - sentAt < 60000) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting a new code');
    }
  }

  const code   = String(crypto.randomInt(100000, 1000000));
  const expiry = Date.now() + 5 * 60 * 1000;

  await db.collection('otp_sessions').doc(userId).set({
    hash:     sha256(code),
    expiry:   expiry,
    sentAt:   Date.now(),
    attempts: 0
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    'United Republic of Stars <onboarding@resend.dev>',
    to:      [user.email],
    subject: 'Your verification code — United Republic of Stars',
    html:    buildOtpEmail(user.name || user.id, code, user.email)
  });

  return { sent: true };
});

/* ── sendEmailVerif ───────────────────────────────────────────────────── */

exports.sendEmailVerif = onCall({ invoker: 'public' }, async (request) => {
  const userId = (request.data.userId || '').toString().trim();
  if (!userId) throw new HttpsError('invalid-argument', 'userId required');

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');

  const user = userDoc.data();
  if (!user.email) throw new HttpsError('failed-precondition', 'No email on this account');

  const existing = await db.collection('email_verif_sessions').doc(userId).get();
  if (existing.exists) {
    const sentAt = existing.data().sentAt || 0;
    if (Date.now() - sentAt < 60000) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting a new code');
    }
  }

  const code   = String(crypto.randomInt(100000, 1000000));
  const expiry = Date.now() + 5 * 60 * 1000;

  await db.collection('email_verif_sessions').doc(userId).set({
    hash: sha256(code), expiry, sentAt: Date.now(), attempts: 0
  });

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from:    'United Republic of Stars <onboarding@resend.dev>',
    to:      [user.email],
    subject: 'Verify your email — United Republic of Stars',
    html:    buildOtpEmail(user.name || user.id, code, user.email)
  });

  return { sent: true };
});

/* ── verifyEmailVerif ─────────────────────────────────────────────────── */

exports.verifyEmailVerif = onCall({ invoker: 'public' }, async (request) => {
  const userId = (request.data.userId || '').toString().trim();
  const code   = (request.data.code   || '').toString().trim();

  if (!userId || !code) throw new HttpsError('invalid-argument', 'userId and code required');

  const ref = db.collection('email_verif_sessions').doc(userId);
  const doc = await ref.get();

  if (!doc.exists) return { valid: false, reason: 'expired' };

  const session = doc.data();
  if (Date.now() > session.expiry) { await ref.delete(); return { valid: false, reason: 'expired' }; }

  const attempts = (session.attempts || 0) + 1;

  if (sha256(code) === session.hash) { await ref.delete(); return { valid: true }; }

  if (attempts >= 5) { await ref.delete(); return { valid: false, reason: 'too_many_attempts' }; }

  await ref.update({ attempts });
  return { valid: false, reason: 'invalid' };
});

/* ── verifyOtp ────────────────────────────────────────────────────────── */

exports.verifyOtp = onCall({ invoker: 'public' }, async (request) => {
  const userId = (request.data.userId || '').toString().trim();
  const code   = (request.data.code   || '').toString().trim();

  if (!userId || !code) {
    throw new HttpsError('invalid-argument', 'userId and code required');
  }

  const ref = db.collection('otp_sessions').doc(userId);
  const doc = await ref.get();

  if (!doc.exists) return { valid: false, reason: 'expired' };

  const session = doc.data();

  if (Date.now() > session.expiry) {
    await ref.delete();
    return { valid: false, reason: 'expired' };
  }

  const attempts = (session.attempts || 0) + 1;

  if (sha256(code) === session.hash) {
    await ref.delete();
    return { valid: true };
  }

  if (attempts >= 5) {
    await ref.delete();
    return { valid: false, reason: 'too_many_attempts' };
  }

  await ref.update({ attempts });
  return { valid: false, reason: 'invalid' };
});
