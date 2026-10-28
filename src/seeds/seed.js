require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/auth/models/User');

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB for seeding...');

    // Check if super admin exists
    const existingAdmin = await User.findOne({ email: 'admin@ims.com' });
    if (existingAdmin) {
      console.log('Super Admin already exists!');
      process.exit(0);
    }

    // Create Super Admin
    await User.create({
      name: 'Super Admin',
      email: 'admin@ims.com',
      password: 'password123', // This will be hashed automatically by the Mongoose pre-save hook
      role: 'super_admin',
      is_active: true
    });

    console.log('✅ Super Admin created successfully!');
    console.log('Email: admin@ims.com');
    console.log('Password: password123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding DB:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
