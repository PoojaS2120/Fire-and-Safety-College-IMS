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

exports.generateFeeLedger = async (studentId, courseId, adminId = null, ip = null) => {
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

  const result = await StudentFee.find({
    student_id: studentId,
    course_id: courseId
  }).sort({ createdAt: 1 });

  // 🚨 AUDIT LOG
  if (adminId && newEntries.length > 0) {
    await auditService.logAction({
      userId: adminId,
      action: 'GENERATE_FEE_LEDGER',
      entity: 'StudentFee',
      entityId: studentId,
      oldValues: null,
      newValues: {
        student_id: studentId,
        course_id: courseId,
        generated_count: newEntries.length,
        fee_names: newEntries.map(e => e.fee_name),
      },
      ip,
    });
  }

  return result;
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
  ip = null,
  feeComponentId = null
) => {
  const paymentAmount = Math.round(Number(amount) * 100) / 100;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw { statusCode: 400, message: 'Invalid student ID' };
  }

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw { statusCode: 400, message: 'Invalid staff ID' };
  }

  if (
    feeComponentId &&
    !mongoose.Types.ObjectId.isValid(feeComponentId)
  ) {
    throw {
      statusCode: 400,
      message: 'Invalid fee component ID'
    };
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw {
      statusCode: 400,
      message: 'Payment amount must be greater than zero'
    };
  }

  if (!['cash', 'upi', 'bank', 'cheque'].includes(mode)) {
    throw {
      statusCode: 400,
      message: 'Invalid payment mode'
    };
  }

  const parsedPaymentDate = new Date(paymentDate);

  if (Number.isNaN(parsedPaymentDate.getTime())) {
    throw {
      statusCode: 400,
      message: 'Invalid payment date'
    };
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {

      // 1. Verify and resolve student.
      let student = await Student.findById(studentId).session(session);

      if (!student) {
        student = await Student.findOne({
          user_id: studentId
        }).session(session);
      }

      if (!student) {
        const feeRecord = await StudentFee.findById(studentId)
          .session(session);

        if (feeRecord) {
          student = await Student.findById(feeRecord.student_id)
            .session(session);
        }
      }

      if (!student) {
        throw {
          statusCode: 404,
          message: 'Student not found for the provided ID'
        };
      }

      const actualStudentId = student._id;

      // 2. Fetch outstanding fee records.
      const feeFilter = {
        student_id: actualStudentId,
        status: { $in: ['pending', 'partial'] }
      };

      if (feeComponentId) {
        feeFilter.fee_component_id = feeComponentId;
      }

       const pendingFees = await StudentFee.find(feeFilter)
          .sort({ due_date: 1, installment_number: 1, createdAt: 1, _id: 1 })
          .session(session);

      if (pendingFees.length === 0) {
        throw {
          statusCode: 400,
          message: feeComponentId
            ? 'No outstanding balance found for the selected fee component'
            : 'No outstanding fee ledger found for this student'
        };
      }

      // 3. Calculate outstanding balance.
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

      // 4. Generate receipt number.
      const year = parsedPaymentDate.getFullYear();

      const seq = await Sequence.getNextSequence(
        `receipt_no_${year}`,
        session
      );

      const receiptNo =
        `RCPT-${year}-${String(seq).padStart(5, '0')}`;

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

      // 6. Allocate payment.
      let remainingAmount = Math.round(paymentAmount * 100);
      const allocations = [];

      for (const fee of pendingFees) {
        if (remainingAmount <= 0) break;

        const outstanding = Math.round(
          (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
        );

        if (outstanding <= 0) continue;

        const amountToApply = Math.min(
          outstanding,
          remainingAmount
        );

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

      // 7. Ensure complete allocation.
      if (remainingAmount !== 0) {
        throw {
          statusCode: 400,
          message: 'Payment could not be fully allocated'
        };
      }

      // 8. Save allocation records.
      await PaymentAllocation.insertMany(
        allocations,
        { session }
      );

      // 9. Calculate overall student balance.
      const updatedFees = await StudentFee.find({
        student_id: actualStudentId
      }).session(session);

      const balanceAfterPaise = updatedFees.reduce(
        (total, fee) => {
          const outstanding = Math.round(
            (Number(fee.amount_due) - Number(fee.amount_paid)) * 100
          );

          return total + Math.max(0, outstanding);
        },
        0
      );

      const balanceAfter = balanceAfterPaise / 100;

      // 10. Update payment balance.
      payment.balance_after = balanceAfter;
      await payment.save({ session });

      // 11. Record audit log.
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
          fee_component_id: feeComponentId || null,
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
    margins: {
      top: 35,
      bottom: 35,
      left: 40,
      right: 40
    },
    bufferPages: true
  });

  const pageWidth = doc.page.width;
  const left = 40;
  const right = pageWidth - 40;
  const contentWidth = right - left;

  const formatAmount = (amount) =>
    `Rs. ${Number(amount || 0).toFixed(2)}`;

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      : 'N/A';

  const drawLine = (y) => {
    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(0.7)
      .strokeColor('#555555')
      .stroke();
  };

  const drawSectionTitle = (title, y) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor('#000000')
      .text(title, left + 8, y);

    drawLine(y + 20);

    return y + 30;
  };

  // OUTER RECEIPT BORDER
  doc
    .lineWidth(1.5)
    .strokeColor('#000000')
    .rect(left, 30, contentWidth, 780)
    .stroke();

  let y = 45;

  // COLLEGE HEADER
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#000000')
    .text("G.G. Foundation's", left, y, {
      width: contentWidth,
      align: 'center'
    });

  y += 18;

  doc
    .font('Helvetica-Bold')
    .fontSize(17)
    .text('SAHYADRI COLLEGE OF FIRE ENGINEERING', left, y, {
      width: contentWidth,
      align: 'center'
    });

  y += 23;

  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('AND SAFETY MANAGEMENT', left, y, {
      width: contentWidth,
      align: 'center'
    });

  y += 22;

  doc
    .font('Helvetica')
    .fontSize(9)
    .text('Nashik, Maharashtra', left, y, {
      width: contentWidth,
      align: 'center'
    });

  y += 22;

  drawLine(y);

  y += 12;

  // RECEIPT TITLE
  doc
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('FEE RECEIPT', left, y, {
      width: contentWidth,
      align: 'center'
    });

  y += 28;

  drawLine(y);

  y += 12;

  // RECEIPT INFORMATION
  doc.fontSize(10).font('Helvetica');

  doc.text(`Receipt No.: ${receipt.receipt_no || 'N/A'}`, left + 8, y);
  doc.text(
    `Date: ${formatDate(receipt.payment_date)}`,
    right - 170,
    y
  );

  y += 20;

  const paymentStatus = String(receipt.status || 'completed').toUpperCase();

  doc
    .font('Helvetica-Bold')
    .fillColor(paymentStatus === 'CANCELLED' ? '#B00020' : '#000000')
    .text(`Payment Status: ${paymentStatus}`, left + 8, y);

  doc.fillColor('#000000');

  y += 25;

  // STUDENT DETAILS
  y = drawSectionTitle('STUDENT DETAILS', y);

  doc.font('Helvetica').fontSize(10);

  doc.text(`Student Name: ${receipt.student.full_name || 'N/A'}`, left + 8, y);
  y += 20;

  doc.text(`Student ID: ${receipt.student.student_id || 'N/A'}`, left + 8, y);
  y += 20;

  doc.text(`Course: ${receipt.course || 'N/A'}`, left + 8, y);
  y += 20;

  doc.text(`Batch: ${receipt.batch || 'N/A'}`, left + 8, y);
  y += 25;

  // PAYMENT DETAILS
  y = drawSectionTitle('PAYMENT DETAILS', y);

  doc.font('Helvetica').fontSize(10);

  doc.text(
    `Payment Mode: ${String(receipt.mode || 'N/A').toUpperCase()}`,
    left + 8,
    y
  );

  y += 20;

  if (receipt.reference_no) {
    doc.text(`Reference Number: ${receipt.reference_no}`, left + 8, y);
    y += 20;
  }

  y += 5;

  // FEE ALLOCATION TABLE
  y = drawSectionTitle('FEE PARTICULARS', y);

  const tableLeft = left + 8;
  const tableRight = right - 8;
  const tableWidth = tableRight - tableLeft;

  const feeColumnWidth = tableWidth * 0.68;
  const amountColumnWidth = tableWidth - feeColumnWidth;

  const rowHeight = 25;

  // TABLE HEADER
  doc
    .rect(tableLeft, y, tableWidth, rowHeight)
    .fillAndStroke('#EEEEEE', '#555555');

  doc
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Fee Particulars', tableLeft + 8, y + 7, {
      width: feeColumnWidth - 12
    });

  doc.text('Amount (Rs.)', tableLeft + feeColumnWidth + 5, y + 7, {
    width: amountColumnWidth - 10,
    align: 'right'
  });

  y += rowHeight;

  // TABLE ROWS
  const allocations = receipt.allocations || [];

  if (allocations.length === 0) {
    doc
      .rect(tableLeft, y, tableWidth, rowHeight)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(9)
      .text('Payment allocation details not available', tableLeft + 8, y + 7);

    y += rowHeight;
  } else {
    allocations.forEach((allocation) => {
      // Avoid writing outside the receipt page.
      if (y + rowHeight > 730) {
        doc.addPage();
        y = 50;
      }

      doc
        .rect(tableLeft, y, tableWidth, rowHeight)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#000000')
        .text(
          allocation.fee_name || 'Fee Component',
          tableLeft + 8,
          y + 7,
          {
            width: feeColumnWidth - 12
          }
        );

      doc.text(
        Number(allocation.amount || 0).toFixed(2),
        tableLeft + feeColumnWidth + 5,
        y + 7,
        {
          width: amountColumnWidth - 10,
          align: 'right'
        }
      );

      y += rowHeight;
    });
  }

  y += 15;

  // TOTAL AMOUNT
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('TOTAL AMOUNT RECEIVED:', left + 8, y);

  doc.text(
    formatAmount(receipt.amount),
    right - 160,
    y,
    {
      width: 150,
      align: 'right'
    }
  );

  y += 30;

  // AMOUNT IN WORDS
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Amount in Words:', left + 8, y);

  y += 17;

  doc
    .font('Helvetica')
    .fontSize(10)
    .text(numberToWords(receipt.amount), left + 8, y, {
      width: contentWidth - 20
    });

  y += 35;

  // BALANCE DETAILS
  drawLine(y);

  y += 12;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('BALANCE DETAILS', left + 8, y);

  y += 22;

  doc.font('Helvetica').fontSize(10);

  if (receipt.balance_after !== null && receipt.balance_after !== undefined) {
    doc.text(
      `Outstanding Balance: ${formatAmount(receipt.balance_after)}`,
      left + 8,
      y
    );
  } else {
    doc.text(
      'Outstanding Balance: Not available for this historical payment',
      left + 8,
      y
    );
  }

  y += 30;

  // CANCELLED PAYMENT INFORMATION
  if (paymentStatus === 'CANCELLED') {
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#B00020')
      .text('CANCELLED PAYMENT - NOT VALID FOR PAYMENT PROOF', left + 8, y, {
        width: contentWidth - 16,
        align: 'center'
      });

    doc.fillColor('#000000');
    y += 25;
  }

  // SIGNATURE AREA
  const signatureY = Math.max(y + 35, 700);

  drawLine(signatureY);

  doc
    .font('Helvetica')
    .fontSize(9)
    .text('Student Signature', left + 15, signatureY + 12);

  doc.text(
    'Authorized Signature',
    right - 150,
    signatureY + 12,
    {
      width: 135,
      align: 'center'
    }
  );

  // FOOTER
  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#555555')
    .text(
      'This is a computer-generated receipt.',
      left,
      780,
      {
        width: contentWidth,
        align: 'center'
      }
    );

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

  return fees.filter(fee => fee.student_id !== null);
};

// ================= 7. CANCEL PAYMENT =================

exports.cancelPayment = async (
  paymentId,
  reason,
  adminId,
  ip = null
) => {
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

      // 1. Fetch payment.
      const payment = await Payment.findById(paymentId)
        .session(session);

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

      // 2. Fetch exact payment allocations.
      const allocations = await PaymentAllocation.find({
        payment_id: payment._id
      }).session(session);

      if (allocations.length === 0) {
        throw {
          statusCode: 409,
          message: 'Payment allocations not found. Cancellation requires manual reconciliation.'
        };
      }

      // 3. Verify allocation total.
      const allocatedPaise = allocations.reduce(
        (total, allocation) =>
          total + Math.round(Number(allocation.amount) * 100),
        0
      );

      const paymentPaise = Math.round(
        Number(payment.amount) * 100
      );

      if (allocatedPaise !== paymentPaise) {
        throw {
          statusCode: 409,
          message: 'Payment allocation total does not match payment amount'
        };
      }

      // 4. Reverse original allocations.
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

        fee.amount_paid =
          (feePaidPaise - allocationPaise) / 100;

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
      const oldValues = {
        status: payment.status,
        amount: payment.amount,
        receipt_no: payment.receipt_no
      };

      payment.status = 'cancelled';
      payment.cancel_reason = reason.trim();
      payment.cancelled_by = adminId;

      await payment.save({ session });

      // 6. Record cancellation audit.
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

// ================= 8. EDIT FEE LEDGER =================

exports.updateFeeLedger = async (feeId, updateData, adminId, ip = null) => {
  if (!mongoose.Types.ObjectId.isValid(feeId)) {
    throw { statusCode: 400, message: 'Invalid fee record ID' };
  }

  const fee = await StudentFee.findById(feeId);

  if (!fee) {
    throw { statusCode: 404, message: 'Fee ledger record not found' };
  }

  const oldValues = fee.toObject();

  // 1. Update Amount Due (with safety checks)
  if (updateData.amount_due !== undefined) {
    const newAmountDue = Number(updateData.amount_due);
    
    if (newAmountDue < fee.amount_paid) {
      throw { 
        statusCode: 400, 
        message: `Amount due (${newAmountDue}) cannot be less than the amount already paid (${fee.amount_paid}).` 
      };
    }
    fee.amount_due = newAmountDue;
  }

  // 2. Update Due Date
  if (updateData.due_date !== undefined) {
    fee.due_date = updateData.due_date;
  }

  // 3. Update Required for Exam status
  if (updateData.required_for_exam !== undefined) {
    fee.required_for_exam = updateData.required_for_exam;
  }

  // 4. Recalculate Status automatically based on new amounts
  if (fee.amount_paid >= fee.amount_due) {
    fee.status = 'paid';
  } else if (fee.amount_paid > 0) {
    fee.status = 'partial';
  } else {
    fee.status = 'pending';
  }

  fee.updated_by = adminId;
  await fee.save();

  // 5. Audit Log
  await auditService.logAction({
    userId: adminId,
    action: 'UPDATE_FEE_LEDGER',
    entity: 'StudentFee',
    entityId: fee._id,
    oldValues,
    newValues: fee.toObject(),
    ip,
  });

  return fee;
};