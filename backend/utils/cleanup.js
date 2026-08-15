import { Op } from 'sequelize';
import User from '../models/user.model.js';
import Student from '../models/student.model.js';
import AuditLog from '../models/auditLog.model.js';

export const purgeDeletedUsers = async () => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await User.findAll({
      where: { is_deleted: true, deleted_at: { [Op.lte]: cutoff } },
      attributes: ['id', 'user_role', 'user_email']
    });
    if (!candidates.length) return { purged: 0 };

    // For student users, detach Student rows then proceed
    for (const u of candidates) {
      if (u.user_role === 'student') {
        try {
          await Student.update({ is_deleted: true, user_id: null }, { where: { user_id: u.id } });
        } catch {}
      }
    }

    const ids = candidates.map(u => u.id);
    await User.destroy({ where: { id: { [Op.in]: ids } } });

    // Audit entry for purge summary
    try {
      await AuditLog.create({
        user_id: null,
        user_email: null,
        user_role: 'system',
        action: 'AUTO_PURGE_DELETED_USERS',
        method: 'SYSTEM',
        path: '/system/cleanup',
        entity_type: 'user',
        entity_id: String(ids.length),
        ip_address: null,
        user_agent: 'scheduler',
        metadata: { count: ids.length, cutoff: cutoff.toISOString() }
      });
    } catch {}

    return { purged: ids.length };
  } catch (e) {
    console.error('Purge deleted users failed:', e.message);
    return { purged: 0, error: e.message };
  }
};

export const scheduleUserPurge = () => {
  const run = async () => {
    const res = await purgeDeletedUsers();
    if (res.purged) {
      console.log(`🧹 Purged ${res.purged} user(s) marked deleted for >7 days`);
    }
  };
  // Run once at startup and then every 24 hours
  run().catch(()=>{});
  const dayMs = 24 * 60 * 60 * 1000;
  setInterval(run, dayMs);
};

export default { purgeDeletedUsers, scheduleUserPurge };
