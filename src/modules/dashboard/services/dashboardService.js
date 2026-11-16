// const Student = require('../../students/models/Student');
// const Enquiry = require('../../enquiries/models/Enquiry');
// const StudentFee = require('../../fees/models/StudentFee');
// const Payment = require('../../fees/models/Payment');
// const User = require('../../auth/models/User');
// const Course = require('../../courses/models/Course');
// const ClassSchedule = require('../../classschedules/models/ClassSchedule');
// const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// // --- LIBRARY ---
// const Book = require('../../library/models/Book');
// const BookIssue = require('../../library/models/BookIssue');

// // --- SAFE IMPORTS (Prevent 500 crash if models are named differently) ---
// let Exam, ExamForm, Notice, Test;
// try { Exam = require('../../exams/models/Exam'); } catch (e) { console.warn('Exam model missing'); }
// try { ExamForm = require('../../exams/models/ExamForm'); } catch (e) { console.warn('ExamForm model missing'); }
// try { Notice = require('../../notices/models/Notice'); } catch (e) { console.warn('Notice model missing'); }
// try { Test = require('../../classtests/models/ClassTest'); } catch (e) { console.warn('Test model missing'); }

// const getStartOfDay = (date = new Date()) => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// };

// // ==========================================================
// // 1. MAIN SUMMARY (Role-aware & Matches Frontend UI)
// // ==========================================================
// exports.getSummary = async (user) => {
//   const today = new Date();
//   const todayStart = getStartOfDay(today);

//   // --- ADMIN / STAFF DASHBOARD ---
//   if (user.role === 'super_admin' || user.role === 'office_staff') {
    
//     // We run these queries in parallel
//     const [
//       totalUsers, activeUsers, rolesCount,
//       totalStudents, totalCourses, newEnquiries, convertedEnquiries,
//       feesData, studentsWithDues,
//       bookTitles, issuedNow, overdueBooks,
//       recentCourses, upcomingClasses
//     ] = await Promise.all([
//       // Top Stats
//       User.countDocuments(),
//       User.countDocuments({ is_active: true }),
//       User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      
//       Student.countDocuments({ status: 'active' }),
//       Course.countDocuments({ status: 'active' }),
//       Enquiry.countDocuments({ status: 'new' }),
//       Enquiry.countDocuments({ status: 'converted' }),

//       // Fees
//       StudentFee.aggregate([
//         { $group: { _id: null, totalDue: { $sum: '$amount_due' }, totalPaid: { $sum: '$amount_paid' } } }
//       ]),
//       StudentFee.distinct('student_id', { status: { $in: ['pending', 'partial'] } }),

//       // Library
//       Book.countDocuments(),
//       BookIssue.countDocuments({ status: 'issued' }),
//       BookIssue.countDocuments({ status: 'issued', dueDate: { $lt: today } }),

//       // Bottom Lists
//       Course.find().sort({ createdAt: -1 }).limit(3).select('name duration').lean(),
//        ClassSchedule.find({ date: { $gte: todayStart }, status: 'scheduled' })
//         .sort({ start_time: 1 }).limit(3).lean(),
//     ]);

//     // Safely fetch optional lists
//     let upcomingTests = [];
//     let recentNotices = [];

//     if (Test) {
//       try { upcomingTests = await Test.find().sort({ test_date: 1 }).limit(3).select('title test_date').lean(); } catch(e){}
//     }
//     if (Notice) {
//       try { recentNotices = await Notice.find({ status: 'published' }).sort({ createdAt: -1 }).limit(3).select('title').lean(); } catch(e){}
//     }

//     const fees = feesData[0] || { totalDue: 0, totalPaid: 0 };
//     const outstandingFees = fees.totalDue - fees.totalPaid;

//     // Format roles array for UI
//     const usersByRole = { student: 0, faculty: 0, office_staff: 0, super_admin: 0 };
//     rolesCount.forEach(r => { if (usersByRole[r._id] !== undefined) usersByRole[r._id] = r.count; });

//     return {
//       role: user.role,
//       topStats: {
//         totalUsers, activeUsers, totalStudents, totalCourses,
//         newEnquiries, convertedEnquiries,
//         facultyCount: usersByRole.faculty,
//         studentsWithDuesCount: studentsWithDues.length,
//         outstandingFees: outstandingFees > 0 ? outstandingFees : 0,
//         bookTitles, issuedNow, overdueBooks
//       },
//       usersByRole,
//      lists: {
//         recentCourses,
//         upcomingClasses, // Just pass the array directly!
//         upcomingTests,
//         recentNotices
//       }
//     };
//   }

//   // --- FACULTY DASHBOARD ---
//   if (user.role === 'faculty') {
//     const assignments = await FacultyAssignment.find({ faculty_id: user.id }).select('batch_id');
//     const assignedBatchIds = assignments.map((a) => a.batch_id);

//     const [myStudentsCount, todaySchedules, myPendingTests] = await Promise.all([
//       Student.countDocuments({ batch_id: { $in: assignedBatchIds }, status: 'active' }),
//       ClassSchedule.find({ faculty_id: user.id, date: { $gte: todayStart }, status: 'scheduled' })
//         .sort({ start_time: 1 }).populate('subject', 'name').lean(),
//       Exam ? Exam.countDocuments({ faculty_id: user.id, result_status: 'draft' }) : 0
//     ]);

//     return {
//       role: user.role,
//       topStats: { myStudentsCount, todaySchedulesCount: todaySchedules.length, myPendingResults: myPendingTests },
//       lists: { todaySchedules }
//     };
//   }
// };

// // ==========================================================
// // 2. COURSE-WISE STUDENT COUNTS
// // ==========================================================
// exports.getCourseWiseStudents = async () => {
//   return await Student.aggregate([
//     { $match: { status: 'active' } },
//     { $group: { _id: '$course_id', count: { $sum: 1 } } },
//     { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'course' } },
//     { $unwind: '$course' },
//     { $project: { _id: 1, courseName: '$course.name', count: 1 } },
//     { $sort: { count: -1 } },
//   ]);
// };

// // ==========================================================
// // 3. FEE COLLECTION TREND
// // ==========================================================
// exports.getFeesTrend = async () => {
//   const sixMonthsAgo = new Date();
//   sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

//   return await Payment.aggregate([
//     { $match: { status: 'active', payment_date: { $gte: sixMonthsAgo } } },
//     { $group: { _id: { month: { $month: '$payment_date' }, year: { $year: '$payment_date' } }, totalCollected: { $sum: '$amount' } } },
//     { $sort: { '_id.year': 1, '_id.month': 1 } },
//   ]);
// };

// // ==========================================================
// // 4. RECENT ACTIVITY (Enquiries & Blocked Forms)
// // ==========================================================
// exports.getRecentActivity = async () => {
//   try {
//     const [recentEnquiries, blockedForms] = await Promise.all([
//       Enquiry.find()
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .select('name phone course_interest_id status createdAt')
//         .populate('course_interest_id', 'name')
//         .lean(),

//       ExamForm ? ExamForm.find({ status: 'blocked' })
//         .sort({ createdAt: -1 })
//         .limit(5)
//         .populate('student_id', 'full_name student_id')
//         .populate('exam_id', 'title')
//         .lean() : []
//     ]);

//     return {
//       recentEnquiries,
//       blockedForms,
//     };
//   } catch (error) {
//     console.error("Dashboard Recent Activity Error:", error);
//     return { recentEnquiries: [], blockedForms: [] }; 
//   }
// };
const mongoose = require('mongoose');

// --- CORE MODELS ---
const Student = require('../../students/models/Student');
const Enquiry = require('../../enquiries/models/Enquiry');
const StudentFee = require('../../fees/models/StudentFee');
const Payment = require('../../fees/models/Payment');
const User = require('../../auth/models/User');
const Role = require('../../rbac/models/Role'); // <-- ADDED FOR ACCURATE ROLE COUNTS
const Course = require('../../courses/models/Course');
const ClassSchedule = require('../../classschedules/models/ClassSchedule');
const FacultyAssignment = require('../../faculty/models/FacultyAssignment');

// --- LIBRARY MODELS ---
const Book = require('../../library/models/Book');
const BookIssue = require('../../library/models/BookIssue');

// --- SAFE IMPORTS (Prevent 500 crash if models are named differently or missing) ---
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
// 1. MAIN SUMMARY (Role-aware & Fixed Calculations)
// ==========================================================
exports.getSummary = async (user) => {
  const today = new Date();
  const todayStart = getStartOfDay(today);

  // --- ADMIN / STAFF DASHBOARD ---
  if (user.role === 'super_admin' || user.role === 'office_staff') {
    
    // 1. Fetch Role IDs to do accurate counting
    const roles = await Role.find({ name: { $in: ['student', 'faculty'] } }).lean();
    const studentRoleId = roles.find(r => r.name === 'student')?._id;
    const facultyRoleId = roles.find(r => r.name === 'faculty')?._id;

    // 2. Run all queries in parallel
    const [
      totalUsers, activeUsers, 
      roleCounts, 
      totalStudentProfiles, 
      totalFacultyUsers,
      totalCourses, newEnquiries, convertedEnquiries,
      collectedFeesData, pendingFeesData, studentsWithDues,
      bookTitles, issuedNow, overdueBooks,
      recentCourses, upcomingClasses
    ] = await Promise.all([
      // Top Stats
      User.countDocuments(),
      User.countDocuments({ is_active: true }),
      
      // Role Breakdown (for the tabs in UI)
      User.aggregate([
        { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'roleDoc' } },
        { $unwind: '$roleDoc' },
        { $group: { _id: '$roleDoc.name', count: { $sum: 1 } } }
      ]),
      
      // FIXED COUNTS
      Student.countDocuments({ status: 'active' }), // Actual Student Profiles
      facultyRoleId ? User.countDocuments({ role: facultyRoleId, is_active: true }) : 0, // Actual Faculty Logins
      
      Course.countDocuments({ status: 'active' }),
      Enquiry.countDocuments({ status: 'new' }),
      Enquiry.countDocuments({ status: 'converted' }),

      // Fees
      Payment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalCollected: { $sum: '$amount' } } }
      ]),
      StudentFee.aggregate([
        { $match: { status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, totalPending: { $sum: { $subtract: ['$amount_due', '$amount_paid'] } } } }
      ]),
      StudentFee.distinct('student_id', { status: { $in: ['pending', 'partial'] } }),

      // Library
      Book.countDocuments(),
      BookIssue.countDocuments({ status: 'issued' }),
      BookIssue.countDocuments({ status: 'issued', dueDate: { $lt: today } }),

      // Bottom Lists
      Course.find().sort({ createdAt: -1 }).limit(3).select('name duration').lean(),
      ClassSchedule.find({ date: { $gte: todayStart }, status: 'scheduled' })
        .sort({ start_time: 1 }).limit(3).lean(),
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

    // Extract Results
    const totalCollected = collectedFeesData[0]?.totalCollected || 0;
    const outstandingFees = pendingFeesData[0]?.totalPending || 0;

    // Format roles array for UI tabs
    const usersByRole = { student: 0, faculty: 0, office_staff: 0, super_admin: 0, librarian: 0 };
    roleCounts.forEach(r => { 
      if (usersByRole[r._id] !== undefined) {
        usersByRole[r._id] = r.count; 
      }
    });

    return {
      role: user.role,
      topStats: {
        totalUsers, 
        activeUsers, 
        totalStudents: totalStudentProfiles, // Now correctly shows 9 (or active profile count)
        totalCourses,
        newEnquiries, 
        convertedEnquiries,
        facultyCount: totalFacultyUsers, // Now correctly shows 4
        studentsWithDuesCount: studentsWithDues.length,
        outstandingFees: outstandingFees, 
        feesCollected: totalCollected,    
        bookTitles, issuedNow, overdueBooks
      },
      usersByRole,
      lists: {
        recentCourses,
        upcomingClasses,
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
        .sort({ start_time: 1 }).lean(),
      Exam ? Exam.countDocuments({ faculty_id: user.id, result_status: 'draft' }) : 0
    ]);

    return {
      role: user.role,
      topStats: { 
        myStudentsCount, 
        todaySchedulesCount: todaySchedules.length, 
        myPendingResults: myPendingTests 
      },
      lists: { todaySchedules }
    };
  }

  return { role: user.role, topStats: {}, lists: {} };
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
    { 
      $group: { 
        _id: { month: { $month: '$payment_date' }, year: { $year: '$payment_date' } }, 
        totalCollected: { $sum: '$amount' } 
      } 
    },
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