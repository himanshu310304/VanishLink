const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    lastLoginAt: { type: Date, default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    providerId: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { timestamps: true }
);

// Hash password before saving if modified (Mongoose v9 async pre without next)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // Skip hashing if password is null (OAuth users)
  if (!this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
	return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
