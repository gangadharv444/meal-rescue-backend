const app = require('./app');
const config = require('./config/env');
const mongoose = require('mongoose');

mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(config.port, '0.0.0.0', () => {
        console.log(`✅ Server is running on http://0.0.0.0:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB', err);
    process.exit(1);
  });
