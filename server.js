// require('dotenv').config();
// const app = require('./src/app'); // Make sure this path is correct

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`🚀 IMS Server running on port ${PORT}`);
// });


require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db'); // Ensure correct path to your db config
const { seedRBAC } = require('./src/modules/rbac/utils/seedRBAC');

const PORT = process.env.PORT || 4000;

// Connect to DB, then seed RBAC, then start server
connectDB().then(async () => {
  // This will create the "super_admin", "faculty", etc. roles in MongoDB
  await seedRBAC(); 
  
  app.listen(PORT, () => {
    console.log(`🚀 IMS Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to DB', err);
});