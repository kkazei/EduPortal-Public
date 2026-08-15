import { X } from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-gray-700">
          <p className="text-sm text-gray-600">
            <strong>Last Updated:</strong> November 28, 2025
          </p>

          <p className="leading-relaxed">
            Tapinac Special Science Elementary School ("we", "our", "us") operates this Student Records Management System to support the processing of student information and school-related data. We are committed to protecting your privacy and complying with the Data Privacy Act of 2012.
          </p>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h3>
            <p className="leading-relaxed mb-2">We collect the following information to provide school services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Student details (name, grade level, section, LRN)</li>
              <li>Academic records (grades, attendance, report cards)</li>
              <li>Parent/guardian information (name and contact details)</li>
              <li>User account information (username, password)</li>
              <li>System data such as access logs, browser/device information, and timestamps</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h3>
            <p className="leading-relaxed mb-2">We use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Maintain accurate student records</li>
              <li>Generate and manage grades and report cards</li>
              <li>Allow teachers and parents to access academic information</li>
              <li>Communicate school announcements</li>
              <li>Ensure system security and proper account management</li>
              <li>Comply with DepEd and legal requirements</li>
            </ul>
            <p className="leading-relaxed mt-3">
              We do not sell or use your data for advertising or marketing.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Sharing</h3>
            <p className="leading-relaxed mb-2">We may share data only when:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Required by DepEd or government authorities</li>
              <li>Necessary for school operations</li>
              <li>Authorized by the parent/guardian</li>
              <li>Required by law</li>
            </ul>
            <p className="leading-relaxed mt-3">
              We do not disclose personal data to unauthorized individuals or third-party companies.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Protection</h3>
            <p className="leading-relaxed mb-2">We implement reasonable security measures to protect personal data, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Password-protected accounts</li>
              <li>Restricted access for authorized personnel only</li>
              <li>Encryption and secure data storage</li>
              <li>Regular monitoring and safeguarding procedures</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h3>
            <p className="leading-relaxed">
              Personal data is kept only for as long as needed for educational and administrative purposes. When no longer required, data will be securely archived or deleted.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h3>
            <p className="leading-relaxed mb-2">Parents/guardians and students have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access their personal data</li>
              <li>Request corrections to inaccurate information</li>
              <li>Request deletion or restriction of data (subject to school and DepEd policies)</li>
              <li>Be informed about how their data is collected and used</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h3>
            <p className="leading-relaxed mb-3">
              For any privacy concerns or requests, you may contact:
            </p>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold">Tapinac Special Science Elementary School</p>
              <p className="mt-1">Tapinac, III, Olongapo City</p>
              <p>School ID: 107141</p>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Changes to This Policy</h3>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
