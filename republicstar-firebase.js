/* Shared Firebase backend for Republicstar. */
var REPUBLICSTAR_FB_CONFIG = {
  apiKey:            "AIzaSyAIneOPChymm3DrtZqYmUv2LeX39VKG9-Y",
  authDomain:        "database-star-787e0.firebaseapp.com",
  projectId:         "database-star-787e0",
  storageBucket:     "database-star-787e0.firebasestorage.app",
  messagingSenderId: "117090678592",
  appId:             "1:117090678592:web:7af3aa1a209bc5adef2ca5"
};

(function(){
  function init() {
    if (typeof firebase === 'undefined') {
      console.warn('[RepublicstarDB] Firebase SDK not ready; retrying in 300ms');
      setTimeout(init, 300);
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(REPUBLICSTAR_FB_CONFIG);

      var db = firebase.firestore();
      var auth = firebase.auth();
      var functions = firebase.functions();
      var authReady = new Promise(function(resolve){
        auth.onAuthStateChanged(function(user){ resolve(user || null); });
      });

      function waitForAuth() {
        return authReady.then(function(user){
          if (!user) throw new Error('Authentication required');
          return user;
        });
      }

      function callFunction(name, data) {
        return functions.httpsCallable(name)(data || {}).then(function(result){ return result.data; });
      }

      function currentSessionUser() {
        return window.republicstarSession && window.republicstarSession.get
          ? window.republicstarSession.get()
          : null;
      }

      window.republicstarDB = {
        authReady: authReady,

        signInWithCustomToken: function(token, remember) {
          var persistence = remember
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;
          return auth.setPersistence(persistence).then(function(){
            return auth.signInWithCustomToken(token);
          });
        },

        signOut: function() {
          return auth.signOut();
        },

        call: callFunction,

        registerUser: function(data) {
          return callFunction('registerUser', data);
        },

        registerGuest: function() {
          return callFunction('registerGuest', {});
        },

        loginUser: function(userId, password) {
          return callFunction('loginUser', { userId: userId, password: password });
        },

        verifyLoginOtp: function(challengeId, code) {
          return callFunction('verifyLoginOtp', { challengeId: challengeId, code: code });
        },

        getUser: function(id) {
          return waitForAuth().then(function(){
            return db.collection('users').doc(id).get();
          }).then(function(d){ return d.exists ? d.data() : null; });
        },

        getAllUsers: function() {
          return waitForAuth().then(function(){
            return db.collection('users').get();
          }).then(function(snap){ return snap.docs.map(function(d){ return d.data(); }); });
        },

        updateUser: function(id, data) {
          var s = currentSessionUser();
          if (s && s.user === id && !(data && (data.status || data.role))) {
            return callFunction('completeSetup', data);
          }
          return callFunction('adminUpdateUser', { id: id, data: data });
        },

        deleteUser: function(id) {
          var s = currentSessionUser();
          if (s && s.user === id) return callFunction('deleteOwnAccount', {});
          return callFunction('adminDeleteUser', { id: id });
        },

        saveUser: function() {
          return Promise.reject(new Error('Direct user writes are disabled; use registerUser.'));
        },

        onUsers: function(cb) {
          var unsub = null;
          waitForAuth().then(function(){
            unsub = db.collection('users').onSnapshot(function(snap){
              cb(snap.docs.map(function(d){ return d.data(); }));
            });
          }).catch(function(err){
            console.error('[RepublicstarDB] onUsers auth error:', err);
          });
          return function(){ if (unsub) unsub(); };
        },

        emailExists: function(email) {
          return Promise.reject(new Error('Direct email lookup is disabled; use registerUser.'));
        }
      };

      console.log('[RepublicstarDB] Firebase connected');
    } catch(e) {
      console.error('[RepublicstarDB] Init error:', e);
    }
  }

  init();
})();
