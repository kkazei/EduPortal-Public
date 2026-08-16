const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

export const getOfficialStudentName = ({ currentStudent, user, fallback = 'Student' } = {}) => {
  const officialName = [
    cleanText(currentStudent?.first_name),
    cleanText(currentStudent?.middle_name),
    cleanText(currentStudent?.last_name),
  ].filter(Boolean).join(' ');

  return officialName || cleanText(user?.user_fullname) || fallback;
};

export const getStudentDisplayName = ({ currentStudent, user, fallback = 'Student' } = {}) => (
  cleanText(user?.student_display_name)
  || cleanText(currentStudent?.user?.student_display_name)
  || getOfficialStudentName({ currentStudent, user, fallback })
);

export const getStudentGreetingName = ({ currentStudent, user, fallback = 'Student' } = {}) => (
  cleanText(user?.student_display_name)
  || cleanText(currentStudent?.user?.student_display_name)
  || cleanText(currentStudent?.first_name)
  || cleanText(user?.user_fullname).split(/\s+/)[0]
  || fallback
);

export const getStudentInitial = ({ currentStudent, user, fallback = 'S' } = {}) => (
  getStudentGreetingName({ currentStudent, user, fallback }).charAt(0).toUpperCase()
);
