import { Op } from 'sequelize';
import AuditLog from '../models/auditLog.model.js';
import User from '../models/user.model.js';
import ActionCode from '../models/actionCode.model.js';

export const listAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 25, user_id, action, from, to, role } = req.query;
    const where = {};
    // By default, hide requests to the audit endpoints so the act of viewing/exporting
    // logs doesn't appear in the results. Pass include_audit=true to override.
    const includeAudit = String(req.query.include_audit || '').toLowerCase() === 'true';
    if (!includeAudit) {
      where.path = { [Op.notLike]: '/api/audit-logs%' };
    }
    if (user_id) where.user_id = user_id;
    if (role) where.user_role = role; // allow filtering by role
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (from || to) {
      where.created_at = {};
      const normalizeDate = (str, end = false) => {
        try {
          if (!str) return null;
          // If it's a date-only like YYYY-MM-DD, expand to full day window
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return end
              ? new Date(`${str}T23:59:59.999`)
              : new Date(`${str}T00:00:00.000`);
          }
          return new Date(str);
        } catch (_) {
          return null;
        }
      };
      const fromDate = normalizeDate(from, false);
      const toDate = normalizeDate(to, true);
      if (fromDate) where.created_at[Op.gte] = fromDate;
      if (toDate) where.created_at[Op.lte] = toDate;
    }

    // Special case: only admin or superadmin can request full result set by passing limit=all
    if (String(limit).toLowerCase() === 'all') {
      const role = req.user?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Only admin or superadmin can request full logs' });
      }
      // Safety cap to prevent unbounded memory usage
      const MAX_ROWS = 25000;
      const rows = await AuditLog.findAll({
        where,
        order: [['created_at', 'DESC']],
        limit: MAX_ROWS,
      });
      // Attach user_fullname via a lightweight lookup to avoid schema changes
      const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
      const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id','user_fullname','user_email'] }) : [];
      const map = new Map(users.map(u => [u.id, u.user_fullname]));
      const withName = rows.map(r => {
        const j = r.toJSON();
        j.user_fullname = map.get(j.user_id) || null;
        return j;
      });
      const count = await AuditLog.count({ where });
      // Provide a header indicating potential truncation
      if (count > MAX_ROWS) {
        res.setHeader('X-Result-Truncated', 'true');
        res.setHeader('X-Result-Limit', String(MAX_ROWS));
      }
      return res.status(200).json({ success: true, data: withName, total: count, page: 1 });
    }

    const numLimit = parseInt(limit);
    const numPage = parseInt(page);
    const offset = (numPage - 1) * numLimit;
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: numLimit,
      offset,
    });
    const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id','user_fullname','user_email'] }) : [];
    const map = new Map(users.map(u => [u.id, u.user_fullname]));
    const withName = rows.map(r => {
      const j = r.toJSON();
      j.user_fullname = map.get(j.user_id) || null;
      return j;
    });

    res.status(200).json({ success: true, data: withName, total: count, page: numPage });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
  }
};

// CSV export for superadmin
export const exportAuditLogsCsv = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only superadmin can export full logs' });
    }

    // Verify action code (headers allow GET usage)
    const actionCodeId = req.headers['x-action-code-id'];
    const actionCodeValue = req.headers['x-action-code'];
    if (!actionCodeId || !actionCodeValue) {
      return res.status(400).json({ success:false, message:'Action code required for export' });
    }
    const ac = await ActionCode.findOne({ where: { id: actionCodeId, user_id: req.user.id, action_type: 'export_audit_logs' } });
    if (!ac) return res.status(400).json({ success:false, message:'Invalid action code request' });
    if (ac.used_at) return res.status(400).json({ success:false, message:'Action code already used' });
    if (new Date(ac.expires_at) < new Date()) return res.status(400).json({ success:false, message:'Action code expired' });
    if (ac.code !== String(actionCodeValue)) return res.status(400).json({ success:false, message:'Incorrect action code' });

    const { user_id, action, from, to, role } = req.query;
    const where = {};
    const includeAudit = String(req.query.include_audit || '').toLowerCase() === 'true';
    if (!includeAudit) {
      where.path = { [Op.notLike]: '/api/audit-logs%' };
    }
    if (user_id) where.user_id = user_id;
    if (role) where.user_role = role; // role filter for export
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (from || to) {
      // Normalize date-only strings to full day just like list endpoint
      where.created_at = {};
      const normalizeDate = (str, end = false) => {
        try {
          if (!str) return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return end
              ? new Date(`${str}T23:59:59.999`)
              : new Date(`${str}T00:00:00.000`);
          }
          return new Date(str);
        } catch (_) {
          return null;
        }
      };
      const fromDate = normalizeDate(from, false);
      const toDate = normalizeDate(to, true);
      if (fromDate) where.created_at[Op.gte] = fromDate;
      if (toDate) where.created_at[Op.lte] = toDate;
    }

    const rows = await AuditLog.findAll({ where, order: [['created_at', 'DESC']] });
    // Map names for CSV as well
    const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    const users = ids.length ? await User.findAll({ where: { id: ids }, attributes: ['id','user_fullname'] }) : [];
    const map = new Map(users.map(u => [u.id, u.user_fullname]));

    const header = ['id','created_at','user_id','user_fullname','user_email','user_role','action','method','path','entity_type','entity_id','ip_address'];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        r.id,
        r.created_at?.toISOString?.() || r.created_at,
        r.user_id,
        map.get(r.user_id) || '',
        r.user_email,
        r.user_role,
        r.action,
        r.method,
        r.path,
        r.entity_type,
        r.entity_id,
        r.ip_address,
      ].map(escape).join(','));
    }

    const csv = lines.join('\n');
    const filename = `audit_logs_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Mark action code used after successful generation
    await ac.update({ used_at: new Date() });
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to export audit logs', error: error.message });
  }
};

// Delete audit logs (filtered or all) - superadmin only with action code
export const deleteAuditLogs = async (req, res) => {
  try {
    if (req.user?.role !== 'superadmin') {
      return res.status(403).json({ success:false, message:'Only superadmin can delete logs' });
    }
    const actionCodeId = req.headers['x-action-code-id'];
    const actionCodeValue = req.headers['x-action-code'];
    if (!actionCodeId || !actionCodeValue) {
      return res.status(400).json({ success:false, message:'Action code required for deletion' });
    }
    const ac = await ActionCode.findOne({ where: { id: actionCodeId, user_id: req.user.id, action_type: 'delete_audit_logs' } });
    if (!ac) return res.status(400).json({ success:false, message:'Invalid action code request' });
    if (ac.used_at) return res.status(400).json({ success:false, message:'Action code already used' });
    if (new Date(ac.expires_at) < new Date()) return res.status(400).json({ success:false, message:'Action code expired' });
    if (ac.code !== String(actionCodeValue)) return res.status(400).json({ success:false, message:'Incorrect action code' });

    const { all, user_id, action, from, to, role } = req.query;
    let where = {};
    if (String(all).toLowerCase() !== 'true') {
      if (user_id) where.user_id = user_id;
      if (role) where.user_role = role; // role filter for deletion
      if (action) where.action = { [Op.like]: `%${action}%` };
      if (from || to) {
        where.created_at = {};
        const normalizeDate = (str, end = false) => {
          try { if (!str) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return end ? new Date(`${str}T23:59:59.999`) : new Date(`${str}T00:00:00.000`); return new Date(str); } catch { return null; }
        };
        const fromDate = normalizeDate(from, false);
        const toDate = normalizeDate(to, true);
        if (fromDate) where.created_at[Op.gte] = fromDate;
        if (toDate) where.created_at[Op.lte] = toDate;
      }
    }

    const deletedCount = await AuditLog.destroy({ where });
    await ac.update({ used_at: new Date() });
    return res.status(200).json({ success:true, message:'Audit logs deleted', deleted: deletedCount });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    res.status(500).json({ success:false, message:'Failed to delete audit logs', error: error.message });
  }
};

export default { listAuditLogs };