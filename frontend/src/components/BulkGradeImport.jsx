import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, X, Users, BookOpen, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useGradeStore } from '../store/gradeStore';

const BulkGradeImport = ({ classId, classData, students, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [existingGrades, setExistingGrades] = useState(null);
  const [showOverwriteConfirmation, setShowOverwriteConfirmation] = useState(false);
  const [isCheckingExistingGrades, setIsCheckingExistingGrades] = useState(false);
  const fileInputRef = useRef(null);

  const { importGradesFromExcel, getClassGrades, checkExistingGrades } = useGradeStore();

  // Check for existing grades when quarter changes
  useEffect(() => {
    checkForExistingGrades();
  }, [selectedQuarter, classId]);

  const checkForExistingGrades = async () => {
    if (!classId || !selectedQuarter) return;
    
    setIsCheckingExistingGrades(true);
    try {
      // Check if there are existing grades for this quarter
      const grades = await getClassGrades(classId);
      const quarterField = `q${selectedQuarter}_grade`;
      
      const studentsWithGrades = students.filter(student => {
        return grades?.some(grade => 
          grade.student_id === student.id && 
          grade[quarterField] !== null && 
          grade[quarterField] !== undefined
        );
      });

      if (studentsWithGrades.length > 0) {
        setExistingGrades({
          count: studentsWithGrades.length,
          students: studentsWithGrades,
          quarter: selectedQuarter
        });
      } else {
        setExistingGrades(null);
      }
    } catch (error) {
      console.error('Error checking existing grades:', error);
      setExistingGrades(null);
    } finally {
      setIsCheckingExistingGrades(false);
    }
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (file) => {
    setIsProcessing(true);
    try {
      const data = await readExcelFile(file);
      const processedData = processExcelData(data);
      
      if (processedData.students.length === 0) {
        throw new Error('No valid student data found in the Excel file');
      }

      const validation = validateData(processedData);
      
      if (validation.isValid) {
        setPreviewData(processedData);
        setValidationErrors([]);
        toast.success(`Found data for ${processedData.students.length} students with ${processedData.subjects.length} subjects.`);
      } else {
        setValidationErrors(validation.errors);
        setPreviewData(processedData); // Still show preview with errors
        toast.error('File validation has issues. Please review below.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Error processing file: ${error.message}`);
      setValidationErrors([error.message]);
    } finally {
      setIsProcessing(false);
    }
  };

  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const normalizeText = (str) => (str || '').toString().toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();

  const fuzzyEquals = (a, b) => normalizeText(a) === normalizeText(b);

  const processExcelData = (rawData) => {
    if (!rawData || rawData.length < 5) {
      throw new Error('Excel file does not have enough data');
    }

    // First attempt: standard header with Student ID and Student Name
    let headerRowIndex = -1;
    let headers = [];
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      const hasId = row.some(cell => cell && cell.toString().toLowerCase().includes('student id'));
      const hasName = row.some(cell => cell && cell.toString().toLowerCase().includes('student name'));
      if (hasId && hasName) {
        headerRowIndex = i;
        headers = row.map(cell => (cell ? cell.toString().trim() : ''));
        break;
      }
    }

    const buildProcessedFromStandard = () => {
      // Find column indices
      const studentIdIndex = headers.findIndex(h => h.toLowerCase().includes('student id'));
      const studentNameIndex = headers.findIndex(h => h.toLowerCase().includes('student name'));
      if (studentIdIndex === -1 || studentNameIndex === -1) {
        throw new Error('Missing required columns: Student ID and Student Name');
      }
      // Extract subject columns
      const subjectColumns = [];
      for (let i = studentNameIndex + 1; i < headers.length; i++) {
        const header = headers[i];
        if (header && !header.toLowerCase().includes('average') && !header.toLowerCase().includes('total')) {
          subjectColumns.push({ index: i, name: header });
        } else {
          break;
        }
      }
      if (subjectColumns.length === 0) throw new Error('No subject columns found');
      // Process student rows
      const processedStudents = [];
      const usedStudentIds = new Set();
      const dataRows = rawData.slice(headerRowIndex + 1);
      dataRows.forEach((row, rIdx) => {
        if (!row || !Array.isArray(row) || row.length === 0) return;
        const studentId = row[studentIdIndex];
        const studentName = row[studentNameIndex];
        if (!studentId || !studentName) return;
        const nameStr = studentName.toString();
        if (nameStr.toLowerCase().includes('instruction') || nameStr.trim() === 'MALE' || nameStr.trim() === 'FEMALE') return;
        const cleanStudentName = nameStr.replace(/^\d+\.\s*/, '').trim();
        let matchedStudent = students.find(s => s.lrn === String(studentId) || s.id === studentId);
        if (!matchedStudent) {
          matchedStudent = students.find(s => !usedStudentIds.has(s.id) && matchStudentName(cleanStudentName, s));
        }
        if (!matchedStudent || usedStudentIds.has(matchedStudent.id)) return;
        usedStudentIds.add(matchedStudent.id);
        const grades = {};
        subjectColumns.forEach(({ index, name }) => {
          const grade = row[index];
          const num = parseFloat(grade);
          if (!isNaN(num) && num >= 0 && num <= 100) grades[name] = num;
        });
        if (Object.keys(grades).length) {
          processedStudents.push({ student: matchedStudent, grades, excelRow: rIdx + headerRowIndex + 2, originalName: cleanStudentName });
        }
      });
      return { students: processedStudents, subjects: subjectColumns.map(c => c.name), headerRow: headerRowIndex + 1 };
    };

    // If standard header not found, attempt official DepEd template parsing
    if (headerRowIndex === -1) {
      // Heuristic: find the row where first cell contains "LEARNERS' NAMES" or similar,
      // and subsequent cells match class subjects names. We'll use classData.subjects if available.
      const classSubjects = Array.isArray(classData?.subjects) ? classData.subjects.map(s => s.subject_name) : [];
      const normalizedClassSubjects = classSubjects.map(normalizeText);
      let subjectHeaderRow = -1;
      let subjectColumns = [];
      for (let i = 0; i < Math.min(30, rawData.length); i++) {
        const row = rawData[i];
        if (!Array.isArray(row)) continue;
        const firstCell = normalizeText(row[0] || '');
        const looksLikeLearners = firstCell.includes('LEARNERS') || firstCell.includes('LEARNERS NAMES') || firstCell.includes('LEARNERS NAMES') || firstCell.includes('LEARNERS');
        // Count matches against known subjects in the row
        const rowNorms = row.map(normalizeText);
        const matches = rowNorms.filter(cell => normalizedClassSubjects.includes(cell)).length;
        if (looksLikeLearners || matches >= 3) {
          subjectHeaderRow = i;
          // Build subject columns: skip first column (names), then any cell that matches a class subject
          for (let col = 1; col < row.length; col++) {
            const header = row[col];
            if (!header) continue;
            const norm = normalizeText(header);
            if (norm && !norm.includes('AVERAGE') && !norm.includes('TOTAL')) {
              // Use original header string; if we have a known subject match, prefer the exact class subject name mapping
              let displayName = header.toString().trim();
              const idxMatch = normalizedClassSubjects.indexOf(norm);
              if (idxMatch >= 0) displayName = classSubjects[idxMatch];
              subjectColumns.push({ index: col, name: displayName });
            } else {
              // stop at averages if present
              break;
            }
          }
          break;
        }
      }
      if (subjectHeaderRow === -1 || subjectColumns.length === 0) {
        throw new Error('Could not locate subject headers. Ensure the official template includes subject names row.');
      }
      // Process student rows: names are in first column, possibly with numbering "1. Last, First"
      const processedStudents = [];
      const usedIds = new Set();
      const dataRows = rawData.slice(subjectHeaderRow + 1);
      dataRows.forEach((row, rIdx) => {
        if (!Array.isArray(row) || row.length === 0) return;
        const rawName = row[0];
        if (!rawName) return;
        const nameStr = rawName.toString().trim();
        // Skip divider rows or totals
        const nNorm = normalizeText(nameStr);
        if (!nameStr || nNorm === 'TOTAL' || nNorm === 'TOTAL 3' || nNorm === 'MALE' || nNorm === 'FEMALE') return;
        const cleanName = nameStr.replace(/^\d+\.\s*/, '').trim();
        let matchedStudent = students.find(s => !usedIds.has(s.id) && matchStudentName(cleanName, s));
        if (!matchedStudent) {
          // Try matching by LRN if present in any numeric-looking cell in the row
          const lrnCell = row.find(c => typeof c === 'number' || (typeof c === 'string' && /\d{10,}/.test(c)));
          if (lrnCell) matchedStudent = students.find(s => String(s.lrn) === String(lrnCell));
        }
        if (!matchedStudent) {
          // Not fatal: we simply skip unmatched rows
          return;
        }
        if (usedIds.has(matchedStudent.id)) return;
        usedIds.add(matchedStudent.id);
        const grades = {};
        subjectColumns.forEach(({ index, name }) => {
          const grade = row[index];
          const num = parseFloat(grade);
          if (!isNaN(num) && num >= 0 && num <= 100) grades[name] = num;
        });
        processedStudents.push({ student: matchedStudent, grades, excelRow: rIdx + subjectHeaderRow + 2, originalName: cleanName });
      });
      return { students: processedStudents, subjects: subjectColumns.map(c => c.name), headerRow: subjectHeaderRow + 1 };
    }

    // Fallback to standard processing path
    return buildProcessedFromStandard();
  };

  const matchStudentName = (excelName, student) => {
    const normalize = (str) => str.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
    
    const normalizedExcel = normalize(excelName);
    
    // Build full student name variations
    const firstName = normalize(student.first_name || '');
    const lastName = normalize(student.last_name || '');
    const middleName = normalize(student.middle_name || '');
    
    // Create different name format variations
    const studentVariations = [
      `${firstName} ${lastName}`,
      `${lastName} ${firstName}`,
      `${lastName}, ${firstName}`,
      middleName ? `${firstName} ${middleName} ${lastName}` : '',
      middleName ? `${lastName}, ${firstName} ${middleName}` : '',
      middleName ? `${lastName} ${firstName} ${middleName}` : ''
    ].filter(v => v.trim().length > 0);

    // Check for exact matches first
    for (const variation of studentVariations) {
      if (normalizedExcel === variation) {
        return true;
      }
    }

    // If no exact match, check if Excel name contains the core student names
    const excelParts = normalizedExcel.split(/[,\s]+/).filter(p => p.length > 2);
    const studentParts = [firstName, lastName, middleName].filter(p => p.length > 2);

    // Must match both first and last name at minimum
    const hasFirstName = excelParts.some(part => part.includes(firstName) || firstName.includes(part));
    const hasLastName = excelParts.some(part => part.includes(lastName) || lastName.includes(part));
    
    return hasFirstName && hasLastName;
  };

  const validateData = (data) => {
    const errors = [];
    const warnings = [];

    if (!data.students || data.students.length === 0) {
      errors.push('No student data found');
    }

    if (!data.subjects || data.subjects.length === 0) {
      errors.push('No subject columns found');
    }

    // Check for students without grades
    const studentsWithoutGrades = data.students.filter(s => Object.keys(s.grades).length === 0);
    if (studentsWithoutGrades.length > 0) {
      warnings.push(`${studentsWithoutGrades.length} students have no valid grades`);
    }

    // Check for unmatched students in class
    const matchedStudentIds = data.students.map(s => s.student.id);
    const unmatchedStudents = students.filter(s => !matchedStudentIds.includes(s.id));
    if (unmatchedStudents.length > 0) {
      warnings.push(`${unmatchedStudents.length} students from class not found in Excel`);
    }

    return {
      isValid: errors.length === 0,
      errors: [...errors, ...warnings]
    };
  };

  const handleImportClick = () => {
    if (!previewData || previewData.students.length === 0) {
      toast.error('No data to import');
      return;
    }

    // Check if there are existing grades that would be overwritten
    if (existingGrades && existingGrades.count > 0) {
      setShowOverwriteConfirmation(true);
    } else {
      handleImport();
    }
  };

  const handleImport = async () => {
    if (!previewData || previewData.students.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsProcessing(true);
    setShowOverwriteConfirmation(false);
    
    try {
      // Transform the data to match the expected format for importGradesFromExcel
      const studentsData = previewData.students.map(({ student, grades }) => {
        // Transform grades object to match expected format
        const subjects = {};
        Object.entries(grades).forEach(([subjectName, grade]) => {
          subjects[subjectName] = {
            [`q${selectedQuarter}_grade`]: grade
          };
        });

        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          subjects: subjects
        };
      });

      console.log('Importing data:', {
        classId: classId,
        studentsData: studentsData,
        quarter: selectedQuarter
      });

      // Use the importGradesFromExcel function from gradeStore
      const result = await importGradesFromExcel(classId, studentsData, selectedQuarter);
      
      const action = existingGrades?.count > 0 ? 'updated' : 'imported';
      toast.success(`Successfully ${action} grades for ${previewData.students.length} students`);
      
      // Refresh class grades data
      try {
        await getClassGrades(classId);
      } catch (refreshError) {
        console.warn('Failed to refresh class grades:', refreshError);
      }
      
      onImportComplete();
      onClose();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import grades. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuarterChange = (newQuarter) => {
    setSelectedQuarter(newQuarter);
    // Reset states when quarter changes
    setShowOverwriteConfirmation(false);
  };

  const getQuarterName = (quarter) => {
    const quarters = {
      '1': '1st Quarter',
      '2': '2nd Quarter', 
      '3': '3rd Quarter',
      '4': '4th Quarter'
    };
    return quarters[quarter] || `Quarter ${quarter}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Bulk Import Grades</h2>
            <p className="text-gray-600 text-sm mt-1">
              Import grades for {classData.grade_level} - {classData.section} ({students.length} students)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Quarter Selection */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Select Quarter:</h3>
              <p className="text-blue-700 text-sm">Choose which quarter these grades belong to</p>
              {isCheckingExistingGrades && (
                <p className="text-blue-600 text-xs mt-1 flex items-center">
                  <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full mr-1"></div>
                  Checking existing grades...
                </p>
              )}
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => handleQuarterChange(e.target.value)}
              className="border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isCheckingExistingGrades}
            >
              <option value="1">1st Quarter</option>
              <option value="2">2nd Quarter</option>
              <option value="3">3rd Quarter</option>
              <option value="4">4th Quarter</option>
            </select>
          </div>
        </div>

        {/* Existing Grades Warning */}
        {existingGrades && existingGrades.count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800 mb-1">
                  Existing Grades Detected
                </h4>
                <p className="text-amber-700 text-sm mb-2">
                  There are already grades for <strong>{existingGrades.count} students</strong> in the {getQuarterName(selectedQuarter)}. 
                  Importing will <strong>overwrite</strong> these existing grades.
                </p>
                <p className="text-amber-600 text-xs">
                  Click "Import Grades" to confirm overwriting, or select a different quarter.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Upload the Excel template you downloaded and filled with grades</li>
            <li>• The file should contain Student ID, Student Name, and subject columns</li>
            <li>• Students will be matched by ID or name with existing class students</li>
            <li>• Grades should be between 0-100</li>
            <li>• Only valid grades will be imported</li>
            <li>• Both alphabetical and gender-sorted templates are supported</li>
            {existingGrades && existingGrades.count > 0 && (
              <li className="text-amber-700 font-medium">• ⚠️ Existing grades will be overwritten for the selected quarter</li>
            )}
          </ul>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {file ? (
              <div className="flex items-center justify-center">
                <CheckCircle className="text-green-600 mr-2" size={24} />
                <span className="text-green-800 font-medium">{file.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="text-gray-600">Click to select Excel file or drag and drop</p>
              </div>
            )}
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <AlertCircle className="text-red-600 mr-2" size={20} />
              <h4 className="font-semibold text-red-800">Issues Found:</h4>
            </div>
            <ul className="text-red-700 text-sm space-y-1 max-h-32 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview Data */}
        {previewData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">
                Preview for {getQuarterName(selectedQuarter)}:
              </h4>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Users size={16} className="mr-1" />
                  {previewData.students.length} students
                </span>
                <span className="flex items-center">
                  <BookOpen size={16} className="mr-1" />
                  {previewData.subjects.length} subjects
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto border rounded-lg max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    {previewData.subjects.map(subject => (
                      <th key={subject} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        {subject}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewData.students.map((studentData, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {studentData.student.first_name} {studentData.student.last_name}
                        <div className="text-xs text-gray-500">Excel: {studentData.originalName}</div>
                      </td>
                      {previewData.subjects.map(subject => {
                        const grade = studentData.grades[subject];
                        return (
                          <td key={subject} className="px-3 py-2 text-sm text-center">
                            {grade ? (
                              <span className={`px-2 py-1 rounded ${
                                grade >= 90 ? 'bg-green-100 text-green-800' :
                                grade >= 80 ? 'bg-blue-100 text-blue-800' :
                                grade >= 75 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {grade}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          Object.keys(studentData.grades).length > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {Object.keys(studentData.grades).length > 0 
                            ? `${Object.keys(studentData.grades).length} grades`
                            : 'No grades'
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overwrite Confirmation Modal */}
        {showOverwriteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center mb-4">
                <AlertTriangle className="text-amber-500 mr-3" size={24} />
                <h3 className="text-lg font-semibold text-gray-800">Confirm Overwrite</h3>
              </div>
              
              <p className="text-gray-600 mb-2">
                You are about to overwrite existing grades for <strong>{existingGrades.count} students</strong> in the {getQuarterName(selectedQuarter)}.
              </p>
              
              <p className="text-gray-600 mb-6">
                This action cannot be undone. Are you sure you want to continue?
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowOverwriteConfirmation(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center"
                >
                  <AlertTriangle size={16} className="mr-2" />
                  Yes, Overwrite Grades
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImportClick}
            disabled={!previewData || previewData.students.length === 0 || isProcessing || isCheckingExistingGrades}
            className={`px-4 py-2 rounded-lg text-white transition-colors flex items-center ${
              existingGrades && existingGrades.count > 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                {existingGrades && existingGrades.count > 0 ? 'Updating...' : 'Importing...'}
              </>
            ) : (
              <>
                {existingGrades && existingGrades.count > 0 ? (
                  <>
                    <AlertTriangle size={16} className="mr-2" />
                    Update {previewData?.students.length || 0} Students' Grades
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Import {previewData?.students.length || 0} Students' Grades
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BulkGradeImport;