const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const emailjs = require('@emailjs/nodejs');

admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const ADMIN_ID = 'ilcreatore';
const PASSWORD_ITERATIONS = 310000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = 'sha256';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function asString(value) {
  return (value == null ? '' : String(value)).trim();
}

function normalizeEmail(value) {
  return asString(value).toLowerCase();
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashPassword(password, salt) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(
    password,
    actualSalt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEYLEN,
    PASSWORD_DIGEST
  ).toString('hex');
  return `pbkdf2_${PASSWORD_DIGEST}$${PASSWORD_ITERATIONS}$${actualSalt}$${hash}`;
}

function verifyPasswordHash(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== `pbkdf2_${PASSWORD_DIGEST}`) return false;

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = Buffer.from(parts[3], 'hex');
  if (!Number.isInteger(iterations) || !salt || expected.length === 0) return false;

  const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, PASSWORD_DIGEST);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function verifyLegacyPassword(password, legacyValue) {
  if (!legacyValue || typeof legacyValue !== 'string') return false;
  try {
    const decoded = Buffer.from(legacyValue, 'base64').toString('utf8');
    const a = Buffer.from(decoded);
    const b = Buffer.from(password);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

function publicUser(id, data) {
  const user = Object.assign({}, data || {});
  user.id = user.id || id;
  delete user.pwd;
  delete user.passwordHash;
  delete user.passwordSalt;
  return user;
}

function roleFor(id, user) {
  if (id === ADMIN_ID) return 'admin';
  return user.role || 'citizen';
}

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  return request.auth.uid;
}

function requestRole(request) {
  if (!request.auth) return null;
  if (request.auth.uid === ADMIN_ID) return 'admin';
  return request.auth.token.role || null;
}

function isAdmin(request) {
  return requestRole(request) === 'admin';
}

function isModerator(request) {
  return requestRole(request) === 'moderator';
}

function requirePrivileged(request) {
  requireAuth(request);
  if (!isAdmin(request) && !isModerator(request)) {
    throw new HttpsError('permission-denied', 'Admin or moderator role required');
  }
}

async function sendEmail(toEmail, toName, otpCode) {
  try {
    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_name: toName, otp_code: otpCode, to_email: toEmail, portal: 'United Republic of Stars' },
      { publicKey: process.env.EMAILJS_PUBLIC_KEY, privateKey: process.env.EMAILJS_PRIVATE_KEY }
    );
  } catch (err) {
    console.error('EmailJS error:', err && err.text ? err.text : err);
    throw new HttpsError('internal', 'Failed to send email');
  }
}

async function getUserDoc(userId) {
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return null;
  return { ref: snap.ref, data: snap.data() };
}

async function verifyStoredPassword(userId, user, password) {
  const privateRef = db.collection('user_private').doc(userId);
  const privateSnap = await privateRef.get();
  const privateData = privateSnap.exists ? privateSnap.data() : {};

  if (verifyPasswordHash(password, privateData.passwordHash)) return true;

  if (verifyLegacyPassword(password, user.pwd)) {
    await db.runTransaction(async (tx) => {
      tx.set(privateRef, { passwordHash: hashPassword(password), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      tx.update(db.collection('users').doc(userId), { pwd: FieldValue.delete() });
    });
    return true;
  }

  return false;
}

async function issueToken(userId, user) {
  const role = roleFor(userId, user);
  const token = await admin.auth().createCustomToken(userId, { role });
  return { token, user: publicUser(userId, Object.assign({}, user, { role })) };
}

async function throttle(ref) {
  const snap = await ref.get();
  if (snap.exists) {
    const sentAt = snap.data().sentAt || 0;
    if (Date.now() - sentAt < OTP_RESEND_MS) {
      throw new HttpsError('resource-exhausted', 'Please wait before requesting a new code');
    }
  }
  await ref.set({ sentAt: Date.now() }, { merge: true });
}

async function createLoginChallenge(userId, user) {
  if (!user.email) throw new HttpsError('failed-precondition', 'No email on this account');

  await throttle(db.collection('login_challenge_rate').doc(userId));

  const challengeId = crypto.randomBytes(24).toString('hex');
  const code = randomCode();

  await sendEmail(user.email, user.name || userId, code);

  await db.collection('login_challenges').doc(challengeId).set({
    userId,
    hash: sha256(code),
    expiry: Date.now() + OTP_TTL_MS,
    attempts: 0,
    createdAt: Date.now()
  });

  return { requires2fa: true, challengeId, user: publicUser(userId, user) };
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters');
  }
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Valid email required');
  }
}

function generateNationalId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ARX-';
  for (let i = 0; i < 3; i += 1) id += letters[crypto.randomInt(0, letters.length)];
  id += '-';
  for (let i = 0; i < 6; i += 1) id += String(crypto.randomInt(0, 10));
  return id;
}

async function uniqueNationalId() {
  for (let i = 0; i < 10; i += 1) {
    const id = generateNationalId();
    const snap = await db.collection('users').doc(id).get();
    if (!snap.exists) return id;
  }
  throw new HttpsError('internal', 'Could not allocate National ID');
}

async function emailExists(email, exceptUserId) {
  const snap = await db.collection('users').where('email', '==', email).limit(2).get();
  return snap.docs.some((doc) => doc.id !== exceptUserId);
}

exports.registerUser = onCall({ invoker: 'public' }, async (request) => {
  const firstName = asString(request.data.firstName);
  const lastName = asString(request.data.lastName);
  const dob = asString(request.data.dob);
  const email = normalizeEmail(request.data.email);
  const password = request.data.password;

  if (!firstName || !lastName || !dob) {
    throw new HttpsError('invalid-argument', 'Name and date of birth are required');
  }
  validateEmail(email);
  validatePassword(password);
  if (await emailExists(email)) {
    throw new HttpsError('already-exists', 'An account with this email already exists');
  }

  const id = await uniqueNationalId();
  const now = new Date().toISOString();
  const user = {
    id,
    name: `${firstName} ${lastName}`,
    dob,
    email,
    role: 'citizen',
    status: 'pending',
    setup: false,
    emailVerified: false,
    twofa: false,
    registered: now
  };

  const batch = db.batch();
  batch.set(db.collection('users').doc(id), user);
  batch.set(db.collection('user_private').doc(id), {
    passwordHash: hashPassword(password),
    createdAt: FieldValue.serverTimestamp()
  });
  await batch.commit();

  return { id };
});

exports.registerGuest = onCall({ invoker: 'public' }, async (request) => {
  const ip = request.rawRequest && (request.rawRequest.headers['x-forwarded-for'] || request.rawRequest.ip || 'unknown');
  const ipKey = 'guest_rate_' + sha256(String(ip)).slice(0, 16);
  const rateRef = db.collection('rate_limits').doc(ipKey);
  const rateSnap = await rateRef.get();
  if (rateSnap.exists) {
    const { count, windowStart } = rateSnap.data();
    const elapsed = Date.now() - (windowStart || 0);
    if (elapsed < 60 * 60 * 1000 && count >= 3) {
      throw new HttpsError('resource-exhausted', 'Too many guest accounts created. Please try again later.');
    }
    if (elapsed >= 60 * 60 * 1000) {
      await rateRef.set({ count: 1, windowStart: Date.now() });
    } else {
      await rateRef.update({ count: count + 1 });
    }
  } else {
    await rateRef.set({ count: 1, windowStart: Date.now() });
  }

  const suffix = crypto.randomBytes(5).toString('hex').toUpperCase();
  const id = `GST-${suffix.slice(0, 3)}-${crypto.randomInt(100000, 1000000)}`;
  const user = {
    id,
    name: `Guest ${id.slice(-6)}`,
    email: null,
    role: 'guest',
    status: 'approved',
    setup: true,
    registered: new Date().toISOString()
  };
  await db.collection('users').doc(id).set(user);
  return issueToken(id, user);
});

exports.loginUser = onCall({ invoker: 'public' }, async (request) => {
  const userId = asString(request.data.userId);
  const password = request.data.password;
  if (!userId || typeof password !== 'string') {
    throw new HttpsError('invalid-argument', 'National ID and password required');
  }

  const found = await getUserDoc(userId);
  if (!found) {
    throw new HttpsError('unauthenticated', 'Invalid credentials');
  }

  const user = found.data;
  const ok = await verifyStoredPassword(userId, user, password);
  if (!ok) {
    throw new HttpsError('unauthenticated', 'Invalid credentials');
  }
  if (user.status === 'suspended') {
    throw new HttpsError('permission-denied', 'This account has been suspended');
  }
  if (user.twofa === true && user.email && user.emailVerified === true) {
    return createLoginChallenge(userId, user);
  }
  if (user.twofa === true && (!user.email || user.emailVerified !== true)) {
    await found.ref.update({ twofa: false });
    user.twofa = false;
  }
  return issueToken(userId, user);
});

exports.verifyLoginOtp = onCall({ invoker: 'public' }, async (request) => {
  const challengeId = asString(request.data.challengeId);
  const code = asString(request.data.code);
  if (!challengeId || !code) {
    throw new HttpsError('invalid-argument', 'Challenge and code required');
  }

  const ref = db.collection('login_challenges').doc(challengeId);
  const snap = await ref.get();
  if (!snap.exists) return { valid: false, reason: 'expired' };

  const session = snap.data();
  if (Date.now() > session.expiry) {
    await ref.delete();
    return { valid: false, reason: 'expired' };
  }

  const attempts = (session.attempts || 0) + 1;
  if (sha256(code) !== session.hash) {
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await ref.delete();
      return { valid: false, reason: 'too_many_attempts' };
    }
    await ref.update({ attempts });
    return { valid: false, reason: 'invalid' };
  }

  await ref.delete();
  const found = await getUserDoc(session.userId);
  if (!found || found.data.status === 'suspended') {
    throw new HttpsError('permission-denied', 'Account unavailable');
  }
  return Object.assign({ valid: true }, await issueToken(session.userId, found.data));
});

exports.completeSetup = onCall(async (request) => {
  const uid = requireAuth(request);
  const email = normalizeEmail(request.data.email);
  const twofaRequested = request.data.twofa === true;
  const found = await getUserDoc(uid);
  if (!found) throw new HttpsError('not-found', 'User not found');

  const updates = { setup: true };
  if (email) {
    validateEmail(email);
    if (await emailExists(email, uid)) {
      throw new HttpsError('already-exists', 'An account with this email already exists');
    }
    updates.email = email;
    if (email !== normalizeEmail(found.data.email)) {
      updates.emailVerified = false;
    }
  }
  updates.twofa = Boolean(twofaRequested && found.data.emailVerified);
  await found.ref.update(updates);
  return { saved: true };
});

exports.changeEmail = onCall(async (request) => {
  const uid = requireAuth(request);
  const email = normalizeEmail(request.data.email);
  validateEmail(email);
  if (await emailExists(email, uid)) {
    throw new HttpsError('already-exists', 'An account with this email already exists');
  }
  await db.collection('users').doc(uid).update({ email, emailVerified: false, twofa: false });
  return { saved: true };
});

exports.changePassword = onCall(async (request) => {
  const uid = requireAuth(request);
  const currentPassword = request.data.currentPassword;
  const newPassword = request.data.newPassword;
  validatePassword(newPassword);

  const found = await getUserDoc(uid);
  if (!found) throw new HttpsError('not-found', 'User not found');

  const ok = await verifyStoredPassword(uid, found.data, currentPassword);
  if (!ok) throw new HttpsError('permission-denied', 'Current password is incorrect');

  await db.runTransaction(async (tx) => {
    tx.set(db.collection('user_private').doc(uid), {
      passwordHash: hashPassword(newPassword),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    tx.update(db.collection('users').doc(uid), { pwd: FieldValue.delete() });
  });
  return { saved: true };
});

exports.setTwoFactor = onCall(async (request) => {
  const uid = requireAuth(request);
  const enabled = request.data.enabled === true;
  const found = await getUserDoc(uid);
  if (!found) throw new HttpsError('not-found', 'User not found');
  if (enabled && (!found.data.email || !found.data.emailVerified)) {
    throw new HttpsError('failed-precondition', 'Verify your email before enabling 2FA');
  }
  await found.ref.update({ twofa: enabled });
  return { saved: true, twofa: enabled };
});

exports.deleteOwnAccount = onCall(async (request) => {
  const uid = requireAuth(request);
  if (uid === ADMIN_ID) throw new HttpsError('permission-denied', 'Protected account');

  const batch = db.batch();
  batch.delete(db.collection('user_private').doc(uid));
  batch.delete(db.collection('users').doc(uid));
  await batch.commit();

  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') console.error('delete auth user:', err);
  }

  return { deleted: true };
});

exports.sendEmailVerif = onCall(async (request) => {
  const uid = requireAuth(request);
  const found = await getUserDoc(uid);
  if (!found || !found.data.email) {
    throw new HttpsError('failed-precondition', 'No email on this account');
  }

  await throttle(db.collection('email_verif_rate').doc(uid));

  const code = randomCode();
  await sendEmail(found.data.email, found.data.name || uid, code);
  await db.collection('email_verif_sessions').doc(uid).set({
    hash: sha256(code),
    expiry: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now()
  });

  return { sent: true };
});

exports.verifyEmailVerif = onCall(async (request) => {
  const uid = requireAuth(request);
  const code = asString(request.data.code);
  if (!code) throw new HttpsError('invalid-argument', 'Code required');

  const ref = db.collection('email_verif_sessions').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { valid: false, reason: 'expired' };

  const session = snap.data();
  if (Date.now() > session.expiry) {
    await ref.delete();
    return { valid: false, reason: 'expired' };
  }

  const attempts = (session.attempts || 0) + 1;
  if (sha256(code) !== session.hash) {
    if (attempts >= MAX_OTP_ATTEMPTS) {
      await ref.delete();
      return { valid: false, reason: 'too_many_attempts' };
    }
    await ref.update({ attempts });
    return { valid: false, reason: 'invalid' };
  }

  await db.runTransaction(async (tx) => {
    tx.delete(ref);
    tx.update(db.collection('users').doc(uid), { emailVerified: true });
  });
  return { valid: true };
});

exports.sendOtp = onCall(async (request) => {
  const uid = requireAuth(request);
  const userId = asString(request.data.userId || uid);
  if (userId !== uid) throw new HttpsError('permission-denied', 'Cannot request another account OTP');

  const found = await getUserDoc(uid);
  if (!found || !found.data.twofa || !found.data.email) {
    throw new HttpsError('failed-precondition', '2FA not enabled for this user');
  }

  await throttle(db.collection('otp_rate').doc(uid));

  const code = randomCode();
  await sendEmail(found.data.email, found.data.name || uid, code);
  await db.collection('otp_sessions').doc(uid).set({
    hash: sha256(code),
    expiry: Date.now() + OTP_TTL_MS,
    attempts: 0,
    sentAt: Date.now()
  });
  return { sent: true };
});

exports.verifyOtp = onCall(async (request) => {
  const uid = requireAuth(request);
  const userId = asString(request.data.userId || uid);
  const code = asString(request.data.code);
  if (userId !== uid) throw new HttpsError('permission-denied', 'Cannot verify another account OTP');
  if (!code) throw new HttpsError('invalid-argument', 'Code required');

  const ref = db.collection('otp_sessions').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { valid: false, reason: 'expired' };

  const session = snap.data();
  if (Date.now() > session.expiry) {
    await ref.delete();
    return { valid: false, reason: 'expired' };
  }

  const attempts = (session.attempts || 0) + 1;
  if (sha256(code) === session.hash) {
    await ref.delete();
    return { valid: true };
  }
  if (attempts >= MAX_OTP_ATTEMPTS) {
    await ref.delete();
    return { valid: false, reason: 'too_many_attempts' };
  }
  await ref.update({ attempts });
  return { valid: false, reason: 'invalid' };
});

exports.adminUpdateUser = onCall(async (request) => {
  requirePrivileged(request);
  const targetId = asString(request.data.id);
  const data = request.data.data || {};
  if (!targetId) throw new HttpsError('invalid-argument', 'Target user required');
  if (targetId === ADMIN_ID && request.auth.uid !== ADMIN_ID) {
    throw new HttpsError('permission-denied', 'Protected account');
  }

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(data, 'status')) {
    const status = asString(data.status);
    if (!['pending', 'approved', 'suspended', 'rejected'].includes(status)) {
      throw new HttpsError('invalid-argument', 'Invalid status');
    }
    updates.status = status;
  }
  if (Object.prototype.hasOwnProperty.call(data, 'role')) {
    if (!isAdmin(request)) {
      throw new HttpsError('permission-denied', 'Only administrators can change roles');
    }
    const role = asString(data.role);
    if (!['citizen', 'moderator', 'admin', 'guest'].includes(role)) {
      throw new HttpsError('invalid-argument', 'Invalid role');
    }
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpsError('invalid-argument', 'No allowed fields to update');
  }

  await db.collection('users').doc(targetId).update(updates);
  return { saved: true };
});

exports.adminDeleteUser = onCall(async (request) => {
  requirePrivileged(request);
  const targetId = asString(request.data.id);
  if (!targetId) throw new HttpsError('invalid-argument', 'Target user required');
  if (targetId === ADMIN_ID) throw new HttpsError('permission-denied', 'Protected account');

  const found = await getUserDoc(targetId);
  if (!found) return { deleted: true };
  if (isModerator(request) && found.data.status !== 'pending') {
    throw new HttpsError('permission-denied', 'Moderators can delete pending registrations only');
  }

  const batch = db.batch();
  batch.delete(db.collection('user_private').doc(targetId));
  batch.delete(db.collection('users').doc(targetId));
  await batch.commit();

  try {
    await admin.auth().deleteUser(targetId);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') console.error('delete auth user:', err);
  }

  return { deleted: true };
});
