import User from '../models/user.model.js';
import ActionCode from '../models/actionCode.model.js';
import Student from '../models/student.model.js';
import Class from '../models/class.model.js';
import Subject from '../models/subject.model.js';
import AuditLog from '../models/auditLog.model.js';
import { Op, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendActionSecurityCodeEmail } from '../nodemailer/emails.js';

export const listUsers = async (req, res) => {
  try {
  const { q, role, sort, include_deleted, only_deleted } = req.query;
  let where = { is_deleted: false };
    if (q && String(q).trim() !== '') {
      const qq = String(q).trim();
      const idMatch = qq.toLowerCase().startsWith('id:') ? parseInt(qq.slice(3), 10) : parseInt(qq, 10);
      const idCond = !Number.isNaN(idMatch) ? [{ id: idMatch }] : [];
      where = {
        ...(include_deleted === 'true' ? {} : { is_deleted: false }),
        [Op.or]: [
          { user_email: { [Op.like]: `%${qq}%` } },
          { user_fullname: { [Op.like]: `%${qq}%` } },
          ...idCond,
        ]
      };
    }
    // Optional deleted filter overrides
    if (only_deleted === 'true') {
      where.is_deleted = true;
    } else if (include_deleted === 'true') {
      delete where.is_deleted; // no restriction
    }

    // Optional role filter
    if (role && ['student','teacher','admin','superadmin'].includes(role)) {
      where = { ...(where || {}), user_role: role };
    }

    // Sorting
    const sortMap = {
      'created_desc': [['created_at', 'DESC']],
      'created_asc': [['created_at', 'ASC']],
      'name_asc': [['user_fullname', 'ASC']],
      'name_desc': [['user_fullname', 'DESC']],
      'role_asc': [['user_role', 'ASC'], ['user_fullname', 'ASC']],
      'role_desc': [['user_role', 'DESC'], ['user_fullname', 'ASC']],
      'email_asc': [['user_email', 'ASC']],
      'email_desc': [['user_email', 'DESC']],
    };
  const order = sortMap[sort] || sortMap['role_asc'];

    const users = await User.findAll({ where, attributes: { exclude: ['password'] }, order });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list users', error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, action_code_id, code } = req.body;

    if (!['teacher','student','admin','superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    // Prevent demoting yourself from superadmin by accident
    if (req.user.id === parseInt(id) && req.user.role === 'superadmin' && role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Cannot change your own superadmin role' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.is_deleted) return res.status(400).json({ success:false, message:'Cannot change role of a deleted user' });

    if (user.user_role === 'student') {
      return res.status(400).json({ success: false, message: 'Cannot change role for student accounts' });
    }

    // Verify action code
    if (!action_code_id || !code) {
      return res.status(400).json({ success:false, message:'Action code is required' });
    }
    const ac = await ActionCode.findOne({ where: { id: action_code_id, user_id: req.user.id, action_type: 'update_role' } });
    if (!ac) return res.status(400).json({ success:false, message:'Invalid action code request' });
    if (ac.used_at) return res.status(400).json({ success:false, message:'Action code already used' });
    if (new Date(ac.expires_at) < new Date()) return res.status(400).json({ success:false, message:'Action code expired' });
    if (ac.code !== String(code)) return res.status(400).json({ success:false, message:'Incorrect action code' });

    // Mark code used
    await ac.update({ used_at: new Date() });

    await user.update({ user_role: role });
    res.status(200).json({ success: true, data: { id: user.id, user_email: user.user_email, user_fullname: user.user_fullname, user_role: user.user_role } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user role', error: error.message });
  }
};

// Superadmin: create a new user (any role, including superadmin)
export const createUser = async (req, res) => {
  try {
    const { user_email, user_fullname, user_role = 'teacher', password, teacher_title } = req.body || {};

    if (!user_email || !user_fullname) {
      return res.status(400).json({ success: false, message: 'Full name and email are required' });
    }
    const role = String(user_role).toLowerCase();
    const allowed = ['teacher','student','admin','superadmin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const existing = await User.findOne({ where: { user_email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email is already in use' });
    }

    // Generate a strong temporary password if not provided
    const temp = password && String(password).length >= 8
      ? String(password)
      : `${crypto.randomBytes(4).toString('hex')}${!password ? 'A1!' : ''}`; // ensure complexity when autogenerated
    const hashed = await bcrypt.hash(temp, 12);

    const payload = {
      user_email,
      user_fullname,
      user_role: role,
      password: hashed,
      is_first_login: role === 'student',
    };
    if (role === 'teacher') {
      payload.teacher_title = teacher_title || 'Teacher I';
    } else {
      payload.teacher_title = null;
    }

    const created = await User.create(payload);

    // Respond without hashed password; return temp in a separate field once
    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        user_email: created.user_email,
        user_fullname: created.user_fullname,
        user_role: created.user_role,
        teacher_title: created.teacher_title,
      },
      tempPassword: password ? undefined : temp,
    });
  } catch (error) {
    console.error('Create user failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
};

// Superadmin: soft delete (deactivate) a user with password re-confirmation and safety checks
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { confirm, action_code_id, code } = req.body || {};

    if (String(confirm).toUpperCase() !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Type DELETE to confirm' });
    }

    // Verify action code
    if (!action_code_id || !code) {
      return res.status(400).json({ success:false, message:'Action code is required' });
    }
    const ac = await ActionCode.findOne({ where: { id: action_code_id, user_id: req.user.id, action_type: 'delete_user', target_user_id: id } });
    if (!ac) return res.status(400).json({ success:false, message:'Invalid action code request' });
    if (ac.used_at) return res.status(400).json({ success:false, message:'Action code already used' });
    if (new Date(ac.expires_at) < new Date()) return res.status(400).json({ success:false, message:'Action code expired' });
    if (ac.code !== String(code)) return res.status(400).json({ success:false, message:'Incorrect action code' });

    // Fetch target
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (user.is_deleted) return res.status(400).json({ success:false, message:'User already deleted' });

    if (user.id === req.user.id) {
      return res.status(400).json({ success:false, message:'You cannot delete your own account' });
    }

    if (user.user_role === 'superadmin') {
      const others = await User.count({ where: { user_role: 'superadmin', id: { [Op.ne]: user.id }, is_deleted: false } });
      if (others === 0) {
        return res.status(400).json({ success:false, message:'Cannot delete the last remaining superadmin' });
      }
    }

    await user.update({ is_deleted: true, deleted_at: new Date() });
    await ac.update({ used_at: new Date() });
    return res.status(200).json({ success:true, message:'User deleted (soft)', data: { id: user.id } });
  } catch (error) {
    console.error('Delete user failed:', error);
    res.status(500).json({ success:false, message:'Failed to delete user', error: error.message });
  }
};

// Superadmin: restore a previously soft-deleted user
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { action_code_id, code } = req.body || {};

    if (!action_code_id || !code) {
      return res.status(400).json({ success:false, message:'Action code is required' });
    }
    const ac = await ActionCode.findOne({ where: { id: action_code_id, user_id: req.user.id, action_type: 'restore_user', target_user_id: id } });
    if (!ac) return res.status(400).json({ success:false, message:'Invalid action code request' });
    if (ac.used_at) return res.status(400).json({ success:false, message:'Action code already used' });
    if (new Date(ac.expires_at) < new Date()) return res.status(400).json({ success:false, message:'Action code expired' });
    if (ac.code !== String(code)) return res.status(400).json({ success:false, message:'Incorrect action code' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success:false, message:'User not found' });
    if (!user.is_deleted) return res.status(400).json({ success:false, message:'User is not deleted' });

    await user.update({ is_deleted: false, deleted_at: null });
    await ac.update({ used_at: new Date() });
    return res.status(200).json({ success:true, message:'User restored', data: { id: user.id } });
  } catch (error) {
    console.error('Restore user failed:', error);
    res.status(500).json({ success:false, message:'Failed to restore user', error: error.message });
  }
};

export const requestActionCode = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success:false, message:'Only superadmins can request action codes' });
    }
    const { action_type, target_user_id } = req.body || {};
    const allowed = ['update_role','delete_user','restore_user','export_audit_logs','delete_audit_logs'];
    if (!allowed.includes(action_type)) {
      return res.status(400).json({ success:false, message:'Invalid action type' });
    }
    if (['delete_user','restore_user','update_role'].includes(action_type) && !target_user_id) {
      return res.status(400).json({ success:false, message:'Target user id required' });
    }
    // generate 6-digit numeric code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);
    const record = await ActionCode.create({
      user_id: req.user.id,
      action_type,
      target_user_id: target_user_id || null,
      code,
      expires_at,
    });
    const actionLabelMap = {
      update_role: 'Role Update',
      delete_user: 'User Deletion',
      restore_user: 'User Restoration',
      export_audit_logs: 'Audit Log Export',
      delete_audit_logs: 'Audit Log Deletion'
    };
    // Determine actor email robustly (token may store as email, not user_email)
    let toEmail = req.user?.email || req.user?.user_email;
    if (!toEmail) {
      const actor = await User.findByPk(req.user.id);
      toEmail = actor?.user_email;
    }
    if (!toEmail || typeof toEmail !== 'string') {
      return res.status(500).json({ success:false, message:'Unable to resolve sender email for action code' });
    }
    await sendActionSecurityCodeEmail(toEmail, actionLabelMap[action_type], code);
    return res.status(201).json({ success:true, data:{ action_code_id: record.id, expires_at } });
  } catch (error) {
    console.error('Request action code failed:', error);
    res.status(500).json({ success:false, message:'Failed to request action code', error: error.message });
  }
};

// Superadmin analytics - high level, system-wide
export const getSuperadminAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
    }

    const { school_year } = req.query;
    let targetSpan = null;
    if (school_year && school_year !== 'all') {
      const yearStr = String(school_year);
      if (/^\d{4}$/.test(yearStr)) {
        const y = parseInt(yearStr, 10);
        targetSpan = `${y}-${y + 1}`;
      } else if (/^\d{4}-\d{4}$/.test(yearStr)) {
        targetSpan = yearStr;
      }
    }

    // Totals and role breakdown
    const [totalUsers, totalStudents, totalTeachers, totalAdmins, totalSuperAdmins, totalClasses, totalSubjects] = await Promise.all([
      User.count(),
      Student.count({ where: { status: 'Active', is_deleted: false } }),
      User.count({ where: { user_role: 'teacher' } }),
      User.count({ where: { user_role: 'admin' } }),
      User.count({ where: { user_role: 'superadmin' } }),
      Class.count({ where: targetSpan ? { school_year: targetSpan } : {} }),
      Subject.count(),
    ]);

    const rolesBreakdown = [
      { role: 'student', count: totalStudents },
      { role: 'teacher', count: totalTeachers },
      { role: 'admin', count: totalAdmins },
      { role: 'superadmin', count: totalSuperAdmins },
    ];

    // Active users in last 24h and 7d (distinct users who generated logs)
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [active24Rows, active7Rows] = await Promise.all([
      AuditLog.findAll({
        where: { created_at: { [Op.gte]: since24h }, user_id: { [Op.ne]: null } },
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('user_id')), 'user_id']],
        raw: true,
      }),
      AuditLog.findAll({
        where: { created_at: { [Op.gte]: since7d }, user_id: { [Op.ne]: null } },
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('user_id')), 'user_id']],
        raw: true,
      }),
    ]);
    const activeUsers = {
      last24h: active24Rows.length,
      last7d: active7Rows.length,
    };

    // Login activity for last 14 days
    const days = 14;
    const start14 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start14.setDate(start14.getDate() - (days - 1));
    const loginActions = ['USER_LOGIN_SUCCESS', 'ADMIN_LOGIN_SUCCESS', 'SUPERADMIN_LOGIN_SUCCESS'];
    const loginRows = await AuditLog.findAll({
      where: {
        created_at: { [Op.gte]: start14 },
        action: { [Op.in]: loginActions },
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'd'],
        'user_role',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt'],
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('created_at')), 'user_role'],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start14);
      d.setDate(start14.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const dayRows = loginRows.filter(r => String(r.d).slice(0, 10) === key);
      series.push({
        date: key,
        total: dayRows.reduce((a, r) => a + Number(r.cnt || 0), 0),
        admin: dayRows.filter(r => r.user_role === 'admin').reduce((a, r) => a + Number(r.cnt || 0), 0),
        teacher: dayRows.filter(r => r.user_role === 'teacher').reduce((a, r) => a + Number(r.cnt || 0), 0),
        superadmin: dayRows.filter(r => r.user_role === 'superadmin').reduce((a, r) => a + Number(r.cnt || 0), 0),
        student: dayRows.filter(r => r.user_role === 'student').reduce((a, r) => a + Number(r.cnt || 0), 0),
      });
    }

    // Top actions (last 7 days)
    const topActionRows = await AuditLog.findAll({
      where: { created_at: { [Op.gte]: since7d } },
      attributes: ['action', [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt']],
      group: ['action'],
      order: [[Sequelize.literal('cnt'), 'DESC']],
      limit: 10,
      raw: true,
    });
    const topActions = topActionRows.map(r => ({ action: r.action, count: Number(r.cnt || 0) }));

    // Class enrollment for the selected year (or current state)
    const classWhere = targetSpan ? { school_year: targetSpan } : {};
    const largestClasses = await Class.findAll({
      where: classWhere,
      attributes: ['grade_level', 'section', 'adviser_name', 'school_year', 'student_count'],
      order: [['student_count', 'DESC']],
      raw: true,
    });

    // Available years (from classes and student created_at)
    const classYears = await Class.findAll({
      attributes: ['school_year'],
      group: ['school_year'],
      where: { school_year: { [Op.ne]: null } },
      raw: true,
    });
    const years = new Set([new Date().getFullYear()]);
    classYears.forEach(c => {
      const m = String(c.school_year).match(/\d{4}/);
      if (m) years.add(parseInt(m[0]));
    });
    const availableYears = Array.from(years).sort((a, b) => b - a);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalStudents,
          totalTeachers,
          totalAdmins,
          totalSuperAdmins,
          totalClasses,
          totalSubjects,
        },
        rolesBreakdown,
        activity: {
          activeUsers,
          loginSeries: series,
          topActions,
        },
        enrollment: {
          largestClasses,
        },
        schoolYear: school_year || null,
        availableYears,
      },
    });
  } catch (error) {
    console.error('Error fetching superadmin analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch superadmin analytics', error: error.message });
  }
};

export default { listUsers, updateUserRole, createUser, deleteUser, restoreUser, getSuperadminAnalytics };