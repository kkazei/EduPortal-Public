import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClassStore } from '../../store/classStore';
import { useSubjectStore } from '../../store/subjectStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import {
  School,
  Book,
  Check,
  Search,
  ArrowRight,
  ArrowLeft,
  PlusCircle,
  Trash,
  Loader,
  Layers
} from 'lucide-react';

// Teacher-facing class subject management page with admin-style UI
const TeacherClassSubjectsPage = () => {
  const { user } = useAuthStore();
  const { classes, fetchClasses, fetchClassById, addSubjectToClass, removeSubjectFromClass, isLoading: classesLoading } = useClassStore();
  const { fetchSubjectsByGradeLevel, subjects, isLoading: subjectsLoading } = useSubjectStore();
  const { selected, active } = useSchoolYearStore();
  const [loadingMap, setLoadingMap] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showAddAllModal, setShowAddAllModal] = useState(false);
  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const schoolYear = selected || active?.name || null;

  const gradeLevels = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'];

  useEffect(() => {
    fetchClasses(schoolYear).catch(() => {});
  }, [schoolYear, fetchClasses]);

  // Load subjects when gradeLevel changes (if no class selected) or when class selected
  useEffect(() => {
    if (selectedClass) {
      setGradeLevel(selectedClass.grade_level);
    }
    fetchSubjectsByGradeLevel(gradeLevel).catch(() => {});
  }, [gradeLevel, selectedClass, fetchSubjectsByGradeLevel]);

  // Update available/assigned subjects when selectedClass or subjects change
  useEffect(() => {
    if (selectedClass && subjects.length) {
      const classSubj = Array.isArray(selectedClass.subjects) ? selectedClass.subjects : [];
      setAssignedSubjects(classSubj);
      const assignedIds = new Set(classSubj.map(s => s.id));
      const available = subjects.filter(s => s.grade_level === selectedClass.grade_level && !assignedIds.has(s.id));
      setAvailableSubjects(available);
    } else if (!selectedClass) {
      setAssignedSubjects([]);
      setAvailableSubjects([]);
    }
  }, [selectedClass, subjects]);

  const filteredClasses = classes.filter(cls =>
    cls.grade_level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.adviser_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectClass = async (classId) => {
    setLoadingMap(prev => ({ ...prev, select: true }));
    try {
      const data = await fetchClassById(classId);
      if (!data) return toast.error('Failed to load class');
      setSelectedClass(data);
    } catch(e) {
      toast.error('Failed to select class');
    } finally {
      setLoadingMap(prev => ({ ...prev, select: false }));
    }
  };

  const handleAddSubject = async (subjectId) => {
    if (!selectedClass) return;
    setLoadingMap(p => ({ ...p, add: true }));
    try {
      await addSubjectToClass(selectedClass.id, subjectId);
      const updated = await fetchClassById(selectedClass.id);
      setSelectedClass(updated);
      toast.success('Subject added');
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to add');
    } finally {
      setLoadingMap(p => ({ ...p, add: false }));
    }
  };

  const confirmRemoveSubject = (subject) => {
    setSubjectToRemove(subject);
    setShowConfirmModal(true);
  };

  const handleRemoveSubject = async () => {
    if (!selectedClass || !subjectToRemove) return;
    setLoadingMap(p => ({ ...p, remove: true }));
    try {
      await removeSubjectFromClass(selectedClass.id, subjectToRemove.id);
      const updated = await fetchClassById(selectedClass.id);
      setSelectedClass(updated);
      toast.success('Subject removed');
      setShowConfirmModal(false);
      setSubjectToRemove(null);
    } catch(e) {
      toast.error(e.response?.data?.message || 'Failed to remove');
    } finally {
      setLoadingMap(p => ({ ...p, remove: false }));
    }
  };

  const handleAddAllSubjects = async () => {
    if (!selectedClass || !availableSubjects.length) return;
    setShowAddAllModal(false);
    setBulkActionLoading(true);
    try {
      await Promise.all(availableSubjects.map(s => addSubjectToClass(selectedClass.id, s.id)));
      const updated = await fetchClassById(selectedClass.id);
      setSelectedClass(updated);
      toast.success('All subjects added');
    } catch(e){ toast.error('Bulk add failed'); } finally { setBulkActionLoading(false); }
  };

  const handleRemoveAllSubjects = async () => {
    if (!selectedClass || !assignedSubjects.length) return;
    setShowRemoveAllModal(false);
    setBulkActionLoading(true);
    try {
      await Promise.all(assignedSubjects.map(s => removeSubjectFromClass(selectedClass.id, s.id)));
      const updated = await fetchClassById(selectedClass.id);
      setSelectedClass(updated);
      toast.success('All subjects removed');
    } catch(e){ toast.error('Bulk remove failed'); } finally { setBulkActionLoading(false); }
  };

  const isBusy = classesLoading || subjectsLoading || loadingMap.add || loadingMap.remove || loadingMap.select || bulkActionLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center"><Layers className="h-6 w-6 mr-2"/>Class Subjects</h1>
            <p className="text-blue-100">Manage subjects assigned to your classes (SY {schoolYear || 'N/A'})</p>
          </div>
          {selectedClass && (
            <div className="bg-white bg-opacity-20 py-1 px-3 rounded-full text-sm">{assignedSubjects.length} subjects assigned</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Classes Panel */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center"><School className="w-5 h-5 mr-2 text-blue-500"/>Your Classes</h2>
          </div>
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400"/></div>
              <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Search classes..." className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {isBusy && !filteredClasses.length ? (
              <div className="flex justify-center items-center py-12"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"/><span className="ml-3 text-gray-600">Loading...</span></div>
            ) : filteredClasses.length ? filteredClasses.map(cls => (
              <button key={cls.id} onClick={()=>handleSelectClass(cls.id)} className={`w-full text-left p-4 rounded-xl transition-colors ${selectedClass?.id===cls.id? 'bg-blue-50 border-blue-200 border-2':'bg-gray-50 hover:bg-gray-100 border border-gray-100'}`}> 
                <div className="font-medium text-lg">{cls.grade_level} - {cls.section}</div>
                <div className="text-sm text-gray-500 mt-1">Adviser: {cls.adviser_name || user?.user_fullname || 'You'}</div>
                <div className="text-xs text-gray-400 mt-2 bg-gray-100 inline-block px-2 py-1 rounded-full">{selectedClass?.id===cls.id? `${assignedSubjects.length} subjects assigned` : cls.subjects?.length? `${cls.subjects.length} subjects`:'Select to manage'}</div>
              </button>
            )) : (
              <div className="text-center py-12 text-gray-500"><School className="w-12 h-12 mx-auto text-gray-300 mb-3"/><p className="text-lg">No classes found</p><p className="text-sm text-gray-400 mt-1">Create a class first</p></div>
            )}
          </div>
        </div>

        {/* Available Subjects */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center"><Book className="w-5 h-5 mr-2 text-blue-500"/>Available Subjects</h2>
            <div className="flex items-center gap-3">
              {selectedClass && availableSubjects.length>0 && (
                <button onClick={()=>setShowAddAllModal(true)} disabled={bulkActionLoading} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center hover:bg-blue-200"><PlusCircle className="w-3 h-3 mr-1"/>Add All</button>
              )}
              <div className="max-w-xs">
                <select value={gradeLevel} disabled={!!selectedClass} onChange={(e)=>setGradeLevel(e.target.value)} className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                  {gradeLevels.map(g=> <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
          {!selectedClass ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl"><Layers className="w-12 h-12 mx-auto text-gray-300 mb-3"/><p className="text-lg">Select a class</p><p className="text-sm text-gray-400 mt-1">Choose a class on the left</p></div>
          ) : isBusy ? (
            <div className="flex justify-center items-center py-12"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"/><span className="ml-3 text-gray-600">Loading subjects...</span></div>
          ) : availableSubjects.length ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {availableSubjects.map(s => (
                <div key={s.id} className="flex justify-between items-center p-4 rounded-xl border bg-gray-50 hover:bg-gray-100 border-gray-100">
                  <div className="font-medium">{s.subject_name}</div>
                  <button onClick={()=>handleAddSubject(s.id)} disabled={loadingMap.add} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full" title="Add"><ArrowRight className="h-5 w-5"/></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500"><Check className="w-12 h-12 mx-auto text-gray-300 mb-3"/><p className="text-lg">No available subjects</p><p className="text-sm text-gray-400 mt-1">All subjects assigned or none for grade</p></div>
          )}
        </div>

        {/* Assigned Subjects */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center"><Check className="w-5 h-5 mr-2 text-green-500"/>Assigned Subjects</h2>
            <div className="flex items-center gap-2">
              {selectedClass && assignedSubjects.length>0 && (
                <button onClick={()=>setShowRemoveAllModal(true)} disabled={bulkActionLoading} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center hover:bg-red-200"><Trash className="w-3 h-3 mr-1"/>Remove All</button>
              )}
              {selectedClass && (
                <div className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">{assignedSubjects.length} subjects</div>
              )}
            </div>
          </div>
          {!selectedClass ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl"><Layers className="w-12 h-12 mx-auto text-gray-300 mb-3"/><p className="text-lg">Select a class</p><p className="text-sm text-gray-400 mt-1">Choose a class on the left</p></div>
          ) : isBusy ? (
            <div className="flex justify-center items-center py-12"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"/><span className="ml-3 text-gray-600">Loading subjects...</span></div>
          ) : assignedSubjects.length ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {assignedSubjects.map(s => (
                <div key={s.id} className="flex justify-between items-center p-4 rounded-xl border bg-gray-50 hover:bg-gray-100 border-gray-100">
                  <div className="font-medium">{s.subject_name}</div>
                  <button onClick={()=>confirmRemoveSubject(s)} disabled={loadingMap.remove} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Remove"><ArrowLeft className="h-5 w-5"/></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500"><Book className="w-12 h-12 mx-auto text-gray-300 mb-3"/><p className="text-lg">No subjects assigned</p><p className="text-sm text-gray-400 mt-1">Add subjects from middle panel</p></div>
          )}
        </div>
      </div>

      {/* Confirm Remove Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowConfirmModal(false)}>
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-red-600 mb-2">Remove Subject</h3>
              <p className="text-gray-600 mb-4">Remove <span className="font-medium">{subjectToRemove?.subject_name}</span> from this class?</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={()=>setShowConfirmModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleRemoveSubject} disabled={loadingMap.remove} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center">
                  {loadingMap.remove? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"/> : <Trash className="h-4 w-4 mr-2"/>}
                  {loadingMap.remove? 'Removing...' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add All Modal */}
      <AnimatePresence>
        {showAddAllModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowAddAllModal(false)}>
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-blue-600 mb-2">Add All Subjects</h3>
              <p className="text-gray-600 mb-4">Add all {availableSubjects.length} subjects to <span className="font-medium">{selectedClass?.grade_level} - {selectedClass?.section}</span>?</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={()=>setShowAddAllModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddAllSubjects} disabled={bulkActionLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center">
                  {bulkActionLoading? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"/> : <PlusCircle className="h-4 w-4 mr-2"/>}
                  {bulkActionLoading? 'Adding...' : 'Add All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove All Modal */}
      <AnimatePresence>
        {showRemoveAllModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setShowRemoveAllModal(false)}>
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <h3 className="text-xl font-semibold text-red-600 mb-2">Remove All Subjects</h3>
              <p className="text-gray-600 mb-4">Remove all {assignedSubjects.length} subjects from <span className="font-medium">{selectedClass?.grade_level} - {selectedClass?.section}</span>?</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={()=>setShowRemoveAllModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleRemoveAllSubjects} disabled={bulkActionLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center">
                  {bulkActionLoading? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"/> : <Trash className="h-4 w-4 mr-2"/>}
                  {bulkActionLoading? 'Removing...' : 'Remove All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TeacherClassSubjectsPage;