/* ═══════════════════════════════════════════════════
   REPUBLICSTAR FIREBASE  —  Shared Firestore backend
   United Republic of Stars
═══════════════════════════════════════════════════ */

/* ── FILL IN YOUR FIREBASE CONFIG HERE ── */
var REPUBLICSTAR_FB_CONFIG = {
  apiKey:            "AIzaSyAIneOPChymm3DrtZqYmUv2LeX39VKG9-Y",
  authDomain:        "database-star-787e0.firebaseapp.com",
  projectId:         "database-star-787e0",
  storageBucket:     "database-star-787e0.firebasestorage.app",
  messagingSenderId: "117090678592",
  appId:             "1:117090678592:web:7af3aa1a209bc5adef2ca5"
};

(function(){
  if (typeof firebase === 'undefined'){
    console.warn('[RepublicstarDB] Firebase SDK not ready — retrying in 300ms');
    setTimeout(arguments.callee, 300);
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(REPUBLICSTAR_FB_CONFIG);
    var db = firebase.firestore();

    window.republicstarDB = {
      /* Read single user by ID */
      getUser: function(id){
        return db.collection('users').doc(id).get()
          .then(function(d){ return d.exists ? d.data() : null; });
      },

      /* Read all users (one-time) */
      getAllUsers: function(){
        return db.collection('users').get()
          .then(function(snap){ return snap.docs.map(function(d){ return d.data(); }); });
      },

      /* Write / overwrite a user document */
      saveUser: function(user){
        return db.collection('users').doc(user.id).set(user);
      },

      /* Partial update */
      updateUser: function(id, data){
        return db.collection('users').doc(id).update(data);
      },

      /* Delete a user */
      deleteUser: function(id){
        return db.collection('users').doc(id).delete();
      },

      /* Real-time listener — calls cb(usersArray) on every change */
      onUsers: function(cb){
        return db.collection('users').onSnapshot(function(snap){
          cb(snap.docs.map(function(d){ return d.data(); }));
        });
      },

      /* Check if email already registered */
      emailExists: function(email){
        return db.collection('users').where('email','==',email).get()
          .then(function(snap){ return !snap.empty; });
      },

      /* Fetch EmailJS credentials stored in Firestore (never in source) */
      getEmailConfig: function(){
        return db.collection('config').doc('emailjs').get()
          .then(function(doc){
            if (!doc.exists) throw new Error('EmailJS config missing in Firestore');
            return doc.data();
          });
      }
    };

    console.log('[RepublicstarDB] Firestore connected ✓');
  } catch(e){
    console.error('[RepublicstarDB] Init error:', e);
  }
})();
