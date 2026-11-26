const Joi = require('joi');
const validate = require('../../../middlewares/validate');
const { ITEM_TYPES } = require('../utils/distributionUtils');

const objectId = Joi.string().hex().length(24);

const itemSchema = Joi.object({
  item_type: Joi.string().valid(...ITEM_TYPES).required(),
  name: Joi.string().trim().min(1).max(150).required(),
  quantity: Joi.number().integer().min(1).max(10000).required(),
  unit: Joi.string().trim().max(20).allow('').default('pcs'),
  remarks: Joi.string().trim().max(300).allow('').default(''),
});

const itemsSchema = Joi.array().items(itemSchema).min(1).max(20).required();

const addressOverride = Joi.object({
  address: Joi.string().trim().max(1000).allow(''),
  pin: Joi.string().trim().pattern(/^[0-9]{6}$/).allow('').messages({
    'string.pattern.base': 'PIN code must contain exactly 6 digits.',
  }),
  phone: Joi.string().trim().max(15).allow(''),
});

const common = {
  student_id: Joi.string().trim().min(1).max(40).required(),
  request_id: Joi.string().trim().max(64),
  items: itemsSchema,
  given_by: objectId,
  remarks: Joi.string().trim().max(500).allow(''),
  allow_additional: Joi.boolean().default(false),
};

const handSchema = Joi.object({
  ...common,
  handed_at: Joi.date().iso(),
});

const postSchema = Joi.object({
  ...common,
  carrier_name: Joi.string().trim().max(100).allow(''),
  post_office: Joi.string().trim().max(150).allow(''),
  service_type: Joi.string().trim().max(50).allow(''),
  tracking_no: Joi.string().trim().max(60).allow(''),
  address_override: addressOverride,
});

const courierSchema = Joi.object({
  ...common,
  carrier_name: Joi.string().trim().min(1).max(100).required(),
  tracking_no: Joi.string().trim().max(60).allow(''),
  address_override: addressOverride,
});

const statusSchema = Joi.object({
  status: Joi.string().valid('DISPATCHED', 'DELIVERED', 'RETURNED', 'FAILED').required(),
  remarks: Joi.string().trim().max(500).allow(''),
  carrier_name: Joi.string().trim().max(100).allow(''),
  tracking_no: Joi.string().trim().max(60).allow(''),
  dispatch_date: Joi.date().iso(),
  delivered_at: Joi.date().iso(),
  given_by: objectId,
});

const trackingSchema = Joi.object({
  carrier_name: Joi.string().trim().max(100).allow(''),
  tracking_no: Joi.string().trim().max(60).allow(''),
  post_office: Joi.string().trim().max(150).allow(''),
  service_type: Joi.string().trim().max(50).allow(''),
}).min(1);

const addressSchema = Joi.object({
  refresh_from_admission: Joi.boolean().default(false),
  address: Joi.string().trim().max(1000).allow(''),
  pin: Joi.string().trim().pattern(/^[0-9]{6}$/).allow('').messages({
    'string.pattern.base': 'PIN code must contain exactly 6 digits.',
  }),
  phone: Joi.string().trim().max(15).allow(''),
});

const settingsSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  address: Joi.string().trim().min(5).max(1000).required(),
  pin: Joi.string().trim().pattern(/^[0-9]{6}$/).required().messages({
    'string.pattern.base': 'PIN code must contain exactly 6 digits.',
  }),
  phone: Joi.string().trim().max(30).allow(''),
  email: Joi.string().trim().email().max(200).allow(''),
});

module.exports = {
  validateHand: validate(handSchema),
  validatePost: validate(postSchema),
  validateCourier: validate(courierSchema),
  validateStatus: validate(statusSchema),
  validateTracking: validate(trackingSchema),
  validateAddress: validate(addressSchema),
  validateSettings: validate(settingsSchema),
};