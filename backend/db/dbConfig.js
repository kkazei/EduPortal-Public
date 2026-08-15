import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Decide if we use Supabase Postgres pooler or fallback to local MySQL
const useSupabase = process.env.SUPABASE_POOLER_HOST && process.env.FORCE_POOLER === 'true';

const dialect = useSupabase ? 'postgres' : 'mysql';

const dbConfig = useSupabase
  ? {
      database: process.env.SUPABASE_PG_DATABASE,
      username: process.env.SUPABASE_PG_USER,
      password: process.env.SUPABASE_PG_PASSWORD,
      host: process.env.SUPABASE_POOLER_HOST,
      port: Number(process.env.SUPABASE_POOLER_PORT) || 5432,
    }
  : {
      database: process.env.MYSQL_ADDON_DB || process.env.MYSQL_DATABASE,
      username: process.env.MYSQL_ADDON_USER || process.env.MYSQL_USER,
      password: process.env.MYSQL_ADDON_PASSWORD || process.env.MYSQL_PASSWORD || null,
      host: process.env.MYSQL_ADDON_HOST || process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_ADDON_PORT || process.env.MYSQL_PORT) || 3306,
    };

// Determine environment and SQL logging preference
const isProduction = process.env.NODE_ENV === 'production';
const DB_LOG_QUERIES = process.env.DB_LOG_QUERIES;
const shouldLogSql = DB_LOG_QUERIES ? DB_LOG_QUERIES === 'true' : !isProduction;

if (!isProduction) {
  console.log(`Connecting (${dialect}) to database: ${dbConfig.database} on host: ${dbConfig.host}:${dbConfig.port}`);
}

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect,
  port: dbConfig.port,
  logging: shouldLogSql ? console.log : false,
  dialectOptions: {
    // Supabase Postgres typically requires SSL unless using the pooler; pooler may terminate SSL.
    // Provide ssl options when not explicitly disabled.
    ...(dialect === 'postgres'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : { connectTimeout: 60000 }),
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
  retry: {
    max: 3,
    match: [/Deadlock/i, /SequelizeConnectionError/],
  },
});

export const connectDb = async () => {
  try {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        await sequelize.authenticate();
        if (!isProduction) {
          console.log(`✅ ${dialect.toUpperCase()} connected successfully.`);
        }
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) throw error;
        if (!isProduction) {
          console.log(`⚠️ ${dialect} connection attempt ${attempts} failed, retrying in 5 seconds...`);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error(`❌ ${dialect.toUpperCase()} connection failed:`, error.message);
    throw error;
  }
};

// Modified function to initialize database with models - with safer options
export const initializeDb = async (syncOptions = {}) => {
  try {
    // isProduction defined above
    
    // MySQL-specific: temporarily disable foreign key checks. Skip for Postgres.
    if (dialect === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    }
    
    // Use safer options in production to avoid altering tables
    const options = {
      ...syncOptions,
      // Disable alter for initial Postgres migration to avoid problematic ALTER COLUMN UNIQUE syntax
      alter: dialect === 'postgres' ? false : (isProduction ? false : (syncOptions.alter ?? true))
    };
    
    if (!isProduction) {
      console.log('🔧 Using database sync options:', options);
    }
    
    // Import monthly school days model BEFORE sync so table is created
    let MonthlySchoolDayModel;
    try {
      const { default: MonthlySchoolDay } = await import('../models/monthlySchoolDay.model.js');
      MonthlySchoolDayModel = MonthlySchoolDay;
    } catch (e) {
      if (!isProduction) console.error('⚠️ Failed to import MonthlySchoolDay before sync:', e.message);
    }

    // Sync all models with the database (includes monthly school days now)
    await sequelize.sync(options);
    
    // Re-enable foreign key checks for MySQL only
    if (dialect === 'mysql') {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    
    if (!isProduction) {
      console.log('✅ Database synchronized successfully.');
    }

    // For Postgres production, ensure newly added columns/constraints exist
    if (dialect === 'postgres') {
      try {
        // Add archival and soft-delete columns to classes table if missing
        await sequelize.query(
          `ALTER TABLE IF EXISTS "classes"
             ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL,
             ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
             ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;`
        );

        // Ensure start_date and end_date are NOT NULL on school_years
        // First add columns if missing (defensive), then set NOT NULL
        await sequelize.query(
          `ALTER TABLE IF EXISTS "school_years"
             ADD COLUMN IF NOT EXISTS start_date DATE,
             ADD COLUMN IF NOT EXISTS end_date DATE;`
        );
        await sequelize.query(
          `UPDATE "school_years" SET start_date = start_date WHERE start_date IS NULL;`
        );
        await sequelize.query(
          `UPDATE "school_years" SET end_date = end_date WHERE end_date IS NULL;`
        );
        await sequelize.query(
          `ALTER TABLE IF EXISTS "school_years"
             ALTER COLUMN start_date SET NOT NULL,
             ALTER COLUMN end_date SET NOT NULL;`
        );

        if (!isProduction) {
          console.log('🔒 Postgres schema ensured for classes and school_years.');
        }
      } catch (pgSchemaError) {
        console.error('⚠️ Failed to ensure Postgres schema:', pgSchemaError.message);
      }
    }
    
    // Seed privileged accounts only when explicitly enabled via env flags.
    try {
      // Import User model dynamically to avoid circular dependency
      const { default: User, createDefaultSuperAdmin } = await import('../models/user.model.js');
      await User.createDefaultAdmin();
      await createDefaultSuperAdmin();
    } catch (adminError) {
      if (!isProduction) {
        console.error('⚠️ Failed to create default admin (might be normal if already exists):', adminError.message);
      }
    }
    
    // Seed default subjects after admin creation
    try {
      const { seedDefaultSubjects } = await import('../models/subject.model.js');
      await seedDefaultSubjects();
    } catch (subjectError) {
      if (!isProduction) {
        console.error('⚠️ Failed to seed default subjects:', subjectError.message);
      }
    }

    // Seed default monthly school days (active year)
    try {
      const { seedDefaultMonthlySchoolDays } = await import('../models/monthlySchoolDay.model.js');
      await seedDefaultMonthlySchoolDays();
    } catch (daysError) {
      if (!isProduction) {
        console.error('⚠️ Failed to seed default monthly school days:', daysError.message);
      }
    }
    
    if (!isProduction) {
      console.log('✅ Database initialization complete.');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    // Ensure foreign key checks are re-enabled even if an error occurs
    if (dialect === 'mysql') {
      try {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch (fkError) {
        console.error('Failed to re-enable foreign key checks:', fkError);
      }
    }
    
    throw error;
  }
};

export default sequelize;