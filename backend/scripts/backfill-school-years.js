import sequelize from '../db/dbConfig.js';
import SchoolYear from '../models/schoolYear.model.js';
import Class from '../models/class.model.js';

async function main() {
  try {
    console.log('Starting school year backfill...');

    // Ensure tables exist (safe in dev; in prod you may skip)
    await sequelize.sync({ alter: false });

    // Get distinct school_years from classes
    const [rows] = await sequelize.query("SELECT DISTINCT school_year FROM classes WHERE school_year IS NOT NULL");
    const years = rows.map(r => r.school_year).filter(Boolean);

    console.log('Found distinct class years:', years);

    for (const name of years) {
      const existing = await SchoolYear.findOne({ where: { name } });
      if (!existing) {
        console.log('Creating school year:', name);
        await SchoolYear.create({ name, is_active: false });
      }
    }

    // If no active year exists, set the most recent year (by numeric sort) active
    const active = await SchoolYear.getActive();
    if (!active) {
      const all = await SchoolYear.findAll();
      const sorted = all.sort((a, b) => {
        const ay = parseInt((a.name || '').slice(0, 4), 10) || 0;
        const by = parseInt((b.name || '').slice(0, 4), 10) || 0;
        return by - ay;
      });
      if (sorted[0]) {
        console.log('No active year; activating', sorted[0].name);
        await SchoolYear.activate(sorted[0].id);
      }
    }

    console.log('Backfill complete.');
    process.exit(0);
  } catch (e) {
    console.error('Backfill failed:', e);
    process.exit(1);
  }
}

main();
