/* eslint-disable max-len */
const admin=require("firebase-admin");
const {setGlobalOptions, logger}=require("firebase-functions/v2");
const {onSchedule}=require("firebase-functions/v2/scheduler");
const {onRequest, onCall}=require("firebase-functions/v2/https");

admin.initializeApp();

setGlobalOptions({
  region: "asia-southeast1",
  memoryMiB: 256,
  timeoutSeconds: 120,
});

/**
 * Format a date as YYYY-MM-DD in the given IANA timezone.
 * @param {Date=} date
 * @param {string=} tz
 * @return {string}
 */
function ymdInTZ(date, tz) {
  const d=date||new Date();
  const zone=tz||"Asia/Bangkok";
  return new Intl.DateTimeFormat(
      "en-CA",
      {timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit"},
  ).format(d);
}

const db=admin.firestore();
const messaging=admin.messaging();

/**
 * Scan plants, group unwatered by owner, send one push per user.
 * Cleans invalid tokens.
 * @return {Promise<{sent:number}>}
 */
async function sendGroupedRemindersCore() {
  const today=ymdInTZ(new Date(), "Asia/Bangkok");

  /** @type {Map<string,{id:string,name:string}[]>} */
  const byOwner=new Map();
  const plantsSnap=await db.collection("plants").get();

  for (const docSnap of plantsSnap.docs) {
    const p=docSnap.data()||{};
    if (!p.ownerId) {
      continue;
    }

    /** @type {Date|null} */
    let last=null;
    if (p.lastWateredAt) {
      if (typeof p.lastWateredAt.toDate==="function") {
        last=p.lastWateredAt.toDate();
      } else {
        last=new Date(p.lastWateredAt);
      }
    }
    const lastStr=last?ymdInTZ(last, "Asia/Bangkok"):null;
    const wateredToday=lastStr===today;
    if (wateredToday) {
      continue;
    }

    const arr=byOwner.get(p.ownerId)||[];
    arr.push({id: docSnap.id, name: p.name||"Your plant"});
    byOwner.set(p.ownerId, arr);
  }

  let sent=0;
  const FieldValue=admin.firestore.FieldValue;

  for (const entry of byOwner.entries()) {
    const ownerId=entry[0];
    const plants=entry[1];

    const userDoc=await db.collection("users").doc(ownerId).get();
    if (!userDoc.exists) {
      continue;
    }

    const u=userDoc.data()||{};
    const tokensArr=Array.isArray(u.tokens)?u.tokens:[];
    const targetTokens=tokensArr.length?tokensArr:(u.fcmToken?[u.fcmToken]:[]);
    if (!targetTokens.length) {
      continue;
    }

    const first=plants[0].name;
    let extra="";
    if (plants.length>1) {
      extra=" and "+String(plants.length-1)+" more";
    }
    const title="Don’t forget to water 🌱";
    const body=first+extra+" haven’t been watered today";

    const plantIds=plants.map((x)=>x.id).join(",");

    const base={
      notification: {title: title, body: body},
      data: {type: "watering_reminder", plantIds: plantIds, count: String(plants.length)},
      webpush: {headers: {Urgency: "high"}, notification: {tag: "watering_reminder_daily", renotify: true}},
    };

    const sendPromises=targetTokens.map((token)=>{
      const msg=Object.assign({token: token}, base);
      return messaging.send(msg);
    });

    const results=await Promise.allSettled(sendPromises);

    for (let i=0; i<results.length; i++) {
      const r=results[i];
      if (r.status==="fulfilled") {
        sent++;
        continue;
      }
      const err=r.reason||{};
      let code="unknown";
      if (err.errorInfo&&err.errorInfo.code) {
        code=err.errorInfo.code;
      } else if (err.code) {
        code=err.code;
      }

      logger.warn(
          "Send failed",
          {
            ownerId: ownerId,
            code: code,
            msg: err.message?err.message:String(err),
          },
      );

      const bad=[
        "messaging/invalid-registration-token",
        "messaging/registration-token-not-registered",
      ];
      if (bad.includes(code)) {
        const badToken=targetTokens[i];
        try {
          await db.collection("users").doc(ownerId).update({
            tokens: FieldValue.arrayRemove(badToken),
          });
        } catch (e) {
          logger.warn(
              "Token cleanup failed",
              {
                ownerId: ownerId,
                error: e&&e.message?e.message:String(e),
              },
          );
        }
      }
    }
  }

  logger.info("Grouped reminders sent: "+String(sent));
  return {sent: sent};
}

/**
 * Runs daily at 20:00 Asia/Bangkok.
 */
exports.dailyWateringReminder=onSchedule(
    {schedule: "0 20 * * *", timeZone: "Asia/Bangkok"},
    async ()=>{
      return sendGroupedRemindersCore();
    },
);

/**
 * Manual trigger for testing: GET the function URL.
 */
exports.sendWateringRemindersNow=onRequest(
    async (req, res)=>{
      try {
        const result=await sendGroupedRemindersCore();
        res.status(200).json({ok: true, sent: result.sent});
      } catch (e) {
        const msg=(e&&e.message)?e.message:String(e);
        logger.error(msg);
        res.status(500).json({ok: false, error: msg});
      }
    },
);

/**
 * Ensure caller has both admin and superadmin claims.
 * Root-only operations.
 * @param {object} request - The callable function request
 */
function assertCallerIsRoot(request) {
  const t=(request.auth&&request.auth.token)||{};
  if (t.admin!==true||t.superadmin!==true) {
    throw new Error("permission-denied: Superadmins only.");
  }
}

/**
 * Promote a user to admin by email and mirror to /admins/{uid}.
 */
exports.addAdminByEmail=onCall(async (request)=>{
  assertCallerIsRoot(request);

  const email=String((request.data&&request.data.email)||"")
      .trim()
      .toLowerCase();
  if (!email) {
    throw new Error("invalid-argument: 'email' is required");
  }

  let user;
  try {
    user=await admin.auth().getUserByEmail(email);
  } catch (_) {
    throw new Error(`not-found: No user with email ${email}`);
  }

  await admin.auth().setCustomUserClaims(user.uid, {admin: true});

  await db.collection("admins").doc(user.uid).set(
      {
        uid: user.uid,
        email: email,
        admin: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy:
        (request.auth&&request.auth.token&&request.auth.token.email)||
        (request.auth&&request.auth.uid)||
        "unknown",
      },
      {merge: true},
  );

  logger.info("Promoted to admin", {uid: user.uid, email: email});
  return {ok: true, uid: user.uid};
});

/**
 * Demote an admin by uid and update /admins/{uid}.
 */
exports.removeAdminByUid=onCall(async (request)=>{
  assertCallerIsRoot(request);

  const uid=String((request.data&&request.data.uid)||"").trim();
  if (!uid) {
    throw new Error("invalid-argument: 'uid' is required");
  }

  await admin.auth().setCustomUserClaims(uid, {admin: false});

  await db.collection("admins").doc(uid).set(
      {
        admin: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy:
        (request.auth&&request.auth.token&&request.auth.token.email)||
        (request.auth&&request.auth.uid)||
        "unknown",
      },
      {merge: true},
  );

  logger.info("Demoted admin", {uid: uid});
  return {ok: true};
});
