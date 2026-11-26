
const referralOptions = [
  { value: 'friends', label: 'Friends' },
  { value: 'sahyadri', label: 'Sahyadri' },
  { value: 'cable_tv', label: 'Cable TV' },
  { value: 'our_representative', label: 'Our Representative' },
  { value: 'newspaper', label: 'Newspaper' },
  { value: 'internet', label: 'Internet' },
];

const academicQualificationFields = [
  { name: 'examination_passed', label: 'Examination Passed', type: 'text' },
  { name: 'school_college', label: 'School / College', type: 'text' },
  { name: 'year_of_passing', label: 'Year of Passing', type: 'number' },
  { name: 'board_university', label: 'Board / University', type: 'text' },
  { name: 'seat_no', label: 'Seat Number', type: 'text' },
  { name: 'marks_out_of', label: 'Marks Out Of', type: 'number' },
  { name: 'marks_obtained', label: 'Marks Obtained', type: 'number' },
  { name: 'percentage', label: 'Percentage', type: 'number' },
];

const sections = [
  {
    name: 'personal_details',
    label: 'Personal Details',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'fathers_name', label: "Father's Name", type: 'text' },
      { name: 'mothers_name', label: "Mother's Name", type: 'text' },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { name: 'religion', label: 'Religion', type: 'text' },
      { name: 'caste', label: 'Caste', type: 'text' },
      { name: 'category', label: 'Category', type: 'text' },
    ],
  },
  {
    name: 'contact_details',
    label: 'Contact Details',
    fields: [
      { name: 'mobile', label: 'Mobile Number', type: 'tel' },
      { name: 'phone_tel', label: 'Telephone Number', type: 'tel' },
      { name: 'home_mobile_no', label: 'Home Mobile Number', type: 'tel' },
      { name: 'phone', label: 'Alternate Contact Number', type: 'tel' },
      { name: 'email', label: 'Email Address', type: 'email' },
      { name: 'address', label: 'Address', type: 'textarea' },
    ],
  },
  {
    name: 'postal_address',
    label: 'Postal Address',
    fields: [
      { name: 'postal_address.address', label: 'Postal Address', type: 'textarea' },
      { name: 'postal_address.pin', label: 'Postal PIN Code', type: 'text', maxLength: 6 },
    ],
  },
  {
    name: 'permanent_address',
    label: 'Permanent Address',
    fields: [
      { name: 'permanent_address.address', label: 'Permanent Address', type: 'textarea' },
      { name: 'permanent_address.pin', label: 'Permanent PIN Code', type: 'text', maxLength: 6 },
    ],
  },
  {
    name: 'education',
    label: 'Educational Details',
    fields: [
      { name: 'qualification', label: 'Highest Qualification', type: 'text' },
    ],
    repeatable: {
      name: 'academic_qualification',
      label: 'Academic Qualification Details',
      minItems: 0,
      maxItems: 10,
      fields: academicQualificationFields,
    },
  },
  {
    name: 'physical_details',
    label: 'Physical Details',
    fields: [
      { name: 'height_cm', label: 'Height (cm)', type: 'number' },
      { name: 'weight_kg', label: 'Weight (kg)', type: 'number' },
      { name: 'chest_cm', label: 'Chest Measurement (cm)', type: 'number' },
    ],
  },
  {
    name: 'course_details',
    label: 'Course Details',
    fields: [
      {
        name: 'course_interest_id',
        label: 'Course Interested In',
        type: 'select',
        required: false,
        optionsSource: 'courses',
      },
    ],
  },
  {
    name: 'additional_information',
    label: 'Additional Information',
    fields: [
      { name: 'work_experience', label: 'Work Experience', type: 'textarea' },
      {
        name: 'how_did_you_know',
        label: 'How Did You Come to Know About Sahyadri College?',
        type: 'multiselect',
        options: referralOptions,
      },
      { name: 'other', label: 'Other Details', type: 'textarea' },
      { name: 'suggestion', label: 'Suggestions', type: 'textarea' },
      { name: 'remark', label: 'Additional Remarks', type: 'textarea' },
    ],
  },
];

module.exports = {
  sections,
};
