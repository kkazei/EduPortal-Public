import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useStudentStore } from '../../store/studentStore';
import { useClassStore } from '../../store/classStore';

const calculateAge = (birthdate) => {
  if (!birthdate) return '';
  const today = new Date();
  const d = new Date(birthdate);
  if (isNaN(d.getTime())) return '';
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return String(age);
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function AdminStudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    fetchStudentById,
    updateStudent,
    currentStudent,
    isLoading,
    error,
    message,
    clearMessages,
    clearCurrentStudent,
  } = useStudentStore();

  const { classes, fetchClasses } = useClassStore();

  const [formData, setFormData] = useState({
    lrn: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    sex: '',
    birthdate: '',
    address: '',
    contact_number: '',
    email: '',
    class_id: '',
    status: 'Active',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchStudentById(id), fetchClasses()]);
      } catch {
        toast.error('Failed to load student');
      }
    })();
    return () => clearCurrentStudent();
  }, [id, fetchStudentById, fetchClasses, clearCurrentStudent]);

  useEffect(() => {
    if (currentStudent) {
      setFormData({
        lrn: currentStudent.lrn || '',
        first_name: currentStudent.first_name || '',
        middle_name: currentStudent.middle_name || '',
        last_name: currentStudent.last_name || '',
        age: currentStudent.age ? String(currentStudent.age) : calculateAge(currentStudent.birthdate),
        sex: currentStudent.sex || '',
        birthdate: formatDateForInput(currentStudent.birthdate),
        address: currentStudent.address || '',
        contact_number: currentStudent.contact_number || '',
        email: currentStudent.email || '',
        class_id: currentStudent.class_id ? String(currentStudent.class_id) : '',
        status: currentStudent.status || 'Active',
      });
    }
  }, [currentStudent]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearMessages();
    }
    if (message) {
      toast.success(message);
      clearMessages();
    }
  }, [error, message, clearMessages]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'birthdate') {
      setFormData((prev) => ({
        ...prev,
        birthdate: value,
        age: calculateAge(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateStudent(id, {
        ...formData,
        class_id: formData.class_id ? Number(formData.class_id) : null,
      });
      toast.success('Student updated');
      navigate('/admin/students');
    } catch (err) {
      // store handles error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/admin/students');

  return (
    <div className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <button onClick={handleCancel} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200">
          Back to Students
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-6">Edit Student (Admin)</h1>

        {isLoading && !currentStudent ? (
          <div className="py-10 text-center text-gray-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">LRN</label>
              <input name="lrn" value={formData.lrn} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">First Name</label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Middle Name</label>
              <input name="middle_name" value={formData.middle_name} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Last Name</label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Sex</label>
              <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Birthdate</label>
              <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Age</label>
              <input name="age" value={formData.age} readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Class</label>
              <select name="class_id" value={formData.class_id} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Not assigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.grade_level} - {c.section}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-gray-700 mb-1">Address</label>
              <input name="address" value={formData.address} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Contact Number</label>
              <input name="contact_number" value={formData.contact_number} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option>Active</option>
                <option>Inactive</option>
                <option>Transferred</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex gap-3 mt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}