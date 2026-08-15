import { Visitor } from '../models/index.js';

export const registerVisit = async (req, res) => {
  try {
    const { visitorUid } = req.body || {};
    if (!visitorUid || typeof visitorUid !== 'string') {
      return res.status(400).json({ success: false, message: 'visitorUid is required' });
    }

    // Try to find existing visitor by UID
    const existing = await Visitor.findOne({ where: { visitor_uid: visitorUid } });
    let created = false;
    if (!existing) {
      await Visitor.create({
        visitor_uid: visitorUid,
        user_agent: req.headers['user-agent']?.slice(0, 255) || null,
      });
      created = true;
    } else {
      // Update last_seen and increment visits
      existing.last_seen = new Date();
      existing.visits = (existing.visits || 1) + 1;
      await existing.save();
    }

    // Return total visits (non-unique) = sum of visits column
    const totalVisits = await Visitor.sum('visits');
    return res.json({ success: true, data: { totalVisits: totalVisits || 0, created } });
  } catch (err) {
    console.error('registerVisit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register visit' });
  }
};

export const getTotalVisits = async (_req, res) => {
  try {
    // Total visits (non-unique)
    const totalVisits = await Visitor.sum('visits');
    return res.json({ success: true, data: { totalVisits: totalVisits || 0 } });
  } catch (err) {
    console.error('getTotalVisits error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch total visits' });
  }
};
