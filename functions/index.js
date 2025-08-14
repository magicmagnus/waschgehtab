/**
 * Cloud Functions for WaschGehtAb
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.database();

async function getUserTokens(uid) {
  const snap = await db.ref(`userTokens/${uid}`).get();
  if (!snap.exists()) return [];
  return Object.keys(snap.val());
}

async function sendToUserTokens(tokens, payload, uid) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };
  const response = await admin.messaging().sendEachForMulticast({ ...payload, tokens });
  const removals = [];
  response.responses.forEach((r, idx) => {
    if (!r.success) {
      removals.push(db.ref(`userTokens/${uid}/${tokens[idx]}`).remove());
      functions.logger.warn('Removed invalid token', { token: tokens[idx], error: r.error?.message });
    }
  });
  await Promise.all(removals);
  return { successCount: response.successCount, failureCount: response.failureCount };
}

exports.notifyPaused = functions.database
  .ref('/machines/washer/status')
  .onWrite(async (change) => {
    const after = change.after.val();
    if (!after || after.phase !== 'paused' || !after.next?.uid) return null;
    const uid = after.next.uid;
    const tokens = await getUserTokens(uid);
    if (!tokens.length) return null;
    const payload = {
      notification: { title: 'Du bist dran zu waschen', body: 'Bitte bestätige jetzt deinen Waschgang.' },
      data: { action: 'accept_wash', machine: 'washer' },
    };
    const result = await sendToUserTokens(tokens, payload, uid);
    functions.logger.info('notifyPaused', { uid, ...result });
    return null;
  });

exports.testNotify = functions.https.onRequest(async (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: 'Missing uid' });
  try {
    const tokens = await getUserTokens(uid);
    if (!tokens.length) return res.status(200).json({ message: 'No tokens', uid });
    const payload = {
      notification: { title: 'Testnachricht', body: 'Dies ist eine Test-Push.' },
      data: { action: 'test', machine: 'washer' },
    };
    const result = await sendToUserTokens(tokens, payload, uid);
    return res.status(200).json({ uid, ...result });
  } catch (e) {
    functions.logger.error('testNotify error', e);
    return res.status(500).json({ error: e.message });
  }
});
