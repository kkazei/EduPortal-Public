import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useGradeStore } from '../store/gradeStore';

const GradeImport = ({ classId, currentStudentName, onImportComplete, onClose }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('1');
  const [detectedSubjects, setDetectedSubjects] = useState([]);
  const fileInputRef = useRef(null);

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
      console.log('Processing file:', file.name);
      const data = await readExcelFile(file);
      console.log('Excel data loaded, rows:', data.length);
      
      if (data.length === 0) {
        throw new Error('Excel file appears to be empty');
      }
      
      if (data.length < 8) {
        throw new Error('Excel file does not have enough rows. Expected subjects in row 8.');
      }
      
      const processedData = processExcelData(data);
      console.log('Processed data:', processedData);
      
      if (!processedData || !processedData.student) {
        throw new Error(`Student "${currentStudentName}" not found in the Excel file. Please check the student name format and ensure the student exists in the file.`);
      }
      
      const validation = validateData(processedData);
      
      if (validation.isValid) {
        setPreviewData(processedData);
        setValidationErrors([]);
        toast.success(`Found data for ${processedData.student.student_name} with ${Object.keys(processedData.student.subjects).length} subjects.`);
      } else {
        setValidationErrors(validation.errors);
        toast.error('File validation failed. Please check the errors below.');
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
          
          console.log('Available sheets:', workbook.SheetNames);
          
          // Look for the specific sheet named "SUMMARY OF QUARTERLY GRADES"
          const targetSheetName = workbook.SheetNames.find(name => 
            name.toUpperCase().includes('SUMMARY') && 
            name.toUpperCase().includes('QUARTERLY') && 
            name.toUpperCase().includes('GRADES')
          );
          
          if (!targetSheetName) {
            // If exact match not found, look for variations
            const alternativeSheetName = workbook.SheetNames.find(name => 
              name.toUpperCase().includes('SUMMARY') || 
              name.toUpperCase().includes('QUARTERLY') ||
              name.toUpperCase().includes('GRADES')
            );
            
            if (!alternativeSheetName) {
              throw new Error(`Could not find "SUMMARY OF QUARTERLY GRADES" sheet. Available sheets: ${workbook.SheetNames.join(', ')}`);
            }
            
            console.log(`Using alternative sheet: ${alternativeSheetName}`);
            const worksheet = workbook.Sheets[alternativeSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            resolve(jsonData);
          } else {
            console.log(`Found target sheet: ${targetSheetName}`);
            const worksheet = workbook.Sheets[targetSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            resolve(jsonData);
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processExcelData = (rawData) => {
    if (!rawData || rawData.length < 2) return null;

    console.log('Raw Excel data:', rawData);

    // Look specifically at row 7 (index 6) for subjects - this is where the actual headers are
    let headerRowIndex = 6; // Row 7 (0-indexed) - this contains the subject headers
    let subjectColumns = [];

    // Check if row 7 exists
    if (rawData.length <= headerRowIndex) {
      throw new Error('Excel file does not have enough rows. Expected subjects in row 7.');
    }

    const headerRow = rawData[headerRowIndex];
    console.log('Checking row 7 for subjects:', headerRow);

    if (!headerRow || !Array.isArray(headerRow)) {
      throw new Error('Row 7 is empty or invalid.');
    }

    // Create a mapping function to match Excel subject names to database subject names
    const mapExcelSubjectToDatabase = (excelSubject, gradeLevel) => {
      const excelUpper = excelSubject.toUpperCase().trim();
      
      // Grade-specific mappings
      const gradeMappings = {
        'Grade 1': {
          'LANGUAGE': 'Language',
          'READING': 'Reading and Literacy',
          'READING AND LITERACY': 'Reading and Literacy',
          'MATHEMATICS': 'Mathematics',
          'MATH': 'Mathematics',
          'MAKABANSA': 'Makabansa',
          'GMRC': 'Good Manners and Right Conduct (GMRC)',
          'GOOD MANNERS AND RIGHT CONDUCT': 'Good Manners and Right Conduct (GMRC)',
          'SCIENCE': 'SCIENCE',
          'COMPUTER': 'COMPUTER EDUCATION',
          'COMPUTER EDUCATION': 'COMPUTER EDUCATION'
        },
        'Grade 2': {
          'FILIPINO': 'Filipino',
          'FIL': 'Filipino',
          'ENGLISH': 'English',
          'ENG': 'English',
          'MATHEMATICS': 'Mathematics',
          'MATH': 'Mathematics',
          'SCIENCE': 'Science',
          'MAKABANSA': 'Makabansa / Araling Panlipunan',
          'ARALING PANLIPUNAN': 'Makabansa / Araling Panlipunan',
          'EPP': 'EPP / TLE / Computer',
          'TLE': 'EPP / TLE / Computer',
          'COMPUTER': 'EPP / TLE / Computer',
          'GMRC': 'GMRC'
        },
        'Grade 3': {
          'FILIPINO': 'Filipino',
          'FIL': 'Filipino',
          'ENGLISH': 'English',
          'ENG': 'English',
          'MATHEMATICS': 'Mathematics',
          'MATH': 'Mathematics',
          'MAKABANSA': 'Makabansa / Araling Panlipunan',
          'ARALING PANLIPUNAN': 'Makabansa / Araling Panlipunan',
          'GMRC': 'GMRC',
          'SCIENCE': 'Science',
          'COMPUTER': 'Computer'
        },
        'Grade 4': {
          'FILIPINO': 'Filipino',
          'FIL': 'Filipino',
          'ENGLISH': 'English',
          'ENG': 'English',
          'MATHEMATICS': 'Mathematics',
          'MATH': 'Mathematics',
          'ARALING PANLIPUNAN': 'Araling Panlipunan',
          'AP': 'Araling Panlipunan',
          'MAPEH': 'MAPEH',
          'MUSIC AND ARTS': 'Music and Arts',
          'PHYSICAL EDUCATION AND HEALTH': 'Physical Education and Health',
          'GMRC': 'GMRC/Values Education',
          'VALUES EDUCATION': 'GMRC/Values Education',
          'SCIENCE': 'Science',
          'EPP': 'EPP/TLE',
          'TLE': 'EPP/TLE',
          'ELECTIVE': 'Elective',
          'ICT': 'ICT',
          'ROBOTICS': 'Robotics'
        }
      };

      // Get mappings for the current grade level
      const currentGradeMappings = gradeMappings[gradeLevel] || {};
      
      // Try exact match first
      if (currentGradeMappings[excelUpper]) {
        return currentGradeMappings[excelUpper];
      }

      // Try partial matches
      for (const [key, value] of Object.entries(currentGradeMappings)) {
        if (excelUpper.includes(key) || key.includes(excelUpper)) {
          return value;
        }
      }

      // If no mapping found, return the original subject name
      return excelSubject.trim();
    };

    // Extract subject names from the header row - focus on columns 4-10 where the actual subjects are
    const expectedSubjectRange = { start: 4, end: 10 }; // Columns E to K (0-indexed)
    
    for (let j = expectedSubjectRange.start; j <= expectedSubjectRange.end; j++) {
      if (j < headerRow.length) {
        const cell = headerRow[j];
        if (cell && typeof cell === 'string') {
          const cellUpper = cell.toUpperCase().trim();
          
          // Skip empty cells or non-subject headers
          if (cellUpper === '' || /^\d+$/.test(cellUpper)) {
            console.log('Skipping empty or numeric column:', cellUpper);
            continue;
          }
          
          // Check for actual subject names
          if (cellUpper === 'GMRC' || 
              cellUpper.includes('READING') || 
              cellUpper === 'LANGUAGE' || 
              cellUpper.includes('MATHEMATICS') || 
              cellUpper.includes('MAKABANSA') || 
              cellUpper === 'SCIENCE' || 
              cellUpper.includes('COMPUTER') ||
              cellUpper === 'FILIPINO' ||
              cellUpper === 'ENGLISH' ||
              cellUpper.includes('ARALING') ||
              cellUpper === 'MAPEH' ||
              cellUpper.includes('MUSIC') ||
              cellUpper.includes('PHYSICAL') ||
              cellUpper === 'EPP' ||
              cellUpper === 'TLE' ||
              cellUpper === 'ICT' ||
              cellUpper === 'ROBOTICS' ||
              cellUpper === 'ELECTIVE') {
            
            // Map the Excel subject name to the database subject name
            const mappedSubjectName = mapExcelSubjectToDatabase(cell.trim());
            
            subjectColumns.push({
              index: j,
              name: mappedSubjectName, // Use the mapped name
              originalName: cell.trim() // Keep the original for debugging
            });
            console.log(`Found subject at column ${j}: "${cell.trim()}" -> mapped to: "${mappedSubjectName}"`);
          }
        }
      }
    }

    if (subjectColumns.length === 0) {
      throw new Error('No subjects found in row 7. Please check your Excel format.');
    }

    console.log('Found subjects:', subjectColumns);
    setDetectedSubjects(subjectColumns.map(s => `${s.originalName} → ${s.name}`));

    // Find the current student's data - look in rows after row 7
    // Skip row 8 (index 7) as it contains numbers, start from row 9 (index 8)
    let studentFound = null;

    for (let i = 8; i < rawData.length; i++) { // Start from row 9 (index 8)
      const row = rawData[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // Skip empty rows
      if (row.every(cell => !cell || cell === '')) continue;

      console.log('Checking row', i + 1, 'for student:', row);

      // Skip section headers like "MALE", "FEMALE"
      if (row[1] && typeof row[1] === 'string') {
        const cellValue = row[1].toUpperCase().trim();
        if (cellValue === 'MALE' || cellValue === 'FEMALE') {
          console.log('Skipping section header:', cellValue);
          continue;
        }
      }

      // Look for student name - it should be in column B (index 1)
      const studentName = row[1];
      
      if (!studentName || typeof studentName !== 'string' || !studentName.includes(',')) {
        console.log('No valid student name found in row', i + 1);
        continue;
      }

      console.log('Found student name:', studentName);

      // Check if this matches the current student (improved matching)
      const normalizedCurrentName = currentStudentName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
      const normalizedExcelName = studentName.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
      
      console.log('Comparing:', normalizedCurrentName, 'vs', normalizedExcelName);

      // Parse both names to compare parts
      let isMatch = false;

      // Parse Excel name (format: "LAST NAME, FIRST NAME MIDDLE NAME")
      const excelParts = normalizedExcelName.split(',');
      const excelLastName = excelParts[0].trim();
      const excelFirstMiddle = excelParts[1] ? excelParts[1].trim().split(' ') : [];
      const excelFirstName = excelFirstMiddle[0] || '';
      const excelMiddleName = excelFirstMiddle.slice(1).join(' ');

      // Parse current student name (could be "FIRST MIDDLE LAST" or "FIRST LAST")
      const currentParts = normalizedCurrentName.split(' ').filter(part => part.length > 0);
      
      // Try different matching strategies
      if (currentParts.length >= 2) {
        // Strategy 1: Assume last part is last name
        const currentLastName = currentParts[currentParts.length - 1];
        const currentFirstName = currentParts[0];
        const currentMiddleName = currentParts.slice(1, -1).join(' ');

        console.log('Strategy 1 - Current:', { 
          first: currentFirstName, 
          middle: currentMiddleName, 
          last: currentLastName 
        });
        console.log('Strategy 1 - Excel:', { 
          first: excelFirstName, 
          middle: excelMiddleName, 
          last: excelLastName 
        });

        // Check if last names match and first names match
        if (excelLastName.includes(currentLastName) || currentLastName.includes(excelLastName)) {
          if (excelFirstName.includes(currentFirstName) || currentFirstName.includes(excelFirstName)) {
            isMatch = true;
            console.log('Match found using Strategy 1: Last name and first name match');
          }
        }

        // Strategy 2: Check if any part of current name matches any part of excel name
        if (!isMatch) {
          const allExcelParts = [excelLastName, excelFirstName, ...excelMiddleName.split(' ')].filter(p => p.length > 1);
          const allCurrentParts = currentParts;
          
          let matchingParts = 0;
          allCurrentParts.forEach(currentPart => {
            allExcelParts.forEach(excelPart => {
              if (currentPart.length > 2 && excelPart.length > 2) {
                if (currentPart.includes(excelPart) || excelPart.includes(currentPart)) {
                  matchingParts++;
                }
              }
            });
          });

          console.log('Strategy 2 - Matching parts:', matchingParts, 'out of', Math.min(allCurrentParts.length, allExcelParts.length));
          
          // If at least 2 name parts match, consider it a match
          if (matchingParts >= 2) {
            isMatch = true;
            console.log('Match found using Strategy 2: Multiple name parts match');
          }
        }

        // Strategy 3: Flexible partial matching
        if (!isMatch) {
          // Check if the excel name contains the main parts of current name
          const combinedExcelName = `${excelFirstName} ${excelMiddleName} ${excelLastName}`.replace(/\s+/g, ' ').trim();
          
          let foundParts = 0;
          currentParts.forEach(part => {
            if (part.length > 2 && combinedExcelName.includes(part)) {
              foundParts++;
            }
          });

          console.log('Strategy 3 - Found parts:', foundParts, 'in combined name:', combinedExcelName);
          
          if (foundParts >= Math.min(2, currentParts.length)) {
            isMatch = true;
            console.log('Match found using Strategy 3: Partial name matching');
          }
        }
      }

      if (isMatch) {
        console.log('Found matching student:', studentName);
        
        // Create a Map to store grades by subject name for easy lookup
        const gradeMap = new Map();
        subjectColumns.forEach(({ index, name, originalName }) => {
          if (index < row.length) {
            const grade = row[index];
            console.log(`Checking grade for ${originalName} -> ${name} at column ${index}:`, grade);
            
            // Handle different number formats
            let numericGrade = null;
            if (grade !== null && grade !== undefined && grade !== '') {
              // Convert to string first, then parse
              const gradeStr = String(grade);
              if (!isNaN(gradeStr) && gradeStr.trim() !== '') {
                numericGrade = parseFloat(gradeStr);
              }
            }
            
            if (!isNaN(numericGrade) && numericGrade >= 0 && numericGrade <= 100) {
              gradeMap.set(name, { [`q${selectedQuarter}_grade`]: numericGrade });
              console.log(`Added grade for ${name}:`, numericGrade);
            } else {
              console.log(`Invalid or missing grade for ${name}:`, grade);
            }
          }
        });

        // Define the EXACT order that should be maintained (based on your database order)
        const expectedSubjectOrder = [
          'Language',
          'Reading and Literacy', 
          'Mathematics',
          'Makabansa',
          'Good Manners and Right Conduct (GMRC)',
          'Science',
          'COMPUTER EDUCATION'
        ];

        // Create subjects object in the exact expected order
        const subjects = {};
        expectedSubjectOrder.forEach(subjectName => {
          if (gradeMap.has(subjectName)) {
            subjects[subjectName] = gradeMap.get(subjectName);
          }
        });

        // Add any remaining subjects that weren't in the expected order
        gradeMap.forEach((gradeData, subjectName) => {
          if (!subjects[subjectName]) {
            subjects[subjectName] = gradeData;
          }
        });

        // Parse name for the response
        const nameParts = studentName.split(',');
        const lastName = nameParts[0].trim();
        const firstMiddleParts = nameParts[1] ? nameParts[1].trim().split(' ') : [''];
        const firstName = firstMiddleParts[0] || '';
        const middleName = firstMiddleParts.slice(1).join(' ') || '';

        studentFound = {
          student_name: studentName,
          last_name: lastName,
          first_name: firstName,
          middle_name: middleName,
          subjects: subjects
        };

        console.log('Student found with subjects in order:', Object.keys(subjects));
        break;
      } else {
        console.log('No match found for:', studentName);
      }
    }

    if (!studentFound) {
      console.log('Student not found. Searched for:', currentStudentName);
      return null;
    }

    return {
      student: studentFound,
      detectedSubjects: subjectColumns.map(s => s.name) // Use mapped names for display
    };
  };

  const validateData = (data) => {
    const errors = [];
    
    if (!data || !data.student) {
      errors.push('No student data found');
      return { isValid: false, errors };
    }

    const { student } = data;

    if (!student.student_name) {
      errors.push('Missing student name');
    }

    if (!student.subjects || Object.keys(student.subjects).length === 0) {
      errors.push('No valid grades found for this student');
    }

    // Validate grade values
    Object.entries(student.subjects).forEach(([subject, grades]) => {
      Object.entries(grades).forEach(([quarter, grade]) => {
        if (grade !== null && (isNaN(grade) || grade < 0 || grade > 100)) {
          errors.push(`${subject}: Invalid grade "${grade}" (must be 0-100)`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleImport = async () => {
    if (!previewData) {
      toast.error('No data to import');
      return;
    }

    setIsProcessing(true);
    try {
      const student = previewData.student;
      const subjects = Object.entries(student.subjects);
      
      console.log('Starting direct import for student:', student.student_name);
      console.log('Subjects to import:', subjects);

      // Instead of API call, pass the data back to the parent component with proper ordering
      toast.success(`Grades processed for ${student.student_name}!`);
      
      // Pass the processed data to the parent component with subject order preserved
      if (onImportComplete) {
        // Create ordered subjects object to maintain the original database order
        const orderedSubjects = [];
        subjects.forEach(([subjectName, gradeData]) => {
          const grade = gradeData[`q${selectedQuarter}_grade`];
          if (grade !== null && grade !== undefined) {
            orderedSubjects.push([subjectName, { [`q${selectedQuarter}_grade`]: grade }]);
          }
        });

        onImportComplete({
          student: student,
          quarter: selectedQuarter,
          subjects: orderedSubjects,
          maintainOrder: true // Flag to tell parent to maintain order
        });
      }
      
      onClose();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to process grades. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
        className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Import Grades from Excel</h2>
            <p className="text-gray-600 text-sm mt-1">Importing for: <strong>{currentStudentName}</strong></p>
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
            </div>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="border border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1">1st Quarter</option>
              <option value="2">2nd Quarter</option>
              <option value="3">3rd Quarter</option>
              <option value="4">4th Quarter</option>
            </select>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">Instructions:</h3>
          <ul className="text-amber-700 text-sm space-y-1">
            <li>• Upload an Excel file with the "Summary of Quarterly Grades" format</li>
            <li>• The system will search for <strong>"{currentStudentName}"</strong> in the file</li>
            <li>• Subjects will be automatically detected from the header row</li>
            <li>• Grades should be between 0-100</li>
            <li>• Only grades for the current student will be imported</li>
          </ul>
        </div>

        {/* Detected Subjects */}
        {detectedSubjects.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Detected Subjects:</h3>
            <div className="flex flex-wrap gap-2">
              {detectedSubjects.map((subject, index) => (
                <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">
                  {subject}
                </span>
              ))}
            </div>
          </div>
        )}

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
        {previewData && validationErrors.length === 0 && (
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">
              Preview for Quarter {selectedQuarter}:
            </h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    {Object.keys(previewData.student.subjects).map(subject => (
                      <th key={subject} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        {subject}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">{previewData.student.student_name}</td>
                    {Object.entries(previewData.student.subjects).map(([subject, grades]) => {
                      const grade = grades[`q${selectedQuarter}_grade`];
                      return (
                        <td key={subject} className="px-3 py-2 text-sm text-center">
                          <span className={`px-2 py-1 rounded ${
                            grade >= 90 ? 'bg-green-100 text-green-800' :
                            grade >= 80 ? 'bg-blue-100 text-blue-800' :
                            grade >= 75 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade || '-'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
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
            onClick={handleImport}
            disabled={!previewData || validationErrors.length > 0 || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                Import Quarter {selectedQuarter} Grades
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GradeImport;