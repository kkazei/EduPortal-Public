import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  user_email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  // Email verification fields
  is_email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  pending_email: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  email_verification_code: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  email_verification_expires: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  user_fullname: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  user_role: {
    type: DataTypes.ENUM('teacher', 'student', 'admin', 'superadmin'),
    defaultValue: 'teacher',
  },
  teacher_title: {
    type: DataTypes.ENUM(
      'Teacher I',
      'Teacher II',
      'Teacher III',
      'Master Teacher I',
      'Master Teacher II',
      'Master Teacher III',
      'Master Teacher IV'
    ),
    allowNull: true,
    defaultValue: null,
    validate: {
      isTeacherTitle(value) {
        // Only allow teacher_title for users with teacher role
        if (value && this.user_role !== 'teacher') {
          throw new Error('Teacher title can only be assigned to users with teacher role');
        }
      }
    }
  },
  is_first_login: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true, // New users will have first login as true
    validate: {
      isFirstLoginForStudent(value) {
        // Only students should use the first login feature
        if (value === true && this.user_role !== 'student') {
          // Allow true for students, but for non-students it should typically be false
          // This is more of a business logic validation
        }
      }
    }
  },
  // Soft delete flags for secure deactivation instead of hard deletion
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  // ADD THESE FIELDS FOR FORGOT PASSWORD FUNCTIONALITY
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  resetPasswordExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  underscored: true,
  hooks: {
    beforeCreate: (user) => {
      // Set default teacher title for new teachers
      if (user.user_role === 'teacher' && !user.teacher_title) {
        user.teacher_title = 'Teacher I';
      }
      // Clear teacher title for non-teachers
      if (user.user_role !== 'teacher') {
        user.teacher_title = null;
      }
      
      // Set is_first_login based on user role
      if (user.user_role === 'student') {
        user.is_first_login = true; // Students need to change password on first login
      } else {
        user.is_first_login = false; // Admins and teachers don't need first-time password change
      }
    },
    beforeUpdate: (user) => {
      // Clear teacher title for non-teachers
      if (user.user_role !== 'teacher') {
        user.teacher_title = null;
      }
      
      // Business logic: only students should have is_first_login as true
      if (user.user_role !== 'student' && user.is_first_login === true) {
        user.is_first_login = false;
      }
      // When marking deleted, set timestamp if not set; when un-deleting, clear timestamp
      if (user.is_deleted && !user.deleted_at) {
        user.deleted_at = new Date();
      }
      if (!user.is_deleted && user.deleted_at) {
        user.deleted_at = null;
      }
    }
  }
});

// Static method to create default admin
User.createDefaultAdmin = async () => {
  try {
    const shouldSeedAdmin = process.env.SEED_DEFAULT_ADMIN === 'true';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    // Do not auto-create privileged users unless explicitly enabled.
    if (!shouldSeedAdmin || !adminEmail || !adminPassword) {
      return null;
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      where: { 
        user_email: adminEmail,
        user_role: 'admin'
      }
    });

    if (existingAdmin) {
      console.log('✅ Default admin account already exists');
      return existingAdmin;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create the admin user
    const adminUser = await User.create({
      user_email: adminEmail,
      user_fullname: 'Admin',
      password: hashedPassword,
      user_role: 'admin',
      teacher_title: null, // Admin doesn't have teacher title
      is_first_login: false // Admin doesn't need first-time password change
    });

    console.log('✅ Default admin account created successfully');
    
    return adminUser;
  } catch (error) {
    console.error('❌ Failed to create default admin:', error);
    throw error;
  }
};

export default User;
 
// Optionally seed a superadmin if env vars are present
export const createDefaultSuperAdmin = async () => {
  try {
    // If any superadmin exists, don't create another
    const existingAny = await User.findOne({ where: { user_role: 'superadmin' } });
    if (existingAny) return existingAny;

    // Require explicit seeding and credentials in all environments.
    const seedFlag = process.env.SEED_SUPERADMIN === 'true';
    const emailFromEnv = process.env.SUPERADMIN_EMAIL;
    const passFromEnv = process.env.SUPERADMIN_PASSWORD;

    const email = emailFromEnv;
    const pass = passFromEnv;

    if (!seedFlag || !email || !pass) return null;

    const hashed = await bcrypt.hash(pass, 12);
    const user = await User.create({ user_email: email, user_fullname: 'Super Admin', password: hashed, user_role: 'superadmin', is_first_login: false });
    console.log(`✅ Default superadmin created (${email})`);
    return user;
  } catch (e) {
    console.error('Failed to create default superadmin:', e.message);
    return null;
  }
};