import SchoolYear from '../models/schoolYear.model.js';
import { Op } from 'sequelize';

// Helper: automatically end any active school years whose end_date has passed
const autoEndPassedYears = async () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    await SchoolYear.update(
      { is_active: false },
      {
        where: {
          is_active: true,
          end_date: { [Op.lte]: today }
        }
      }
    );
  } catch (_) {
    // non-fatal safeguard; ignore
  }
};

export const listSchoolYears = async (req, res) => {
  try {
    await autoEndPassedYears();
    const years = await SchoolYear.findAll({ order: [['name', 'DESC']] });
    res.status(200).json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list school years', error: error.message });
  }
};

export const getCurrentSchoolYear = async (req, res) => {
  try {
    await autoEndPassedYears();
    const active = await SchoolYear.getActive();
    res.status(200).json({ success: true, data: active });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get current school year', error: error.message });
  }
};

export const createSchoolYear = async (req, res) => {
  try {
    const { name, start_date, end_date, is_active } = req.body;
    if (!name || !/^\d{4}-\d{4}$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Invalid name. Expected YYYY-YYYY.' });
    }
    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'Start date and End date are required.' });
    }
    // Ensure chronological order
    if (new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ success: false, message: 'Start date must be before End date.' });
    }

    const exists = await SchoolYear.findOne({ where: { name } });
    if (exists) {
      return res.status(409).json({ success: false, message: 'School year already exists' });
    }

    const year = await SchoolYear.create({ name, start_date, end_date, is_active: !!is_active });

    if (is_active) {
      await SchoolYear.activate(year.id);
      await year.reload();
    }

    res.status(201).json({ success: true, data: year });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create school year', error: error.message });
  }
};

export const activateSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent activating an ended school year
    const target = await SchoolYear.findByPk(id);
    if (!target) return res.status(404).json({ success: false, message: 'School year not found' });
    const today = new Date().toISOString().slice(0, 10);
    if (target.end_date && target.end_date <= today) {
      return res.status(400).json({ success: false, message: 'This school year has ended and cannot be activated again.' });
    }

    const updated = await SchoolYear.activate(id);
    if (!updated) return res.status(404).json({ success: false, message: 'School year not found' });
    const current = await SchoolYear.getActive();
    res.status(200).json({ success: true, message: 'School year activated', data: current });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate school year', error: error.message });
  }
};

// Set a school year as ended (deactivate and optionally set end_date)
export const endSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { end_date } = req.body || {};

    const year = await SchoolYear.findByPk(id);
    if (!year) {
      return res.status(404).json({ success: false, message: 'School year not found' });
    }

    // Mark inactive and set end_date (use provided date or today)
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    await year.update({ is_active: false, end_date: end_date || isoToday });

    res.status(200).json({ success: true, message: 'School year ended', data: year });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end school year', error: error.message });
  }
};

// Update school year details (name/start_date/end_date)
export const updateSchoolYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;

    const year = await SchoolYear.findByPk(id);
    if (!year) return res.status(404).json({ success: false, message: 'School year not found' });

    if (name && !/^\d{4}-\d{4}$/.test(name)) {
      return res.status(400).json({ success: false, message: 'Invalid name. Expected YYYY-YYYY.' });
    }
    // Dates are required by model; if provided, validate order
    if ((start_date && !end_date) || (!start_date && end_date)) {
      return res.status(400).json({ success: false, message: 'Provide both Start and End dates when updating.' });
    }
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
      return res.status(400).json({ success: false, message: 'Start date must be before End date.' });
    }

    // Prevent setting end_date in the past to active year
    const today = new Date().toISOString().slice(0, 10);
    if (year.is_active && end_date && end_date <= today) {
      return res.status(400).json({ success: false, message: 'Active year cannot be set to an ended state via update. Use End action.' });
    }

    await year.update({
      name: name ?? year.name,
      start_date: start_date ?? year.start_date,
      end_date: end_date ?? year.end_date
    });

    return res.status(200).json({ success: true, message: 'School year updated', data: year });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update school year', error: error.message });
  }
};

export default {
  listSchoolYears,
  getCurrentSchoolYear,
  createSchoolYear,
  activateSchoolYear,
  endSchoolYear,
  updateSchoolYear
};
