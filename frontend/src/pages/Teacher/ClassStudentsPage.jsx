import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClassStore } from '../../store/classStore';
import { useStudentStore } from '../../store/studentStore';
import { ChevronLeft, UserPlus, Search, Edit, Eye, Users, Calendar, Book, AlertCircle, FileSpreadsheet, BarChart3, Download, Upload, ArrowRight, Send } from 'lucide-react'; // Add Upload icon
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useSchoolYearStore } from '../../store/schoolYearStore';

// Import modals
import AddStudentModal from '../../components/Modals/AddStudentModal';
import ExcelImportModal from '../../components/Modals/ExcelImportModal';
import GradeTemplateGenerator from '../../components/GradeTemplateGenerator'; // Add this import
import GradeImport from '../../components/GradeImport'; // Add this import
import BulkGradeImport from '../../components/BulkGradeImport'; // Add this import

const ClassStudentsPage = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  
  const { fetchClassById, isLoading: classLoading, fetchClasses } = useClassStore();
  const { 
    fetchStudentsByClass,
    students,
    createStudent,
    bulkCreateStudents,
    promoteStudents,
    isLoading: studentsLoading,
    error,
  } = useStudentStore();
  const selectedYear = useSchoolYearStore((s) => s.selected);
  
  const [classData, setClassData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10);
  
  // Add Student Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    class_id: classId || ''
  });
  
  // Excel Import Modal States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false); // Add this state
  const [showBulkGradeImport, setShowBulkGradeImport] = useState(false); // Add this state
  
  // Promotion modal state
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [targetYear, setTargetYear] = useState('');
  const [availableTargetClasses, setAvailableTargetClasses] = useState([]);
  const [targetClassId, setTargetClassId] = useState('');

  // Add this to your existing state declarations (around line 30)
  const [genderFilter, setGenderFilter] = useState('all'); // Add this line
  
  useEffect(() => {
    const loadClass = async () => {
      try {
        const data = await fetchClassById(classId);
        setClassData(data);
      } catch (err) {
        toast.error("Failed to load class details");
      }
    };
    
    const loadStudents = async () => {
      try {
        await fetchStudentsByClass(classId);
      } catch (err) {
        toast.error("Failed to load students");
      }
    };
    
    loadClass();
    loadStudents();
  }, [classId, fetchClassById, fetchStudentsByClass]);
  
  // Set class_id in formData when classId changes
  useEffect(() => {
    if (classId) {
      setFormData(prev => ({ ...prev, class_id: classId }));
    }
  }, [classId]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const parseNextYear = (name) => {
    if (!name) return '';
    const [start, end] = String(name).split('-').map((s) => parseInt(s, 10));
    if (isNaN(start) || isNaN(end)) return '';
    return `${start + 1}-${end + 1}`;
  };

  const openPromoteModal = async () => {
    const baseYear = classData?.school_year || selectedYear || '';
    const next = parseNextYear(baseYear);
    setTargetYear(next);
    try {
      const classes = await fetchClasses(next, true); // fetch all classes for target year
      setAvailableTargetClasses(classes || []);
      setIsPromoteOpen(true);
    } catch (e) {
      toast.error('Failed to load target classes');
    }
  };

  const toggleSelectAll = () => {
    if (!students || students.length === 0) return;
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirmPromote = async () => {
    if (!targetClassId) {
      toast.error('Please select a target class');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Please select at least one student');
      return;
    }
    try {
      const resp = await promoteStudents({
        sourceClassId: classId,
        targetClassId: parseInt(targetClassId, 10),
        studentIds: Array.from(selectedIds),
      });
      toast.success(resp?.message || 'Students promoted');
      setIsPromoteOpen(false);
      setSelectedIds(new Set());
      // Refresh current class students list (those promoted will disappear)
      await fetchStudentsByClass(classId);
    } catch (e) {
      // Errors are handled in the store
    }
  };
  
  const handleViewStudent = (studentId) => {
    navigate(`/students/${studentId}`);
  };
  
  const handleViewReportCard = (studentId) => {
    navigate(`/student/${studentId}/report-card`);
  };
  
  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    
    const today = new Date();
    const birthDate = new Date(birthdate);
    
    if (isNaN(birthDate.getTime())) return '';
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };
  
  // Mask student ID leaving first 6 characters visible
  const maskStudentId = (id) => {
    if (!id) return 'N/A';
    if (id.length <= 6) return id;
    return id.slice(0, 6) + '*'.repeat(id.length - 6);
  };
  
  // Form handling for Add Student
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'birthdate') {
      const calculatedAge = calculateAge(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        age: calculatedAge
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.lrn || !formData.first_name || !formData.last_name || 
        !formData.sex || !formData.birthdate) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    try {
      await createStudent(formData);
      setIsAddModalOpen(false);
      resetForm();
      // Reload students for this class
      await fetchStudentsByClass(classId);
      toast.success("Student added successfully!");
    } catch (err) {
      toast.error("Failed to add student");
    }
  };
  
  const resetForm = () => {
    setFormData({
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
      class_id: classId || ''
    });
  };
  
  // Excel import functions
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setExcelFile(file);
    setImportError(null);
    setImportPreview([]);
    
    if (file) {
      parseExcelFile(file);
    }
  };

  // Add duplicate checking logic
  const checkForDuplicates = (importData) => {
    return importData.map(student => {
      // Check if student already exists in current class
      const isDuplicate = students.some(existing => 
        existing.lrn === student.lrn || 
        (existing.first_name.toLowerCase() === student.first_name.toLowerCase() && 
         existing.last_name.toLowerCase() === student.last_name.toLowerCase())
      );
      
      return {
        ...student,
        isDuplicate
      };
    });
  };

  const parseExcelFile = (file) => {
    setImportLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setImportError("The file is empty or has no data rows");
          setImportLoading(false);
          return;
        }
        
        let headerRowIndex = -1;
        let headers = [];
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && Array.isArray(row) && row.some(cell => 
            cell && 
            typeof cell === 'string' && 
            cell.toString().toUpperCase().includes('LRN')
          )) {
            headerRowIndex = i;
            headers = row.map(cell => cell ? cell.toString().trim() : '');
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          setImportError("Could not find header row with LRN column");
          setImportLoading(false);
          return;
        }
        
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        const findColumnIndex = (searchTerms) => {
          return headers.findIndex(header => {
            if (!header || typeof header !== 'string') return false;
            return searchTerms.some(term => 
              header.toUpperCase().includes(term.toUpperCase())
            );
          });
        };
        
        const lrnIndex = findColumnIndex(['LRN']);
        const nameIndex = findColumnIndex(['NAME']);
        const sexIndex = findColumnIndex(['SEX', 'GENDER']);
        const birthdateIndex = findColumnIndex(['BIRTH DATE', 'BIRTHDATE', 'DATE OF BIRTH', 'BIRTH']);
        const addressIndex = findColumnIndex(['ADDRESS', 'BARANGAY', 'STREET']);
        
        if (lrnIndex === -1) {
          setImportError("LRN column not found in the file");
          setImportLoading(false);
          return;
        }
        
        if (nameIndex === -1) {
          setImportError("NAME column not found in the file");
          setImportLoading(false);
          return;
        }
        
        const isValidStudentRow = (row) => {
          if (!row || !Array.isArray(row) || row.length === 0) return false;
          
          const lrn = row[lrnIndex] ? String(row[lrnIndex]).trim() : '';
          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          
          if (!lrn || !name) return false;
          
          if (name.toUpperCase().includes('TOTAL') || 
              name.toUpperCase().includes('COMBINED') ||
              name.toUpperCase().includes('====') ||
              name.match(/^\d+\s*<===/) ||
              lrn.match(/^\d+\s*<===/) ||
              name.toLowerCase().includes('list and code') ||
              name.toLowerCase().includes('indicator') ||
              name.toLowerCase().includes('generated on') ||
              name.toLowerCase().includes('prepared by') ||
              name.toLowerCase().includes('signature')) {
            return false;
          }
          
          if (!/^\d{10,15}$/.test(lrn)) return false;
          
          return true;
        };
        
        const students = dataRows
          .filter(isValidStudentRow)
          .map((row, index) => {
            const fullName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
            
            let lastName = '';
            let firstName = '';
            let middleName = '';
            
            if (fullName.includes(',')) {
              const nameParts = fullName.split(',').map(part => part.trim()).filter(Boolean);
              
              if (nameParts.length === 1) {
                lastName = nameParts[0];
              } else if (nameParts.length === 2) {
                lastName = nameParts[0];
                const words = nameParts[1].split(/\s+/).filter(Boolean);
                firstName = words[0] || '';
                middleName = words.length > 1 ? words.slice(1).join(' ') : '';
              } else {
                // Keep full second comma part as first name when there are 3+ comma parts
                lastName = nameParts[0];
                firstName = nameParts[1];
                middleName = nameParts.slice(2).join(' ');
              }
            } else {
              const nameWords = fullName.split(/\s+/);
              if (nameWords.length >= 2) {
                firstName = nameWords[0];
                lastName = nameWords[nameWords.length - 1];
                if (nameWords.length > 2) {
                  middleName = nameWords.slice(1, -1).join(' ');
                }
              } else if (nameWords.length === 1) {
                firstName = nameWords[0];
              }
            }
            
            const birthdate = birthdateIndex > -1 && row[birthdateIndex] ? 
              formatExcelDate(row[birthdateIndex]) : '';
            const age = birthdate ? calculateAge(birthdate) : '';
            const sex = sexIndex > -1 && row[sexIndex] ? 
              String(row[sexIndex]).trim() : '';
            const address = addressIndex > -1 && row[addressIndex] ? 
              String(row[addressIndex]).trim() : '';
            
            const student = {
              rowNumber: headerRowIndex + dataRows.indexOf(row) + 2,
              lrn: row[lrnIndex] ? String(row[lrnIndex]).trim() : '',
              first_name: firstName,
              middle_name: middleName,
              last_name: lastName,
              birthdate: birthdate,
              age: age,
              sex: sex,
              address: address,
              contact_number: '',
              email: '',
              class_id: classId,
              class_name: classData ? `${classData.grade_level} - ${classData.section}` : 'Current Class',
              isValid: true,
              errors: [],
              isDuplicate: false // Initialize as false
            };
            
            if (!student.lrn) {
              student.errors.push('LRN is required');
            } else if (!/^\d{10,12}$/.test(student.lrn)) {
              student.errors.push('LRN must be 10-12 digits');
            }
            
            if (!student.first_name) student.errors.push('First Name is required');
            if (!student.last_name) student.errors.push('Last Name is required');
            if (!student.birthdate) student.errors.push('Birthdate is required');
            
            if (!student.sex) {
              student.errors.push('Gender is required');
            } else {
              const normalizedSex = student.sex.toUpperCase();
              if (normalizedSex === 'M' || normalizedSex === 'MALE') {
                student.sex = 'Male';
              } else if (normalizedSex === 'F' || normalizedSex === 'FEMALE') {
                student.sex = 'Female';
              } else {
                student.errors.push('Gender must be Male or Female');
              }
            }
            
            student.isValid = student.errors.length === 0;
            
            return student;
          });
        
        // Check for duplicates against existing students
        const studentsWithDuplicateCheck = checkForDuplicates(students);
        
        setImportPreview(studentsWithDuplicateCheck);
        setImportLoading(false);
        
      } catch (error) {
        console.error("Excel parsing error:", error);
        setImportError(`Error parsing Excel file: ${error.message}`);
        setImportLoading(false);
      }
    };
    
    reader.onerror = () => {
      setImportError("Error reading file");
      setImportLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  const formatExcelDate = (excelDate) => {
    if (typeof excelDate === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(excelDate)) {
        return excelDate;
      }
      
      const parts = excelDate.split(/[/\-.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
    }
    
    if (typeof excelDate === 'number') {
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    
    return '';
  };

  const handleImportSubmit = async () => {
    if (importPreview.length === 0) {
      setImportError("No data to import");
      return;
    }
    
    // Only import valid students that are not duplicates
    const validStudents = importPreview.filter(student => student.isValid && !student.isDuplicate);
    if (validStudents.length === 0) {
      setImportError("No valid student records to import");
      return;
    }
    
    const duplicateCount = importPreview.filter(student => student.isDuplicate).length;
    
    setImportLoading(true);
    
    try {
      const studentsToImport = validStudents.map(student => ({
        lrn: student.lrn,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        age: student.age,
        sex: student.sex,
        birthdate: student.birthdate,
        address: student.address,
        contact_number: student.contact_number,
        email: student.email,
        class_id: classId
      }));
      
      await bulkCreateStudents(studentsToImport);
      
      setImportSuccess(true);
      let successMessage = `Successfully imported ${validStudents.length} students to ${classData?.grade_level} - ${classData?.section}`;
      if (duplicateCount > 0) {
        successMessage += ` (${duplicateCount} duplicates were skipped)`;
      }
      toast.success(successMessage);
      
      // Reload students for this class
      await fetchStudentsByClass(classId);
      
      setTimeout(() => {
        setIsExcelModalOpen(false);
        setExcelFile(null);
        setImportPreview([]);
        setImportSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error("Import error:", error);
      setImportError(`Failed to import students: ${error.message || "Unknown error"}`);
    } finally {
      setImportLoading(false);
    }
  };
  
  const filteredStudents = students
    .filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || student.lrn?.includes(searchTerm);
      
      // Add gender filter
      const matchesGender = genderFilter === 'all' || 
                           (genderFilter === 'male' && student.sex === 'Male') ||
                           (genderFilter === 'female' && student.sex === 'Female');
      
      return matchesSearch && matchesGender;
    })
    .sort((a, b) => {
      // First sort by gender (Male first, then Female)
      if (a.sex !== b.sex) {
        if (a.sex === 'Male' && b.sex === 'Female') return -1;
        if (a.sex === 'Female' && b.sex === 'Male') return 1;
      }
      
      // Then sort by last name within each gender group
      const lastNameA = (a.last_name || '').toLowerCase();
      const lastNameB = (b.last_name || '').toLowerCase();
      if (lastNameA < lastNameB) return -1;
      if (lastNameA > lastNameB) return 1;
      
      // If last names are the same, sort by first name
      const firstNameA = (a.first_name || '').toLowerCase();
      const firstNameB = (b.first_name || '').toLowerCase();
      return firstNameA.localeCompare(firstNameB);
    });
  
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  const isLoading = classLoading || studentsLoading;
  
  if (isLoading && !classData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 pt-20 sm:pt-24">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading class information...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="bg-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button 
              onClick={handleBack}
              className="flex items-center text-blue-100 hover:text-white mb-2 transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {classData ? `${classData.grade_level} - ${classData.section}` : 'Class Students'}
            </h1>
            <div className="flex items-center text-blue-100 mt-1">
              <Calendar size={16} className="mr-1.5" />
              <span>School Year: {classData?.school_year || 'N/A'}</span>
            </div>
          </div>
          
          {/* Action buttons - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Add Student</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsExcelModalOpen(true)}
              className="bg-emerald-600 bg-opacity-90 hover:bg-opacity-100 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Import Students</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/class/${classId}/analytics`)}
              className="bg-purple-600 bg-opacity-90 hover:bg-opacity-100 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Analytics</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowTemplateGenerator(true)}
              className="bg-orange-600 bg-opacity-90 hover:bg-opacity-100 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Grade Template</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowBulkGradeImport(true)}
              className="bg-indigo-600 bg-opacity-90 hover:bg-opacity-100 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Import Grades</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={openPromoteModal}
              className="bg-teal-600 bg-opacity-90 hover:bg-opacity-100 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-300 flex items-center justify-center shadow-md"
            >
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 mr-2" /> 
              <span className="truncate">Promote</span>
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Class Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* Students Count Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Students</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-1">{filteredStudents.length}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        {/* Class Level Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-amber-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">Grade Level</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-1">{classData?.grade_level || 'N/A'}</h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <Book className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
        
        {/* Section Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-green-100">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-gray-500 text-sm font-medium">Section</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-1 break-words leading-tight">{classData?.section || 'N/A'}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-lg shrink-0">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Search bar and filters */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students by name or ID..."
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Gender Filter Dropdown */}
          <div className="sm:w-48">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Students</option>
              <option value="male">Male Students</option>
              <option value="female">Female Students</option>
            </select>
          </div>
        </div>
        
        {/* Filter Summary */}
        {(searchTerm || genderFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </span>
            )}
            {genderFilter !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {genderFilter === 'male' ? 'Male Students' : 'Female Students'}
                <button
                  onClick={() => setGenderFilter('all')}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 text-purple-400 hover:text-purple-600"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Students List */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Students
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
            {filteredStudents.length} total
          </span>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading students...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-xl">No students found</p>
            {searchTerm ? (
              <p className="text-gray-400 mt-2">Try adjusting your search criteria</p>
            ) : (
              <p className="text-gray-400 mt-2">This class has no students yet</p>
            )}
          </div>
        ) : (
          <>
            {/* Mobile view */}
            <div className="sm:hidden">
              <ul className="divide-y divide-gray-200">
                {currentStudents.map((student) => (
                  <li key={student.id} className="p-4">
                    <motion.div 
                      className="flex items-center justify-between"
                      whileHover={{ backgroundColor: "rgba(243, 244, 246, 0.5)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>
                        <h3 className="font-medium text-gray-800">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-gray-500 text-sm">ID: {maskStudentId(student.lrn)}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${student.sex?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                          <span>{student.sex}, Age: {calculateAge(student.birthdate)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewStudent(student.id)}
                          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                          title="View student"
                        >
                          <Eye size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => navigate(`/students/edit/${student.id}`)}
                          className="bg-amber-500 text-white p-2 rounded-full hover:bg-amber-700 transition-colors"
                          title="Edit student"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewReportCard(student.id)}
                          className="bg-green-500 text-white p-2 rounded-full hover:bg-green-700 transition-colors"
                          title="View report card"
                        >
                          <Eye size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  </li>
                ))}
              </ul>
              {filteredStudents.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 border rounded-md ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 border rounded-md ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Desktop view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.map((student, index) => (
                    <motion.tr 
                      key={student.id} 
                      className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
                      whileHover={{ backgroundColor: "rgba(239, 246, 255, 0.7)" }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {maskStudentId(student.lrn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {student.first_name} {student.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${student.sex?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}></span>
                          <span>{student.sex || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {calculateAge(student.birthdate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.contact_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewStudent(student.id)}
                            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-700 transition-colors"
                            title="View student"
                          >
                            <Eye size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(`/students/edit/${student.id}`)}
                            className="bg-amber-500 text-white p-2 rounded hover:bg-amber-700 transition-colors"
                            title="Edit student"
                          >
                            <Edit size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewReportCard(student.id)}
                            className="bg-green-500 text-white p-2 rounded hover:bg-green-700 transition-colors"
                            title="View report card"
                          >
                            <Eye size={16} /> 
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filteredStudents.length > 0 && (
                <div className="px-6 py-4 bg-white border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {Math.min((currentPage - 1) * studentsPerPage + 1, filteredStudents.length)} to{' '}
                      {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of{' '}
                      {filteredStudents.length} students
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 border rounded-md ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {/* First page */}
                        {currentPage > 3 && (
                          <button
                            onClick={() => goToPage(1)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                          >
                            1
                          </button>
                        )}
                        
                        {/* Ellipsis */}
                        {currentPage > 4 && (
                          <span className="px-2 py-1.5 text-gray-500">...</span>
                        )}
                        
                        {/* Page numbers */}
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          // Show current page, and 1 page before and after
                          if (
                            pageNum === currentPage ||
                            pageNum === currentPage - 1 ||
                            pageNum === currentPage + 1
                          ) {
                            return (
                              <button
                                key={i}
                                onClick={() => goToPage(pageNum)}
                                className={`px-3 py-1.5 border rounded-md ${
                                  pageNum === currentPage
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}
                        
                        {/* Ellipsis */}
                        {currentPage < totalPages - 3 && (
                          <span className="px-2 py-1.5 text-gray-500">...</span>
                        )}
                        
                        {/* Last page */}
                        {currentPage < totalPages - 2 && (
                          <button
                            onClick={() => goToPage(totalPages)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-gray-700"
                          >
                            {totalPages}
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 border rounded-md ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        classes={classData ? [classData] : []}
        isLoading={studentsLoading}
      />

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        excelFile={excelFile}
        onFileChange={handleFileChange}
        importPreview={importPreview}
        importLoading={importLoading}
        importError={importError}
        importSuccess={importSuccess}
        onImportSubmit={handleImportSubmit}
        existingStudents={students.map(student => ({
          lrn: student.lrn,
          first_name: student.first_name,
          last_name: student.last_name,
          class_name: classData ? `${classData.grade_level} - ${classData.section}` : 'Current Class'
        }))}
      />

      {/* Grade Template Generator Modal */}
      {showTemplateGenerator && (
        <GradeTemplateGenerator
          classId={classId}
          classData={{
            grade_level: classData?.grade_level,
            section: classData?.section
          }}
          onClose={() => setShowTemplateGenerator(false)}
        />
      )}

      {/* Bulk Grade Import Modal */}
      {showBulkGradeImport && (
        <BulkGradeImport
          classId={classId}
          classData={{
            grade_level: classData?.grade_level,
            section: classData?.section
          }}
          students={students}
          onClose={() => setShowBulkGradeImport(false)}
          onImportComplete={() => {
            toast.success('Grades imported successfully!');
            setShowBulkGradeImport(false);
          }}
        />
      )}

      {/* Promote Students Modal */}
      {isPromoteOpen && (
        <div className="teacher-modal-overlay">
          <div className="teacher-modal-panel sm:max-w-3xl">
            <div className="teacher-modal-header">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Promote Students</h3>
                <p className="mt-1 text-sm text-gray-500">Move selected students into a target class.</p>
              </div>
              <button onClick={() => setIsPromoteOpen(false)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">x</button>
            </div>
            <div className="teacher-modal-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Target School Year</label>
                  <input
                    type="text"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    onBlur={async () => {
                      try {
                        const classes = await fetchClasses(targetYear, true); // include all classes when year changes
                        setAvailableTargetClasses(classes || []);
                      } catch (e) {
                        toast.error('Failed to load classes for that year');
                      }
                    }}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., 2026-2027"
                  />
                  <p className="text-xs text-gray-500 mt-1">Defaults to the next year from this class.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Target Class</label>
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select a class</option>
                    {availableTargetClasses
                      .filter(c => c.school_year === targetYear)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.grade_level} - {c.section} {c.adviser_name ? `(Adviser: ${c.adviser_name})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Select Students</label>
                  <button onClick={toggleSelectAll} className="text-sm text-blue-600 hover:underline">
                    {selectedIds.size === students.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-[50vh] overflow-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Select</th>
                        <th className="p-2 text-left">LRN</th>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Gender</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id} className="border-t">
                          <td className="p-2">
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleOne(s.id)} />
                          </td>
                          <td className="p-2">{s.lrn}</td>
                          <td className="p-2">{s.last_name}, {s.first_name}</td>
                          <td className="p-2">{s.sex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="teacher-modal-footer">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setIsPromoteOpen(false)} className="w-full rounded-lg border px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto">Cancel</button>
              <button onClick={handleConfirmPromote} className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-white transition-colors hover:bg-green-700 sm:w-auto">
                <Send className="w-4 h-4 mr-2" /> Confirm Promotion
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ClassStudentsPage;
