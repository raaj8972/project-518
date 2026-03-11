const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'sports.council@rico.family';
const password = process.env.COUNCIL_SECRET_PASSWORD || 'R1c0_Sp0rt5_C0unc1l_H1dd3n_P@ssw0rd!';

admin.auth().getUserByEmail(email)
  .then((userRecord) => {
    console.log('User found! UID:', userRecord.uid);
    return admin.auth().updateUser(userRecord.uid, {
      password: password
    });
  })
  .then((userRecord) => {
    console.log('Successfully updated user password');
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error fetching user data:', error);
    process.exit(1);
  });
