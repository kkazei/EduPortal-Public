import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Award, BookOpen, FileText, Loader, TrendingUp } from 'lucide-react';
import { useGradeStore } from '../../store/gradeStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';

const formatGrade = (grade) => {
  const numericGrade = parseFloat(grade);
  return Number.isFinite(numericGrade) ? Math.round(numericGrade).toString() : '--';
};

const getRemarks = (grade) => {
  const numericGrade = parseFloat(grade);
  if (!Number.isFinite(numericGrade)) return 'Pending';
  return numericGrade >= 75 ? 'Passed' : 'Needs Support';
};

const getGradeTone = (grade) => {
  const numericGrade = parseFloat(grade);
  if (!Number.isFinite(numericGrade)) return 'bg-slate-100 text-slate-500';
  if (numericGrade >= 90) return 'bg-blue-100 text-blue-700';
  if (numericGrade >= 75) return 'bg-emerald-100 text-emerald-700';
  return 'bg-rose-100 text-rose-700';
};

const computeQuarterlyAverages = (subjects = []) => {
  const keys = ['q1_grade', 'q2_grade', 'q3_grade', 'q4_grade'];

  return keys.map((key) => {
    let sum = 0;
    let count = 0;

    subjects.forEach((subject) => {
      const value = parseFloat(subject[key]);
      if (Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    });

    return count > 0 ? sum / count : null;
  });
};

const StudentReportCardPreview = ({ currentStudent, onViewFull }) => {
  const { getStudentCard } = useGradeStore();
  const selectedYear = useSchoolYearStore((s) => s.selected);
  const years = useSchoolYearStore((s) => s.years);
  const fetchYears = useSchoolYearStore((s) => s.fetchYears);
  const selectYear = useSchoolYearStore((s) => s.selectYear);
  const [reportCard, setReportCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schoolYear, setSchoolYear] = useState(selectedYear || currentStudent?.school_year || '');

  useEffect(() => {
    if (!years || years.length === 0) {
      fetchYears?.();
    }
  }, [fetchYears, years]);

  useEffect(() => {
    if (selectedYear && selectedYear !== schoolYear) {
      setSchoolYear(selectedYear);
    }
  }, [selectedYear, schoolYear]);

  useEffect(() => {
    const loadReportPreview = async () => {
      if (!currentStudent?.id) return;

      setIsLoading(true);
      try {
        const data = await getStudentCard(currentStudent.id, schoolYear || null);
        setReportCard(data);
      } catch (error) {
        console.error('Failed to load report card preview:', error);
        setReportCard(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadReportPreview();
  }, [currentStudent?.id, getStudentCard, schoolYear]);

  const subjects = reportCard?.subjects || [];
  const quarterlyAverages = useMemo(() => {
    const fromReport = reportCard?.quarterlyAverages;
    if (fromReport) {
      return [
        fromReport.q1_average,
        fromReport.q2_average,
        fromReport.q3_average,
        fromReport.q4_average
      ];
    }
    return computeQuarterlyAverages(subjects);
  }, [reportCard, subjects]);

  const finalAverage = reportCard?.quarterlyAverages?.final_average
    || (() => {
      const gradedSubjects = subjects.filter((subject) => Number.isFinite(parseFloat(subject.final_grade)));
      if (gradedSubjects.length === 0) return null;
      const total = gradedSubjects.reduce((sum, subject) => sum + parseFloat(subject.final_grade), 0);
      return total / gradedSubjects.length;
    })();

  const gradedSubjectsCount = subjects.filter((subject) => Number.isFinite(parseFloat(subject.final_grade))).length;
  const topSubjects = subjects.slice(0, 5);
  const schoolYearOptions = years && years.length > 0 ? years.map((year) => year.name) : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-900/5"
    >
      <div className="relative bg-blue-700 p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-50 ring-1 ring-white/20">
              <FileText className="h-3.5 w-3.5" />
              Report Card Preview
            </div>
            <h2 className="text-2xl font-bold tracking-normal sm:text-3xl">
              {formatGrade(finalAverage)}
            </h2>
            <p className="mt-1 text-sm text-blue-100">
              General average for {schoolYear || selectedYear || 'selected school year'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {schoolYearOptions.length > 0 && (
              <select
                value={schoolYear}
                onChange={(event) => {
                  setSchoolYear(event.target.value);
                  selectYear?.(event.target.value);
                }}
                className="h-10 rounded-xl border border-white/25 bg-white/15 px-3 text-sm font-medium text-white shadow-sm backdrop-blur-sm focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 year-select-inverted"
              >
                {schoolYearOptions.map((name) => (
                  <option key={name} value={name}>
                    SY {name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onViewFull}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-950/20 transition hover:bg-blue-50"
            >
              Report Card
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-blue-50/70 text-blue-700">
            <Loader className="mb-3 h-8 w-8 animate-spin" />
            <span className="text-sm font-semibold">Loading report card preview...</span>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {quarterlyAverages.map((average, index) => (
                <div key={index} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Quarter {index + 1}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatGrade(average)}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Subjects Graded</p>
                  <p className="text-lg font-bold text-slate-900">{gradedSubjectsCount}/{subjects.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remarks</p>
                  <p className="text-lg font-bold text-slate-900">{getRemarks(finalAverage)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Latest Status</p>
                  <p className="text-lg font-bold text-slate-900">{subjects.length ? 'Updated' : 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-900">Learning Areas</h3>
                <span className="text-xs font-medium text-slate-500">Final Grade</span>
              </div>

              <div className="divide-y divide-slate-100">
                {topSubjects.length > 0 ? (
                  topSubjects.map((subject) => (
                    <div key={subject.subject_id || subject.subject_name} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                        {subject.subject_name}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${getGradeTone(subject.final_grade)}`}>
                        {formatGrade(subject.final_grade)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No report card grades are available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default StudentReportCardPreview;
