import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet, Upload, CheckCircle, AlertCircle, Users, AlertTriangle } from 'lucide-react';

const ExcelImportModal = ({
  isOpen,
  onClose,
  excelFile,
  onFileChange,
  importPreview,
  importLoading,
  importError,
  importSuccess,
  onImportSubmit,
  // Admin functionality props
  isAdmin = false,
  classes = [],
  selectedClassId,
  onClassChange,
  showClassSelection = false,
  // Existing students for duplicate checking
  existingStudents = []
}) => {
  const selectedClass = classes.find(cls => cls.id === selectedClassId);

  // Enhanced function to check if a student already exists
  const checkIfStudentExists = (student) => {
    return existingStudents.some(existing => {
      // Check by LRN (exact match)
      if (student.lrn && existing.lrn && student.lrn.toString().trim() === existing.lrn.toString().trim()) {
        return true;
      }
      
      // Check by full name (case-insensitive)
      const newFullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase().trim();
      const existingFullName = `${existing.first_name || ''} ${existing.last_name || ''}`.toLowerCase().trim();
      
      if (newFullName && existingFullName && newFullName === existingFullName) {
        return true;
      }
      
      return false;
    });
  };

  // Get existing student details for display
  const getExistingStudentDetails = (student) => {
    return existingStudents.find(existing => {
      // Check by LRN first
      if (student.lrn && existing.lrn && student.lrn.toString().trim() === existing.lrn.toString().trim()) {
        return true;
      }
      
      // Check by name
      const newFullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase().trim();
      const existingFullName = `${existing.first_name || ''} ${existing.last_name || ''}`.toLowerCase().trim();
      
      return newFullName && existingFullName && newFullName === existingFullName;
    });
  };

  // Count different types of records
  const validRecords = importPreview.filter(s => s.isValid && !s.isDuplicate);
  const duplicateRecords = importPreview.filter(s => s.isDuplicate);
  const errorRecords = importPreview.filter(s => !s.isValid && !s.isDuplicate);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !importLoading) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Import Students from Excel</h2>
              <button
                onClick={() => !importLoading && onClose()}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                disabled={importLoading}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Class Selection for Admin */}
            {showClassSelection && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-amber-800 mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Select Target Class
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class/Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedClassId || ''}
                      onChange={(e) => onClassChange && onClassChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={importLoading}
                    >
                      <option value="">Select a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.grade_level} - {cls.section} ({cls.school_year})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedClass && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Grade:</span> {selectedClass.grade_level}</p>
                        <p><span className="font-medium">Section:</span> {selectedClass.section}</p>
                        <p><span className="font-medium">School Year:</span> {selectedClass.school_year}</p>
                        <p><span className="font-medium">Adviser:</span> {selectedClass.adviser_name || 'Not assigned'}</p>
                      </div>
                    </div>
                  )}
                </div>
                {showClassSelection && !selectedClassId && (
                  <p className="text-amber-700 text-sm mt-2">
                    Please select a class before uploading the Excel file.
                  </p>
                )}
              </div>
            )}
            
            {/* Existing Students Summary */}
            {existingStudents.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Duplicate Check Information
                </h3>
                <p className="text-sm text-blue-700">
                  Currently checking against <span className="font-semibold">{existingStudents.length}</span> existing students
                  {!showClassSelection && selectedClass && ` in ${selectedClass.grade_level} - ${selectedClass.section}`}.
                  Duplicates are detected by matching LRN or full name.
                </p>
              </div>
            )}
            
            {/* Instructions */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Excel Import Instructions
              </h3>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                <li>Use your existing SF1 School Register Excel file</li>
                <li>Ensure it contains columns: LRN, NAME, SEX, BIRTH DATE, ADDRESS</li>
                {showClassSelection && <li>Select the target class from the dropdown above</li>}
                <li>Upload the file using the button below</li>
                <li>Review the preview data and resolve any errors</li>
                <li>Click "Import Students" to add all valid, non-duplicate records</li>
              </ol>
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                <p className="font-medium text-orange-800 mb-1">⚠️ Duplicate Detection:</p>
                <p className="text-orange-700">
                  Students with matching LRN or identical names will be flagged as duplicates and automatically skipped during import.
                </p>
              </div>
            </div>
            
            {/* File Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
              <input
                type="file"
                id="excel-upload"
                accept=".xlsx,.xls"
                onChange={onFileChange}
                className="hidden"
                disabled={importLoading || (showClassSelection && !selectedClassId)}
              />
              <label
                htmlFor="excel-upload"
                className={`cursor-pointer flex flex-col items-center justify-center ${
                  showClassSelection && !selectedClassId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-12 w-12 text-gray-400 mb-3" />
                <span className="text-gray-700 font-medium">
                  {showClassSelection && !selectedClassId 
                    ? 'Select a class first, then click to upload Excel file'
                    : 'Click to select Excel file'
                  }
                </span>
                <span className="text-gray-500 text-sm mt-1">
                  Supported formats: .xlsx, .xls (max 10MB)
                </span>
              </label>
              {excelFile && (
                <div className="mt-4 text-left bg-gray-50 p-3 rounded flex items-center">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-gray-800 font-medium">{excelFile.name}</span>
                  <span className="ml-2 text-gray-500 text-sm">
                    ({Math.round(excelFile.size / 1024)} KB)
                  </span>
                  {!importLoading && (
                    <button
                      onClick={() => {
                        const input = document.getElementById('excel-upload');
                        input.value = '';
                        onFileChange({ target: { files: [] } });
                      }}
                      className="ml-auto text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Loading State */}
            {importLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-600">Processing Excel data and checking for duplicates...</span>
              </div>
            )}
            
            {/* Status Messages */}
            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
                <p className="font-medium flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" /> {importError}
                </p>
              </div>
            )}
            
            {importSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
                <p className="font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" /> 
                  Students imported successfully{selectedClass ? ` to ${selectedClass.grade_level} - ${selectedClass.section}` : ''}!
                  {duplicateRecords.length > 0 && (
                    <span className="ml-2 text-orange-700">
                      ({duplicateRecords.length} duplicates were automatically skipped)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Duplicate Warning */}
            {duplicateRecords.length > 0 && !importLoading && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-lg mb-4">
                <p className="font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" /> 
                  {duplicateRecords.length} duplicate student(s) detected and will be skipped
                </p>
                <p className="text-sm mt-1">
                  These students already exist in the system (matching LRN or name).
                </p>
                
                {/* Show first few duplicates */}
                {duplicateRecords.length > 0 && (
                  <div className="mt-3 bg-white border border-orange-200 rounded p-3">
                    <p className="text-sm font-medium text-orange-800 mb-2">Duplicate Students Found:</p>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {duplicateRecords.slice(0, 5).map((student, index) => {
                        const existing = getExistingStudentDetails(student);
                        return (
                          <div key={index} className="text-xs text-orange-700 flex justify-between">
                            <span>{student.first_name} {student.last_name} (LRN: {student.lrn})</span>
                            {existing && (
                              <span className="text-orange-600">
                                → Exists in: {existing.class_name || 'System'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {duplicateRecords.length > 5 && (
                        <div className="text-xs text-orange-600 font-medium">
                          ... and {duplicateRecords.length - 5} more duplicates
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Data Preview Table */}
            {!importLoading && importPreview.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-800">Data Preview</h3>
                  {selectedClass && showClassSelection && (
                    <div className="text-sm text-blue-700 bg-blue-50 px-3 py-1 rounded">
                      Target: {selectedClass.grade_level} - {selectedClass.section}
                    </div>
                  )}
                </div>
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-800">{importPreview.length}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-green-700">Valid</p>
                    <p className="text-xl font-bold text-green-800">{validRecords.length}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-orange-700">Duplicates</p>
                    <p className="text-xl font-bold text-orange-800">{duplicateRecords.length}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-red-700">Errors</p>
                    <p className="text-xl font-bold text-red-800">{errorRecords.length}</p>
                  </div>
                </div>
                
                {/* Data Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LRN</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importPreview.map((student, index) => {
                          const existingStudent = student.isDuplicate ? getExistingStudentDetails(student) : null;
                          
                          return (
                            <tr key={index} className={
                              student.isDuplicate ? "bg-orange-50" : 
                              !student.isValid ? "bg-red-50" : 
                              "hover:bg-gray-50"
                            }>
                              <td className="px-3 py-2 text-sm text-gray-600">{student.rowNumber}</td>
                              <td className="px-3 py-2">
                                {student.isDuplicate ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Duplicate
                                  </span>
                                ) : student.isValid ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Valid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <X className="h-3 w-3 mr-1" /> Error
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-800 font-mono">{student.lrn}</td>
                              <td className="px-3 py-2 text-sm text-gray-800">
                                <div>
                                  <div className="font-medium">{student.first_name} {student.last_name}</div>
                                  {student.middle_name && (
                                    <div className="text-xs text-gray-500">{student.middle_name}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600">{student.sex}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{student.age}</td>
                              <td className="px-3 py-2 text-sm">
                                {student.isDuplicate && existingStudent && (
                                  <div className="text-xs text-orange-700 space-y-1">
                                    <div className="font-medium">Duplicate found:</div>
                                    <div>• Class: {existingStudent.class_name || 'N/A'}</div>
                                    <div>• LRN: {existingStudent.lrn}</div>
                                  </div>
                                )}
                                {!student.isValid && !student.isDuplicate && student.errors && (
                                  <div className="text-xs text-red-700">
                                    <div className="font-medium">Validation errors:</div>
                                    <ul className="list-disc list-inside mt-1">
                                      {student.errors.map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {student.isValid && !student.isDuplicate && (
                                  <div className="text-xs text-green-700">
                                    Ready to import
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={importLoading}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={onImportSubmit}
                className={`px-6 py-2 ${
                  importSuccess 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
                disabled={
                  importLoading || 
                  importSuccess || 
                  importPreview.length === 0 || 
                  validRecords.length === 0 ||
                  (showClassSelection && !selectedClassId)
                }
              >
                {importLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Importing...
                  </>
                ) : importSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import Complete
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {validRecords.length} Student{validRecords.length !== 1 ? 's' : ''}
                    {duplicateRecords.length > 0 && (
                      <span className="ml-1 text-blue-200">
                        (Skip {duplicateRecords.length} duplicate{duplicateRecords.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExcelImportModal;