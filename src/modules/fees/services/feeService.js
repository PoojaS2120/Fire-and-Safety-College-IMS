// const mongoose = require('mongoose');
// const Student = require('../../students/models/Student');
// const PaymentAllocation = require('../models/PaymentAllocation');
// const auditService = require('../../audit/services/auditService');
// const StudentFee = require('../models/StudentFee');
// const FeeComponent = require('../../courses/models/FeeComponent');
// const Payment = require('../models/Payment');
// const Sequence = require('../../courses/models/Sequence');
// const PDFDocument = require('pdfkit');

// // ================= 1. FEE LEDGER =================

// exports.generateFeeLedger = async (studentId, courseId) => {
//   const components = await FeeComponent.find({
//     course_id: courseId,
//     status: 'active'
//   });

//   if (components.length === 0) {
//     throw {
//       statusCode: 400,
//       message: 'No active fee components found for this course'
//     };
//   }

//   const existingFees = await StudentFee.find({
//     student_id: studentId,
//     course_id: courseId
//   }).select('fee_component_id');

//   const existingComponentIds = new Set(
//     existingFees.map(fee => fee.fee_component_id.toString())
//   );

//   const newEntries = components
//     .filter(comp => !existingComponentIds.has(comp._id.toString()))
//     .map(comp => ({
//       student_id: studentId,
//       course_id: courseId,
//       fee_component_id: comp._id,
//       fee_name: comp.name,
//       amount_due: comp.amount,
//       amount_paid: 0,
//       due_date: null,
//       required_for_exam: comp.required_for_exam,
//       status: 'pending'
//     }));

//   if (newEntries.length > 0) {
//     await StudentFee.insertMany(newEntries);
//   }

//   return await StudentFee.find({
//     student_id: studentId,
//     course_id: courseId
//   }).sort({ createdAt: 1 });
// };

// exports.getFeeSummary = async (studentId) => {
//   const fees = await StudentFee.find({
//     student_id: studentId
//   }).populate('course_id', 'name');

//   if (!fees || fees.length === 0) {
//     throw {
//       statusCode: 404,
//       message: 'No fee records found for this student'
//     };
//   }

//   const totalDue = fees.reduce(
//     (sum, item) => sum + Number(item.amount_due || 0),
//     0
//   );

//   const totalPaid = fees.reduce(
//     (sum, item) => sum + Number(item.amount_paid || 0),
//     0
//   );

//   const balance = totalDue - totalPaid;

//   return {
//     totalDue,
//     totalPaid,
//     balance,
//     ledger: fees
//   };
// };

// // ================= 2. EXAM ELIGIBILITY =================

// exports.checkExamEligibility = async (studentId) => {
//   const pendingRequiredFees = await StudentFee.find({
//     student_id: studentId,
//     required_for_exam: true,
//     status: { $ne: 'paid' }
//   });

//   if (pendingRequiredFees.length > 0) {
//     return {
//       eligible: false,
//       message: 'Blocked: Pending exam fees.',
//       pendingFees: pendingRequiredFees.map(f => f.fee_name)
//     };
//   }

//   return {
//     eligible: true,
//     message: 'Eligible to fill exam form'
//   };
// };

// // ================= 3. PAYMENTS & RECEIPTS =================

// exports.recordPayment = async (
//   studentId,
//   amount,
//   mode,
//   reference_no,
//   staffId,
//   paymentDate = new Date(),
//   ip = null
// ) => {
//   const paymentAmount = Math.round(Number(amount) * 100) / 100;

//   if (!mongoose.Types.ObjectId.isValid(studentId)) {
//     throw { statusCode: 400, message: 'Invalid student ID' };
//   }

//   if (!mongoose.Types.ObjectId.isValid(staffId)) {
//     throw { statusCode: 400, message: 'Invalid staff ID' };
//   }

//   if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
//     throw {
//       statusCode: 400,
//       message: 'Payment amount must be greater than zero'
//     };
//   }

//   if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
//     throw { statusCode: 400, message: 'Invalid payment mode' };
//   }

//   const parsedPaymentDate = new Date(paymentDate);

//   if (Number.isNaN(parsedPaymentDate.getTime())) {
//     throw { statusCode: 400, message: 'Invalid payment date' };
//   }

//   const session = await mongoose.startSession();
//   let result;

//   try {
//     await session.withTransaction(async () => {

//       // 1. Verify student exists. (FIXED: Handles User ID, Student ID, or Fee ID)
//       let student = await Student.findById(studentId).session(session);
      
//       if (!student) {
//         student = await Student.findOne({ user_id: studentId }).session(session);
//       }

//       if (!student) {
//         const feeRecord = await StudentFee.findById(studentId).session(session);
//         if (feeRecord) {
//           student = await Student.findById(feeRecord.student_id).session(session);
//         }
//       }

//       if (!student) {
//         throw {
//           statusCode: 404,
//           message: 'Student not found for the provided ID'
//         };
//       }

//       const actualStudentId = student._id;

//       // 2. Fetch outstanding fee ledger entries.
//       const pendingFees = await StudentFee.find({
//         student_id: actualStudentId,
//         status: { $in: ['pending', 'partial'] }
//       })
//         .sort({ createdAt: 1, _id: 1 })
//         .session(session);

//       if (pendingFees.length === 0) {
//         throw {
//           statusCode: 400,
//           message: 'No outstanding fee ledger found for this student'
//         };
//       }

//       // 3. Calculate total outstanding balance.
//       const totalOutstanding = pendingFees.reduce((total, fee) => {
//         return total + Math.round(
//           (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
//         );
//       }, 0) / 100;

//       if (paymentAmount > totalOutstanding) {
//         throw {
//           statusCode: 400,
//           message: `Payment exceeds outstanding balance of Rs. ${totalOutstanding}`
//         };
//       }

//       // 4. Generate unique receipt number inside transaction.
//       const year = parsedPaymentDate.getFullYear();

//       const seq = await Sequence.getNextSequence(
//         `receipt_no_${year}`,
//         session
//       );

//       const receiptNo = `RCPT-${year}-${String(seq).padStart(5, '0')}`;

//       // 5. Create payment record.
//       const [payment] = await Payment.create(
//         [{
//           student_id: actualStudentId,
//           amount: paymentAmount,
//           payment_date: parsedPaymentDate,
//           mode,
//           reference_no: reference_no || null,
//           receipt_no: receiptNo,
//           created_by: staffId
//         }],
//         { session }
//       );

//       // 6. Allocate payment to outstanding fee components.
//       let remainingAmount = Math.round(paymentAmount * 100);
//       const allocations = [];

//       for (const fee of pendingFees) {
//         if (remainingAmount <= 0) break;

//         const outstanding = Math.round(
//           (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
//         );

//         if (outstanding <= 0) continue;

//         const amountToApply = Math.min(outstanding, remainingAmount);

//         fee.amount_paid = Math.round(
//           (Number(fee.amount_paid) * 100 + amountToApply)
//         ) / 100;

//         if (fee.amount_paid >= fee.amount_due) {
//           fee.status = 'paid';
//         } else {
//           fee.status = 'partial';
//         }

//         await fee.save({ session });

//         allocations.push({
//           payment_id: payment._id,
//           student_fee_id: fee._id,
//           amount: amountToApply / 100
//         });

//         remainingAmount -= amountToApply;
//       }

//       // 7. Ensure the complete payment was allocated.
//       if (remainingAmount !== 0) {
//         throw {
//           statusCode: 400,
//           message: 'Payment could not be fully allocated'
//         };
//       }

//       // 8. Save allocation records.
//       await PaymentAllocation.insertMany(allocations, { session });

//       // 9. Calculate remaining balance after this payment.
//       const updatedFees = await StudentFee.find({
//         student_id: actualStudentId
//       }).session(session);

//       const balanceAfterPaise = updatedFees.reduce((total, fee) => {
//         const outstanding = Math.round(
//           (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
//         );

//         return total + Math.max(0, outstanding);
//       }, 0);

//       const balanceAfter = balanceAfterPaise / 100;

//       // 10. Store historical balance in payment record.
//       payment.balance_after = balanceAfter;
//       await payment.save({ session });

//       // 11. Record audit log inside the transaction.
//       await auditService.logAction({
//         userId: staffId,
//         action: 'RECORD_PAYMENT',
//         entity: 'Payment',
//         entityId: payment._id,
//         oldValues: null,
//         newValues: {
//           student_id: actualStudentId,
//           amount: paymentAmount,
//           mode,
//           receipt_no: receiptNo,
//           balance_after: balanceAfter,
//           allocations
//         },
//         ip,
//         session
//       });

//       result = {
//         payment,
//         allocations
//       };
//     });

//     return result;

//   } finally {
//     await session.endSession();
//   }
// };

// // ================= 4. RECEIPT JSON DATA =================

// exports.getReceiptData = async (paymentId) => {
//   if (!mongoose.Types.ObjectId.isValid(paymentId)) {
//     throw {
//       statusCode: 400,
//       message: 'Invalid payment ID'
//     };
//   }

//   const payment = await Payment.findById(paymentId)
//     .populate({
//       path: 'student_id',
//       select: 'student_id full_name email course_id batch_id',
//       populate: [
//         {
//           path: 'course_id',
//           select: 'name'
//         },
//         {
//           path: 'batch_id',
//           select: 'name'
//         }
//       ]
//     });

//   if (!payment) {
//     throw {
//       statusCode: 404,
//       message: 'Payment not found'
//     };
//   }

//   const student = payment.student_id;

//   if (!student) {
//     throw {
//       statusCode: 404,
//       message: 'Student details not found for this payment'
//     };
//   }

//   const allocations = await PaymentAllocation.find({
//     payment_id: payment._id
//   }).populate('student_fee_id', 'fee_name');

//   return {
//     receipt_no: payment.receipt_no,
//     payment_id: payment._id,
//     payment_date: payment.payment_date,
//     student: {
//       student_id: student.student_id,
//       full_name: student.full_name,
//       email: student.email
//     },
//     course: student.course_id
//       ? student.course_id.name
//       : null,
//     batch: student.batch_id
//       ? student.batch_id.name
//       : null,
//     amount: payment.amount,
//     mode: payment.mode,
//     reference_no: payment.reference_no,
//     balance_after: payment.balance_after ?? null,
//     status: payment.status,
//     allocations: allocations.map(allocation => ({
//       fee_name: allocation.student_fee_id
//         ? allocation.student_fee_id.fee_name
//         : null,
//       amount: allocation.amount
//     }))
//   };
// };

// // ================= 5. RECEIPT PDF =================

// exports.generateReceiptPDF = async (paymentId) => {
//   const receipt = await exports.getReceiptData(paymentId);

//   const doc = new PDFDocument({
//     size: 'A4',
//     margin: 50
//   });

//   // College heading.
//   doc
//     .fontSize(20)
//     .font('Helvetica-Bold')
//     .text('Fire & Safety College', { align: 'center' });

//   doc
//     .fontSize(14)
//     .font('Helvetica')
//     .text('Official Fee Receipt', { align: 'center' });

//   doc.moveDown(2);

//   // Receipt details.
//   doc.fontSize(11);

//   doc.text(`Receipt Number: ${receipt.receipt_no}`);
//   doc.text(
//     `Payment Date: ${new Date(receipt.payment_date).toLocaleDateString('en-IN')}`
//   );
//   doc.text(`Payment Status: ${receipt.status.toUpperCase()}`);

//   doc.moveDown();

//   // Student details.
//   doc
//     .font('Helvetica-Bold')
//     .text('STUDENT DETAILS');

//   doc.font('Helvetica');

//   doc.text(`Student Name: ${receipt.student.full_name}`);
//   doc.text(`Student ID: ${receipt.student.student_id}`);
//   doc.text(`Course: ${receipt.course || 'Not available'}`);
//   doc.text(`Batch: ${receipt.batch || 'Not available'}`);

//   doc.moveDown();

//   // Payment details.
//   doc
//     .font('Helvetica-Bold')
//     .text('PAYMENT DETAILS');

//   doc.font('Helvetica');

//   doc.text(`Payment Mode: ${receipt.mode.toUpperCase()}`);

//   if (receipt.reference_no) {
//     doc.text(`Reference Number: ${receipt.reference_no}`);
//   }

//   doc.moveDown();

//   // Allocations.
//   if (receipt.allocations.length > 0) {
//     doc
//       .font('Helvetica-Bold')
//       .text('FEE ALLOCATION');

//     doc.font('Helvetica');

//     receipt.allocations.forEach(allocation => {
//       doc.text(
//         `${allocation.fee_name || 'Fee component'}: Rs. ${allocation.amount.toFixed(2)}`
//       );
//     });

//     doc.moveDown();
//   }

//   // Amount received.
//   doc
//     .font('Helvetica-Bold')
//     .fontSize(16)
//     .text(`Amount Received: Rs. ${Number(receipt.amount).toFixed(2)}`);

//   doc.moveDown();

//   // Historical balance.
//   doc.fontSize(12);

//   if (receipt.balance_after !== null) {
//     doc.text(
//       `Balance After Payment: Rs. ${Number(receipt.balance_after).toFixed(2)}`
//     );
//   } else {
//     doc.text('Balance After Payment: Not available for this historical payment');
//   }

//   doc.moveDown(3);

//   doc
//     .fontSize(10)
//     .font('Helvetica')
//     .text(
//       'This is a computer-generated receipt. No signature required.',
//       { align: 'center', color: 'grey' }
//     );

//   // Finalize PDF stream.
//   doc.end();

//   return doc;
// };

// // ================= 6. PENDING FEES LIST =================

// exports.getPendingFeesList = async () => {
//   return await StudentFee.find({
//     status: { $ne: 'paid' }
//   })
//     .populate('student_id', 'full_name phone student_id')
//     .populate('course_id', 'name');
// };

// // ================= 7. CANCEL PAYMENT =================

// exports.cancelPayment = async (paymentId, reason, adminId, ip) => {
//   const payment = await Payment.findById(paymentId);

//   if (!payment) {
//     throw {
//       statusCode: 404,
//       message: 'Payment not found'
//     };
//   }

//   if (payment.status === 'cancelled') {
//     throw {
//       statusCode: 400,
//       message: 'Payment is already cancelled'
//     };
//   }

//   // 1. Mark payment as cancelled.
//   payment.status = 'cancelled';
//   payment.cancel_reason = reason;
//   payment.cancelled_by = adminId;

//   await payment.save();

//   // 2. Reverse the allocation from StudentFee.
//   let amountToReverse = payment.amount;

//   const paidFees = await StudentFee.find({
//     student_id: payment.student_id,
//     amount_paid: { $gt: 0 }
//   }).sort({ updatedAt: -1 });

//   for (const fee of paidFees) {
//     if (amountToReverse <= 0) break;

//     const reversibleAmount = Math.min(
//       fee.amount_paid,
//       amountToReverse
//     );

//     fee.amount_paid -= reversibleAmount;
//     amountToReverse -= reversibleAmount;

//     if (fee.amount_paid === 0) {
//       fee.status = 'pending';
//     } else if (fee.amount_paid < fee.amount_due) {
//       fee.status = 'partial';
//     }

//     await fee.save();
//   }

//   // 3. Log to Audit.
//   await auditService.logAction({
//     userId: adminId,
//     action: 'CANCEL_PAYMENT',
//     entity: 'Payment',
//     entityId: payment._id,
//     oldValues: {
//       status: 'active',
//       amount: payment.amount
//     },
//     newValues: {
//       status: 'cancelled',
//       reason
//     },
//     ip
//   });

//   return {
//     message: 'Payment cancelled and ledger reversed successfully'
//   };
// };



const mongoose = require('mongoose');
const Student = require('../../students/models/Student');
const PaymentAllocation = require('../models/PaymentAllocation');
const auditService = require('../../audit/services/auditService');
const StudentFee = require('../models/StudentFee');
const FeeComponent = require('../../courses/models/FeeComponent');
const Payment = require('../models/Payment');
const Sequence = require('../../courses/models/Sequence');
const PDFDocument = require('pdfkit');

// ================= 1. FEE LEDGER =================

exports.generateFeeLedger = async (studentId, courseId) => {
  const components = await FeeComponent.find({
    course_id: courseId,
    status: 'active'
  });

  if (components.length === 0) {
    throw {
      statusCode: 400,
      message: 'No active fee components found for this course'
    };
  }

  const existingFees = await StudentFee.find({
    student_id: studentId,
    course_id: courseId
  }).select('fee_component_id');

  const existingComponentIds = new Set(
    existingFees.map(fee => fee.fee_component_id.toString())
  );

  const newEntries = components
    .filter(comp => !existingComponentIds.has(comp._id.toString()))
    .map(comp => ({
      student_id: studentId,
      course_id: courseId,
      fee_component_id: comp._id,
      fee_name: comp.name,
      amount_due: comp.amount,
      amount_paid: 0,
      due_date: null,
      required_for_exam: comp.required_for_exam,
      status: 'pending'
    }));

  if (newEntries.length > 0) {
    await StudentFee.insertMany(newEntries);
  }

  return await StudentFee.find({
    student_id: studentId,
    course_id: courseId
  }).sort({ createdAt: 1 });
};

exports.getFeeSummary = async (studentId) => {
  const fees = await StudentFee.find({
    student_id: studentId
  }).populate('course_id', 'name');

  if (!fees || fees.length === 0) {
    throw {
      statusCode: 404,
      message: 'No fee records found for this student'
    };
  }

  const totalDue = fees.reduce(
    (sum, item) => sum + Number(item.amount_due || 0),
    0
  );

  const totalPaid = fees.reduce(
    (sum, item) => sum + Number(item.amount_paid || 0),
    0
  );

  const balance = totalDue - totalPaid;

  return {
    totalDue,
    totalPaid,
    balance,
    ledger: fees
  };
};

// ================= 2. EXAM ELIGIBILITY =================

exports.checkExamEligibility = async (studentId) => {
  const pendingRequiredFees = await StudentFee.find({
    student_id: studentId,
    required_for_exam: true,
    status: { $ne: 'paid' }
  });

  if (pendingRequiredFees.length > 0) {
    return {
      eligible: false,
      message: 'Blocked: Pending exam fees.',
      pendingFees: pendingRequiredFees.map(f => f.fee_name)
    };
  }

  return {
    eligible: true,
    message: 'Eligible to fill exam form'
  };
};

// ================= 3. PAYMENTS & RECEIPTS =================

exports.recordPayment = async (
  studentId,
  amount,
  mode,
  reference_no,
  staffId,
  paymentDate = new Date(),
  ip = null
) => {
  const paymentAmount = Math.round(Number(amount) * 100) / 100;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw { statusCode: 400, message: 'Invalid student ID' };
  }

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw { statusCode: 400, message: 'Invalid staff ID' };
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw {
      statusCode: 400,
      message: 'Payment amount must be greater than zero'
    };
  }

  if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
    throw { statusCode: 400, message: 'Invalid payment mode' };
  }

  const parsedPaymentDate = new Date(paymentDate);

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    throw { statusCode: 400, message: 'Invalid payment date' };
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {

      // 1. Verify student exists. (Handles User ID, Student ID, or Fee ID)
      let student = await Student.findById(studentId).session(session);
      
      if (!student) {
        student = await Student.findOne({ user_id: studentId }).session(session);
      }

      if (!student) {
        const feeRecord = await StudentFee.findById(studentId).session(session);
        if (feeRecord) {
          student = await Student.findById(feeRecord.student_id).session(session);
        }
      }

      if (!student) {
        throw {
          statusCode: 404,
          message: 'Student not found for the provided ID'
        };
      }

      const actualStudentId = student._id;

      // 2. Fetch outstanding fee ledger entries.
      const pendingFees = await StudentFee.find({
        student_id: actualStudentId,
        status: { $in: ['pending', 'partial'] }
      })
        .sort({ createdAt: 1, _id: 1 })
        .session(session);

      if (pendingFees.length === 0) {
        throw {
          statusCode: 400,
          message: 'No outstanding fee ledger found for this student'
        };
      }

      // 3. Calculate total outstanding balance.
      const totalOutstanding = pendingFees.reduce((total, fee) => {
        return total + Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );
      }, 0) / 100;

      if (paymentAmount > totalOutstanding) {
        throw {
          statusCode: 400,
          message: `Payment exceeds outstanding balance of Rs. ${totalOutstanding}`
        };
      }

      // 4. Generate unique receipt number inside transaction.
      const year = parsedPaymentDate.getFullYear();

      const seq = await Sequence.getNextSequence(
        `receipt_no_${year}`,
        session
      );

      const receiptNo = `RCPT-${year}-${String(seq).padStart(5, '0')}`;

      // 5. Create payment record.
      const [payment] = await Payment.create(
        [{
          student_id: actualStudentId,
          amount: paymentAmount,
          payment_date: parsedPaymentDate,
          mode,
          reference_no: reference_no || null,
          receipt_no: receiptNo,
          created_by: staffId
        }],
        { session }
      );

      // 6. Allocate payment to outstanding fee components.
      let remainingAmount = Math.round(paymentAmount * 100);
      const allocations = [];

      for (const fee of pendingFees) {
        if (remainingAmount <= 0) break;

        const outstanding = Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );

        if (outstanding <= 0) continue;

        const amountToApply = Math.min(outstanding, remainingAmount);

        fee.amount_paid = Math.round(
          (Number(fee.amount_paid) * 100 + amountToApply)
        ) / 100;

        if (fee.amount_paid >= fee.amount_due) {
          fee.status = 'paid';
        } else {
          fee.status = 'partial';
        }

        await fee.save({ session });

        allocations.push({
          payment_id: payment._id,
          student_fee_id: fee._id,
          amount: amountToApply / 100
        });

        remainingAmount -= amountToApply;
      }

      // 7. Ensure the complete payment was allocated.
      if (remainingAmount !== 0) {
        throw {
          statusCode: 400,
          message: 'Payment could not be fully allocated'
        };
      }

      // 8. Save allocation records.
      await PaymentAllocation.insertMany(allocations, { session });

      // 9. Calculate remaining balance after this payment.
      const updatedFees = await StudentFee.find({
        student_id: actualStudentId
      }).session(session);

      const balanceAfterPaise = updatedFees.reduce((total, fee) => {
        const outstanding = Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );

        return total + Math.max(0, outstanding);
      }, 0);

      const balanceAfter = balanceAfterPaise / 100;

      // 10. Store historical balance in payment record.
      payment.balance_after = balanceAfter;
      await payment.save({ session });

      // 11. Record audit log inside the transaction.
      await auditService.logAction({
        userId: staffId,
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: payment._id,
        oldValues: null,
        newValues: {
          student_id: actualStudentId,
          amount: paymentAmount,
          mode,
          receipt_no: receiptNo,
          balance_after: balanceAfter,
          allocations
        },
        ip,
        session
      });

      result = {
        payment,
        allocations
      };
    });

    return result;

  } finally {
    await session.endSession();
  }
};

// ================= 4. RECEIPT JSON DATA =================

exports.getReceiptData = async (paymentId) => {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw {
      statusCode: 400,
      message: 'Invalid payment ID'
    };
  }

  const payment = await Payment.findById(paymentId)
    .populate({
      path: 'student_id',
      select: 'student_id full_name email course_id batch_id',
      populate: [
        {
          path: 'course_id',
          select: 'name'
        },
        {
          path: 'batch_id',
          select: 'name'
        }
      ]
    });

  if (!payment) {
    throw {
      statusCode: 404,
      message: 'Payment not found'
    };
  }

  const student = payment.student_id;

  if (!student) {
    throw {
      statusCode: 404,
      message: 'Student details not found for this payment'
    };
  }

  const allocations = await PaymentAllocation.find({
    payment_id: payment._id
  }).populate('student_fee_id', 'fee_name');

  return {
    receipt_no: payment.receipt_no,
    payment_id: payment._id,
    payment_date: payment.payment_date,
    student: {
      student_id: student.student_id,
      full_name: student.full_name,
      email: student.email
    },
    course: student.course_id
      ? student.course_id.name
      : null,
    batch: student.batch_id
      ? student.batch_id.name
      : null,
    amount: payment.amount,
    mode: payment.mode,
    reference_no: payment.reference_no,
    balance_after: payment.balance_after ?? null,
    status: payment.status,
    allocations: allocations.map(allocation => ({
      fee_name: allocation.student_fee_id
        ? allocation.student_fee_id.fee_name
        : null,
      amount: allocation.amount
    }))
  };
};

// ================= 5. RECEIPT PDF =================

exports.generateReceiptPDF = async (paymentId) => {
  const receipt = await exports.getReceiptData(paymentId);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });

  // College heading.
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Fire & Safety College', { align: 'center' });

  doc
    .fontSize(14)
    .font('Helvetica')
    .text('Official Fee Receipt', { align: 'center' });

  doc.moveDown(2);

  // Receipt details.
  doc.fontSize(11);

  doc.text(`Receipt Number: ${receipt.receipt_no}`);
  doc.text(
    `Payment Date: ${new Date(receipt.payment_date).toLocaleDateString('en-IN')}`
  );
  doc.text(`Payment Status: ${receipt.status.toUpperCase()}`);

  doc.moveDown();

  // Student details.
  doc
    .font('Helvetica-Bold')
    .text('STUDENT DETAILS');

  doc.font('Helvetica');

  doc.text(`Student Name: ${receipt.student.full_name}`);
  doc.text(`Student ID: ${receipt.student.student_id}`);
  doc.text(`Course: ${receipt.course || 'Not available'}`);
  doc.text(`Batch: ${receipt.batch || 'Not available'}`);

  doc.moveDown();

  // Payment details.
  doc
    .font('Helvetica-Bold')
    .text('PAYMENT DETAILS');

  doc.font('Helvetica');

  doc.text(`Payment Mode: ${receipt.mode.toUpperCase()}`);

  if (receipt.reference_no) {
    doc.text(`Reference Number: ${receipt.reference_no}`);
  }

  doc.moveDown();

  // Allocations.
  if (receipt.allocations.length > 0) {
    doc
      .font('Helvetica-Bold')
      .text('FEE ALLOCATION');

    doc.font('Helvetica');

    receipt.allocations.forEach(allocation => {
      doc.text(
        `${allocation.fee_name || 'Fee component'}: Rs. ${allocation.amount.toFixed(2)}`
      );
    });

    doc.moveDown();
  }

  // Amount received.
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .text(`Amount Received: Rs. ${Number(receipt.amount).toFixed(2)}`);

  doc.moveDown();

  // Historical balance.
  doc.fontSize(12);

  if (receipt.balance_after !== null) {
    doc.text(
      `Balance After Payment: Rs. ${Number(receipt.balance_after).toFixed(2)}`
    );
  } else {
    doc.text('Balance After Payment: Not available for this historical payment');
  }

  doc.moveDown(3);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(
      'This is a computer-generated receipt. No signature required.',
      { align: 'center', color: 'grey' }
    );

  // Finalize PDF stream.
  doc.end();

  return doc;
};

// ================= 6. PENDING FEES LIST =================

exports.getPendingFeesList = async () => {
  const fees = await StudentFee.find({
    status: { $ne: 'paid' }
  })
    .populate('student_id', 'full_name phone student_id')
    .populate('course_id', 'name');

  // Filter out records where the student was deleted or doesn't exist
  return fees.filter(fee => fee.student_id !== null);
};

// ================= 7. CANCEL PAYMENT =================


exports.cancelPayment = async (paymentId, reason, adminId, ip = null) => {
  // Validate input before starting the transaction.
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    throw {
      statusCode: 400,
      message: 'Invalid payment ID'
    };
  }

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    throw {
      statusCode: 400,
      message: 'Invalid admin ID'
    };
  }

  if (typeof reason !== 'string' || !reason.trim()) {
    throw {
      statusCode: 400,
      message: 'Cancellation reason is required'
    };
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      // 1. Fetch payment inside transaction.
      const payment = await Payment.findById(paymentId).session(session);

      if (!payment) {
        throw {
          statusCode: 404,
          message: 'Payment not found'
        };
      }

      if (payment.status === 'cancelled') {
        throw {
          statusCode: 409,
          message: 'Payment is already cancelled'
        };
      }

      // 2. Fetch the exact allocations of this payment.
      const allocations = await PaymentAllocation.find({
        payment_id: payment._id
      }).session(session);

      if (allocations.length === 0) {
        throw {
          statusCode: 409,
          message: 'Payment allocations not found. Cancellation requires manual reconciliation.'
        };
      }

      // 3. Verify allocation total matches payment amount.
      const allocatedPaise = allocations.reduce(
        (total, allocation) =>
          total + Math.round(Number(allocation.amount) * 100),
        0
      );

      const paymentPaise = Math.round(Number(payment.amount) * 100);

      if (allocatedPaise !== paymentPaise) {
        throw {
          statusCode: 409,
          message: 'Payment allocation total does not match payment amount'
        };
      }

      // 4. Reverse each original allocation.
      const reversedAllocations = [];

      for (const allocation of allocations) {
        const fee = await StudentFee.findById(
          allocation.student_fee_id
        ).session(session);

        if (!fee) {
          throw {
            statusCode: 409,
            message: `Fee ledger record not found for allocation ${allocation._id}`
          };
        }

        if (
          fee.student_id.toString() !== payment.student_id.toString()
        ) {
          throw {
            statusCode: 409,
            message: 'Payment allocation belongs to a different student'
          };
        }

        const feePaidPaise = Math.round(
          Number(fee.amount_paid) * 100
        );

        const allocationPaise = Math.round(
          Number(allocation.amount) * 100
        );

        if (feePaidPaise < allocationPaise) {
          throw {
            statusCode: 409,
            message: `Cannot reverse allocation for ${fee.fee_name}: paid amount is insufficient`
          };
        }

        // Reverse the exact allocated amount.
        fee.amount_paid =
          (feePaidPaise - allocationPaise) / 100;

        // Recalculate fee status.
        if (fee.amount_paid <= 0) {
          fee.amount_paid = 0;
          fee.status = 'pending';
        } else if (fee.amount_paid >= fee.amount_due) {
          fee.status = 'paid';
        } else {
          fee.status = 'partial';
        }

        await fee.save({ session });

        reversedAllocations.push({
          student_fee_id: fee._id,
          fee_name: fee.fee_name,
          reversed_amount: allocationPaise / 100,
          remaining_paid: fee.amount_paid,
          status: fee.status
        });
      }

      // 5. Mark payment as cancelled.
      // Receipt number and payment record remain unchanged.
      const oldValues = {
        status: payment.status,
        amount: payment.amount,
        receipt_no: payment.receipt_no
      };

      payment.status = 'cancelled';
      payment.cancel_reason = reason.trim();
      payment.cancelled_by = adminId;

      await payment.save({ session });

      // 6. Record audit inside the same transaction.
      await auditService.logAction({
        userId: adminId,
        action: 'CANCEL_PAYMENT',
        entity: 'Payment',
        entityId: payment._id,
        oldValues,
        newValues: {
          status: 'cancelled',
          amount: payment.amount,
          receipt_no: payment.receipt_no,
          reason: reason.trim(),
          reversed_allocations: reversedAllocations
        },
        ip,
        session
      });

      result = {
        payment_id: payment._id,
        receipt_no: payment.receipt_no,
        status: payment.status,
        cancel_reason: payment.cancel_reason,
        reversed_allocations: reversedAllocations,
        message: 'Payment cancelled and original allocations reversed successfully'
      };
    });

    return result;

  } finally {
    await session.endSession();
  }
};