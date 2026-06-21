const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin                  = require('firebase-admin');
const crypto                 = require('crypto');
const emailjs                = require('@emailjs/nodejs');

admin.initializeApp();
const db = admin.firestore();

/* ── helpers ──────────────────────────────────────────────────────────── */

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function sendEmail(toEmail, toName, otpCode) {
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_name: toName, otp_code: otpCode, to_email: toEmail },
      { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY }
    );
  } catch (err) {
    const msg = (err && err.text) ? err.text : String(err);
    console.error('EmailJS error:', msg);
    throw new HttpsError('internal', 'Failed to send email: ' + msg);
  }
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

  await sendEmail(user.email, user.name || user.id, code);

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

  await sendEmail(user.email, user.name || user.id, code);

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
