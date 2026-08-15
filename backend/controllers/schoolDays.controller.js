import MonthlySchoolDay, { seedDefaultMonthlySchoolDays, getDefaultsMap } from '../models/monthlySchoolDay.model.js';
import SchoolYear from '../models/schoolYear.model.js';

// GET /api/attendance/school-days/:schoolYear?
export const getMonthlySchoolDays = async (req, res) => {
  try {
    const { schoolYear } = req.params;
    const targetYear = schoolYear || await SchoolYear.getActiveYearName();

    // Ensure defaults exist for the requested year
    await seedDefaultMonthlySchoolDays(targetYear);

    const rows = await MonthlySchoolDay.findAll({
      where: { school_year: targetYear },
      order: [['id', 'ASC']]
    });

    const mapped = rows.reduce((acc, r) => {
      acc[r.month] = r.school_days; return acc;
    }, {});

    return res.status(200).json({ school_year: targetYear, months: mapped });
  } catch (e) {
    console.error('Error fetching monthly school days:', e);
    return res.status(500).json({ message: 'Failed to fetch monthly school days', error: e.message });
  }
};

// PUT /api/attendance/school-days/:schoolYear
// Body: { months: { June: 12, July: 22, ... }}
export const updateMonthlySchoolDays = async (req, res) => {
  try {
    const { schoolYear } = req.params;
    const targetYear = schoolYear || await SchoolYear.getActiveYearName();
    const { months } = req.body;

    if (!months || typeof months !== 'object') {
      return res.status(400).json({ message: 'Invalid months payload. Expected object map.' });
    }

    const allowedMonths = Object.keys(getDefaultsMap());
    const updates = Object.entries(months).filter(([m, v]) => allowedMonths.includes(m));

    if (!updates.length) {
      return res.status(400).json({ message: 'No valid month entries provided.' });
    }

    for (const [month, days] of updates) {
      if (isNaN(days) || days < 0) continue;
      const [row, created] = await MonthlySchoolDay.findOrCreate({
        where: { school_year: targetYear, month },
        defaults: { school_days: days }
      });
      if (!created) await row.update({ school_days: days });
    }

    // Return updated set
    const rows = await MonthlySchoolDay.findAll({ where: { school_year: targetYear } });
    const mapped = rows.reduce((acc, r) => { acc[r.month] = r.school_days; return acc; }, {});
    return res.status(200).json({ message: 'Monthly school days updated', school_year: targetYear, months: mapped });
  } catch (e) {
    console.error('Error updating monthly school days:', e);
    return res.status(500).json({ message: 'Failed to update monthly school days', error: e.message });
  }
};

// (Deprecated helper removed; seeding handled per request year)
