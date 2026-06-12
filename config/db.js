require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('YOUR_USER')) {
    throw new Error(
      'MONGODB_URI ma jiro .env faylka. Abuur .env oo ku dar connection string-ka MongoDB Atlas.'
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('MongoDB: waa la xiray');
}

module.exports = connectDB;
