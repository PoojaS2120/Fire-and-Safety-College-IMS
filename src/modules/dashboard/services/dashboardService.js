// const mongoose = require('mongoose');

// const Student = require('../../students/models/Student');
// const Enquiry = require('../../enquiries/models/Enquiry');
// const StudentFee = require('../../fees/models/StudentFee');
// const Payment = require('../../fees/models/Payment');
// const Exam = require('../../exams/models/Exam');
// const ExamForm = require('../../exams/models/ExamForm');
// const BookIssue = require('../../library/models/BookIssue');
// const ClassSchedule = require('../../classschedules/models/ClassSchedule');
// const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// const getStartOfDay = (date = new Date()) => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// };

// const getEndOfDay = (date = new Date()) => {
//   const d = new Date(date);
//   d.setHours(23, 59, 59, 999);
//   return d;
// };

// // ==========================================================
// // 1. MAIN SUMMARY (Role-aware)
// // ==========================================================
// exports.getSummary = async (user) => {
//   const today = new Date();
//   const todayStart = getStartOfDay(today);
//   const todayEnd = getEndOfDay(today);

//   // --- SUPER ADMIN / OFFICE STAFF SUMMARY ---
//   if (user.role === 'super_admin' || user.role === 'office_staff') {
//     const [
//       totalStudents,
//       newEnquiries,
//       feesData,
//       blockedExamForms,
//       todaySchedules,
//       overdueBooks,
//     ] = await Promise.all([
//       Student.countDocuments({ status: 'active' }),
//       Enquiry.countDocuments({ status: 'new' }),
      
//       // Calculate Total Collected & Pending Fees
//       StudentFee.aggregate([
//         {
//           $group: {
//             _id: null,
//             totalDue: { $sum: '$amount_due' },
//             totalPaid: { $sum: '$amount_paid' },
//           },
//         },
//       ]),

//       ExamForm.countDocuments({ status: 'blocked' }),
      
//       ClassSchedule.countDocuments({
//         date: { $gte: todayStart, $lte: todayEnd },
//         status: 'scheduled',
//       }),

//       BookIssue.countDocuments({
//         status: 'issued',
//         dueDate: { $lt: today },
//       }),
//     ]);

//     const fees = feesData[0] || { totalDue: 0, totalPaid: 0 };
//     const pendingFeesAmount = fees.totalDue - fees.totalPaid;

//     return {
//       role: user.role,
//       stats: {
//         totalStudents,
//         newEnquiries,
//         feesCollected: fees.totalPaid,
//         feesPending: pendingFeesAmount > 0 ? pendingFeesAmount : 0,
//         blockedExamForms,
//         todaySchedules,
//         overdueBooks,
//       },
//     };
//   }

//   // --- FACULTY SUMMARY ---
//   if (user.role === 'faculty') {
//     // Find which batches the faculty is assigned to
//     const assignments = await FacultyAssignment.find({ faculty_id: user.id }).select('batch_id');
//     const assignedBatchIds = assignments.map((a) => a.batch_id);

//     const [
//       myStudentsCount,
//       todaySchedules,
//       myPendingTests,
//     ] = await Promise.all([
//       Student.countDocuments({ 
//         batch_id: { $in: assignedBatchIds }, 
//         status: 'active' 
//       }),
//       ClassSchedule.find({
//         faculty_id: user.id,
//         date: { $gte: todayStart, $lte: todayEnd },
//         status: 'scheduled',
//       }).sort({ start_time: 1 }).lean(),
      
//       // Placeholder: Could count exams without marks entered
//       Exam.countDocuments({ 
//         faculty_id: user.id, 
//         result_status: 'draft' 
//       })
//     ]);

//     return {
//       role: user.role,
//       stats: {
//         myStudentsCount,
//         todaySchedulesCount: todaySchedules.length,
//         myPendingResults: myPendingTests,
//       },
//       todaySchedules, // Return actual list of today's classes for faculty
//     };
//   }

//   // --- LIBRARIAN SUMMARY ---
//   if (user.role === 'librarian') {
//     const [
//       totalBooksIssued,
//       overdueBooks,
//     ] = await Promise.all([
//       BookIssue.countDocuments({ status: 'issued' }),
//       BookIssue.countDocuments({ status: 'issued', dueDate: { $lt: today } }),
//     ]);

//     return {
//       role: user.role,
//       stats: {
//         currentlyIssued: totalBooksIssued,
//         overdueBooks,
//       },
//     };
//   }

//   return { role: user.role, stats: {} };
// };

// // ==========================================================
// // 2. COURSE-WISE STUDENT COUNTS
// // ==========================================================
// exports.getCourseWiseStudents = async () => {
//   return await Student.aggregate([
//     { $match: { status: 'active' } },
//     {
//       $group: {
//         _id: '$course_id',
//         count: { $sum: 1 },
//       },
//     },
//     {
//       $lookup: {
//         from: 'courses',
//         localField: '_id',
//         foreignField: '_id',
//         as: 'course',
//       },
//     },
//     { $unwind: '$course' },
//     {
//       $project: {
//         _id: 1,
//         courseName: '$course.name',
//         count: 1,
//       },
//     },
//     { $sort: { count: -1 } },
//   ]);
// };

// // ==========================================================
// // 3. FEE COLLECTION TREND (Last 6 Months)
// // ==========================================================
// exports.getFeesTrend = async () => {
//   const sixMonthsAgo = new Date();
//   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

//   return await Payment.aggregate([
//     {
//       $match: {
//         status: 'active',
//         payment_date: { $gte: sixMonthsAgo },
//       },
//     },
//     {
//       $group: {
//         _id: {
//           month: { $month: '$payment_date' },
//           year: { $year: '$payment_date' },
//         },
//         totalCollected: { $sum: '$amount' },
//       },
//     },
//     { $sort: { '_id.year': 1, '_id.month': 1 } },
//   ]);
// };

// // ==========================================================
// // 4. RECENT ACTIVITY (Enquiries & Blocked Forms)
// // ==========================================================
// exports.getRecentActivity = async () => {
//   const [recentEnquiries, blockedForms] = await Promise.all([
//     Enquiry.find()
//       .sort({ createdAt: -1 })
//       .limit(5)
//       .select('name phone course_interest_id status createdAt')
//       .populate('course_interest_id', 'name')
//       .lean(),

//     ExamForm.find({ status: 'blocked' })
//       .sort({ createdAt: -1 })
//       .limit(5)
//       .populate('student_id', 'full_name student_id')
//       .populate('exam_id', 'title')
//       .lean(),
//   ]);

//   return {
//     recentEnquiries,
//     blockedForms,
//   };
// };
const Student = require('../../students/models/Student');
const Enquiry = require('../../enquiries/models/Enquiry');
const StudentFee = require('../../fees/models/StudentFee');
const Payment = require('../../fees/models/Payment');
const User = require('../../auth/models/User');
const Course = require('../../courses/models/Course');
const ClassSchedule = require('../../classschedules/models/ClassSchedule');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// --- LIBRARY ---
const Book = require('../../library/models/Book');
const BookIssue = require('../../library/models/BookIssue');

// --- SAFE IMPORTS (Prevent 500 crash if models are named differently) ---
let Exam, ExamForm, Notice, Test;
try { Exam = require('../../exams/models/Exam'); } catch (e) { console.warn('Exam model missing'); }
try { ExamForm = require('../../exams/models/ExamForm'); } catch (e) { console.warn('ExamForm model missing'); }
try { Notice = require('../../notices/models/Notice'); } catch (e) { console.warn('Notice model missing'); }
try { Test = require('../../classtests/models/ClassTest'); } catch (e) { console.warn('Test model missing'); }

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ==========================================================
// 1. MAIN SUMMARY (Role-aware & Matches Frontend UI)
// ==========================================================
exports.getSummary = async (user) => {
  const today = new Date();
  const todayStart = getStartOfDay(today);

  // --- ADMIN / STAFF DASHBOARD ---
  if (user.role === 'super_admin' || user.role === 'office_staff') {
    
    // We run these queries in parallel
    const [
      totalUsers, activeUsers, rolesCount,
      totalStudents, totalCourses, newEnquiries, convertedEnquiries,
      feesData, studentsWithDues,
      bookTitles, issuedNow, overdueBooks,
      recentCourses, upcomingClasses
    ] = await Promise.all([
      // Top Stats
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      
      Student.countDocuments({ status: 'active' }),
      Course.countDocuments({ status: 'active' }),
      Enquiry.countDocuments({ status: 'new' }),
      Enquiry.countDocuments({ status: 'converted' }),

      // Fees
      StudentFee.aggregate([
        { $group: { _id: null, totalDue: { $sum: '$amount_due' }, totalPaid: { $sum: '$amount_paid' } } }
      ]),
      StudentFee.distinct('student_id', { status: { $in: ['pending', 'partial'] } }),

      // Library
      Book.countDocuments(),
      BookIssue.countDocuments({ status: 'issued' }),
      BookIssue.countDocuments({ status: 'issued', dueDate: { $lt: today } }),

      // Bottom Lists
      Course.find().sort({ createdAt: -1 }).limit(3).select('name duration').lean(),
      ClassSchedule.find({ date: { $gte: todayStart }, status: 'scheduled' })
        .sort({ start_time: 1 }).limit(3).populate('subject', 'name').lean()
    ]);

    // Safely fetch optional lists
    let upcomingTests = [];
    let recentNotices = [];

    if (Test) {
      try { upcomingTests = await Test.find().sort({ test_date: 1 }).limit(3).select('title test_date').lean(); } catch(e){}
    }
    if (Notice) {
      try { recentNotices = await Notice.find({ status: 'published' }).sort({ createdAt: -1 }).limit(3).select('title').lean(); } catch(e){}
    }

    const fees = feesData[0] || { totalDue: 0, totalPaid: 0 };
    const outstandingFees = fees.totalDue - fees.totalPaid;

    // Format roles array for UI
    const usersByRole = { student: 0, faculty: 0, office_staff: 0, super_admin: 0 };
    rolesCount.forEach(r => { if (usersByRole[r._id] !== undefined) usersByRole[r._id] = r.count; });

    return {
      role: user.role,
      topStats: {
        totalUsers, activeUsers, totalStudents, totalCourses,
        newEnquiries, convertedEnquiries,
        facultyCount: usersByRole.faculty,
        studentsWithDuesCount: studentsWithDues.length,
        outstandingFees: outstandingFees > 0 ? outstandingFees : 0,
        bookTitles, issuedNow, overdueBooks
      },
      usersByRole,
      lists: {
        recentCourses,
        upcomingClasses: upcomingClasses.map(c => ({ ...c, subject: c.subject?.name || 'Unknown' })),
        upcomingTests,
        recentNotices
      }
    };
  }

  // --- FACULTY DASHBOARD ---
  if (user.role === 'faculty') {
    const assignments = await FacultyAssignment.find({ faculty_id: user.id }).select('batch_id');
    const assignedBatchIds = assignments.map((a) => a.batch_id);

    const [myStudentsCount, todaySchedules, myPendingTests] = await Promise.all([
      Student.countDocuments({ batch_id: { $in: assignedBatchIds }, status: 'active' }),
      ClassSchedule.find({ faculty_id: user.id, date: { $gte: todayStart }, status: 'scheduled' })
        .sort({ start_time: 1 }).populate('subject', 'name').lean(),
      Exam ? Exam.countDocuments({ faculty_id: user.id, result_status: 'draft' }) : 0
    ]);

    return {
      role: user.role,
      topStats: { myStudentsCount, todaySchedulesCount: todaySchedules.length, myPendingResults: myPendingTests },
      lists: { todaySchedules }
    };
  }
};

// ==========================================================
// 2. COURSE-WISE STUDENT COUNTS
// ==========================================================
exports.getCourseWiseStudents = async () => {
  return await Student.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$course_id', count: { $sum: 1 } } },
    { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
    { $unwind: '$course' },
    { $project: { _id: 1, courseName: '$course.name', count: 1 } },
    { $sort: { count: -1 } },
  ]);
};

// ==========================================================
// 3. FEE COLLECTION TREND
// ==========================================================
exports.getFeesTrend = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return await Payment.aggregate([
    { $match: { status: 'active', payment_date: { $gte: sixMonthsAgo } } },
    { $group: { _id: { month: { $month: '$payment_date' }, year: { $year: '$payment_date' } }, totalCollected: { $sum: '$amount' } } },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
};

// ==========================================================
// 4. RECENT ACTIVITY (Enquiries & Blocked Forms)
// ==========================================================
exports.getRecentActivity = async () => {
  try {
    const [recentEnquiries, blockedForms] = await Promise.all([
      Enquiry.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name phone course_interest_id status createdAt')
        .populate('course_interest_id', 'name')
        .lean(),

      ExamForm ? ExamForm.find({ status: 'blocked' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('student_id', 'full_name student_id')
        .populate('exam_id', 'title')
        .lean() : []
    ]);

    return {
      recentEnquiries,
      blockedForms,
    };
  } catch (error) {
    console.error("Dashboard Recent Activity Error:", error);
    return { recentEnquiries: [], blockedForms: [] }; 
  }
};