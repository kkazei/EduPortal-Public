// Shared audit action formatter to convert technical method/path or codes
// into human-readable past tense descriptions.
export function formatAuditAction(log) {
  if (!log) return '';
  const rawAction = (log.action || '').trim();
  const method = (log.method || rawAction.split(' ')[0] || '').toUpperCase();
  let path = (log.path || rawAction.split(' ')[1] || '').split('?')[0];
  // Normalise dynamic segments (numbers / hex ids) to :id
  path = path.replace(/\b[0-9a-fA-F]{6,}\b/g, ':id').replace(/[0-9]+(?=\/|$)/g, ':id');
  const composed = `${method} ${path}`.trim();

  const codeMap = {
    USER_LOGIN_SUCCESS: 'Logged in',
    USER_LOGIN_FAILED: 'Failed login',
    USER_LOGOUT: 'Logged out'
  };
  if (codeMap[rawAction.toUpperCase()]) return appendEntity(codeMap[rawAction.toUpperCase()], log);

  // Comprehensive route mappings (ordered; first match wins)
  const rules = [
    // Auth lifecycle
    [/^POST \/api\/auth\/login/i, 'Logged in'],
    [/^POST \/api\/auth\/superadmin-login/i, 'Logged in (superadmin)'],
    [/^POST \/api\/auth\/admin-login/i, 'Logged in (admin)'],
    [/^POST \/api\/auth\/student-login/i, 'Logged in (student)'],
    [/^POST \/api\/auth\/logout/i, 'Logged out'],
    [/^GET \/api\/auth\/check-auth/i, 'Checked authentication'],
    [/^POST \/api\/auth\/change-password/i, 'Changed password'],
    [/^POST \/api\/auth\/update-first-time-password/i, 'Set first-time password'],
    [/^POST \/api\/auth\/first-time\/initiate/i, 'Initiated first-time setup'],
    [/^POST \/api\/auth\/first-time\/resend/i, 'Resent first-time setup code'],
    [/^POST \/api\/auth\/first-time\/verify/i, 'Verified first-time setup code'],
    [/^POST \/api\/auth\/email\/verify-account\/initiate/i, 'Initiated account email verification'],
    [/^POST \/api\/auth\/email\/verify-account\/resend/i, 'Resent account verification email'],
    [/^POST \/api\/auth\/email\/verify-account\/confirm/i, 'Confirmed account email verification'],
    [/^POST \/api\/auth\/email\/change-initiate/i, 'Initiated email change'],
    [/^POST \/api\/auth\/email\/resend/i, 'Resent email change code'],
    [/^POST \/api\/auth\/email\/verify/i, 'Verified new email'],
    [/^POST \/api\/auth\/forgot-password/i, 'Requested password reset'],
    [/^POST \/api\/auth\/reset-password\/:id/i, 'Reset password'],
    [/^POST \/api\/auth\/activate-account\/:id/i, 'Activated account'],

    // Students
    [/^POST \/api\/students\/bulk/i, 'Bulk created students'],
    [/^POST \/api\/students\/promote/i, 'Promoted students'],
    [/^POST \/api\/students\/:id\/reset-password/i, 'Reset a student password'],
    [/^POST \/api\/students\/:id\/require-email-setup/i, 'Required student email setup'],
    [/^DELETE \/api\/students\/:id\/permanent/i, 'Permanently deleted a student'],
    [/^POST \/api\/students/i, 'Created a student'],
    [/^PUT \/api\/students\/:id/i, 'Updated a student'],
    [/^DELETE \/api\/students\/:id/i, 'Deleted a student'],
    [/^GET \/api\/students\/deleted/i, 'Viewed deleted students'],
    [/^GET \/api\/students\/lrn\/:id/i, 'Viewed student by LRN'],
    [/^GET \/api\/students\/class\/:id\/students/i, 'Viewed class student list'],
    [/^GET \/api\/students\/class\/:id/i, 'Viewed class students'],
    [/^GET \/api\/students\/user\/:id/i, 'Viewed a student profile'],
    [/^GET \/api\/students\/:id/i, 'Viewed a student profile'],
    [/^GET \/api\/students(?!\/)/i, 'Viewed students list'],

    // Classes
    [/^POST \/api\/classes\/:id\/subjects/i, 'Added subject to class'],
    [/^DELETE \/api\/classes\/:id\/subjects\/:id/i, 'Removed subject from class'],
    [/^GET \/api\/classes\/:id\/subjects/i, 'Viewed class subjects'],
    [/^POST \/api\/classes/i, 'Created a class'],
    [/^PUT \/api\/classes\/:id/i, 'Updated a class'],
    [/^DELETE \/api\/classes\/:id/i, 'Deleted a class'],
    [/^GET \/api\/classes\/:id/i, 'Viewed a class'],
    [/^GET \/api\/classes(?!\/)/i, 'Viewed classes list'],

    // Subjects
    [/^POST \/api\/subjects\/seed/i, 'Seeded subjects'],
    [/^PUT \/api\/subjects\/student\/:id\/subject\/:id\/grades/i, 'Updated student subject grades'],
    [/^POST \/api\/subjects/i, 'Created a subject'],
    [/^PUT \/api\/subjects\/:id/i, 'Updated a subject'],
    [/^DELETE \/api\/subjects\/:id/i, 'Deleted a subject'],
    [/^GET \/api\/subjects\/class\/:id/i, 'Viewed class subjects'],
    [/^GET \/api\/subjects\/student\/:id\/grades/i, 'Viewed student subject grades'],
    [/^GET \/api\/subjects\/:id/i, 'Viewed a subject'],
    [/^GET \/api\/subjects(?!\/)/i, 'Viewed subjects list'],

    // Announcements & comments
    [/^POST \/api\/announcements/i, 'Posted an announcement'],
    [/^PUT \/api\/announcements\/:id/i, 'Edited an announcement'],
    [/^DELETE \/api\/announcements\/:id/i, 'Deleted an announcement'],
    [/^GET \/api\/announcements\/active/i, 'Viewed active announcements'],
    [/^GET \/api\/announcements\/public\/:id/i, 'Viewed public announcement'],
    [/^GET \/api\/announcements\/user\/:id/i, 'Viewed user announcements'],
    [/^GET \/api\/announcements\/:id/i, 'Viewed an announcement'],
    [/^GET \/api\/announcements(?!\/)/i, 'Viewed announcements list'],
    [/^GET \/api\/comments\/announcement\/:id\/stats/i, 'Viewed announcement comment stats'],
    [/^GET \/api\/comments\/announcement\/:id/i, 'Viewed announcement comments'],
    [/^GET \/api\/comments\/:id\/replies/i, 'Viewed comment replies'],
    [/^POST \/api\/comments\/announcement\/:id/i, 'Added a comment'],
    [/^PUT \/api\/comments\/:id/i, 'Edited a comment'],
    [/^DELETE \/api\/comments\/:id/i, 'Deleted a comment'],

    // Attendance
    [/^PUT \/api\/attendance\/bulk-update\/:id\/class\/:id/i, 'Bulk updated attendance'],
    [/^PUT \/api\/attendance\/student\/:id\/class\/:id/i, 'Updated student attendance'],
    [/^GET \/api\/attendance\/student\/:id/i, 'Viewed student attendance'],
    [/^GET \/api\/attendance\/class\/:id/i, 'Viewed class attendance'],

    // Grades & report cards
    [/^PUT \/api\/grades\/multiple-grades\/:id\/class\/:id/i, 'Bulk updated grades'],
    [/^PUT \/api\/grades\/student\/:id\/subject\/:id\/class\/:id/i, 'Updated student subject grade'],
    [/^GET \/api\/grades\/student\/:id/i, 'Viewed student grades'],
    [/^GET \/api\/grades\/class\/:id/i, 'Viewed class grades'],
    [/^GET \/api\/grades\/report-card\/:id/i, 'Viewed student report card'],
    [/^GET \/api\/grades\/student-card\/:id/i, 'Viewed student card'],
    [/^POST \/api\/grades\/import-excel/i, 'Imported grades from Excel'],

    // School Years
    [/^POST \/api\/school-years/i, 'Created a school year'],
    [/^GET \/api\/school-years\/current/i, 'Viewed current school year'],
    [/^GET \/api\/school-years(?!\/)/i, 'Viewed school years list'],
    [/^PUT \/api\/school-years\/:id/i, 'Updated a school year'],
    [/^DELETE \/api\/school-years\/:id/i, 'Deleted a school year'],

    // Push subscriptions
    [/^POST \/api\/push\/subscribe/i, 'Subscribed to push notifications'],
    [/^POST \/api\/push\/unsubscribe/i, 'Unsubscribed from push notifications'],
    [/^POST \/api\/push\/check-subscription/i, 'Checked push subscription'],
    [/^GET \/api\/push\/status/i, 'Viewed push service status'],

    // Visits
    [/^POST \/api\/visits/i, 'Registered a site visit'],
    [/^GET \/api\/visits\/total/i, 'Viewed total site visits'],

    // Superadmin (specific before generic to avoid over-match)
    [/^POST \/api\/superadmin\/users\/action-code/i, 'Requested security code'],
    [/^GET \/api\/superadmin\/users/i, 'Viewed users'],
    [/^POST \/api\/superadmin\/users/i, 'Created a user'],
    [/^DELETE \/api\/superadmin\/users\/:id/i, 'Deleted a user'],
    [/^GET \/api\/superadmin\/analytics/i, 'Viewed superadmin analytics'],

    // Admin analytics & extras
    [/^GET \/api\/admin\/analytics/i, 'Viewed admin analytics'],
    [/^GET \/api\/admin\/available-years/i, 'Viewed available school years'],

    // Audit logs
    [/^GET \/api\/audit-logs\/stream/i, 'Streaming audit logs'],
    [/^GET \/api\/audit-logs\/export/i, 'Exported audit logs'],
    [/^DELETE \/api\/audit-logs(?!\/)/i, 'Deleted audit logs'],
    [/^GET \/api\/audit-logs(?!\/)/i, 'Viewed audit logs'],
  ];

  for (const [regex, text] of rules) {
    if (regex.test(composed)) return appendEntity(text, log);
  }

  // Generic fallback by method
  let base;
  if (method === 'POST') base = 'Created something';
  else if (method === 'PUT' || method === 'PATCH') base = 'Updated something';
  else if (method === 'DELETE') base = 'Deleted something';
  else if (method === 'GET') base = 'Viewed something';
  else base = rawAction || '—';
  return appendEntity(base, log);
}

function appendEntity(text, log) {
  if (!log.entity_type) return text;
  const label = toTitle(log.entity_type);
  const id = log.entity_id ? ` #${log.entity_id}` : '';
  return `${text} – ${label}${id}`;
}

function toTitle(str) {
  return (str || '')
    .split(/[_\-\s]+/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export default formatAuditAction;