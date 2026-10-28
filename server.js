require('dotenv').config();
const app = require('./src/app'); // Make sure this path is correct

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 IMS Server running on port ${PORT}`);
});