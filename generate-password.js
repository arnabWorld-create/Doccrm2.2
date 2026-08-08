const bcrypt = require('bcryptjs');

bcrypt.hash('admin123', 8).then(hash => {
  console.log('\nRun this SQL in Supabase:');
  console.log('\nUPDATE users SET password = \'' + hash + '\' WHERE email = \'admin@doxcia.com\';');
  console.log('\nPassword: admin123');
});
