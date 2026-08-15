// Utility to mask a student ID / LRN leaving first 6 characters
// Example: 107141240027 -> 107141******
export default function maskStudentId(id) {
  if (!id) return 'N/A';
  const str = String(id);
  if (str.length <= 6) return str;
  return str.slice(0, 6) + '*'.repeat(str.length - 6);
}
