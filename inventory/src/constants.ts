export const UNAUTHORIZED_STATUS_CODE = 403;
export const BAD_REQUEST_STATUS_CODE = 400;
export const SUCCESSFULLY_CREATED_STATUS_CODE = 201;
export const SUCCESSFULLY_FETCHED_STATUS_CODE = 200;
export const UNAUTHENTICATED_STATUS_CODE = 401;
export const NOT_FOUND_STATUS_CODE = 404;
export const SERVER_ERROR_STATUS_CODE = 500;

export const Events = {
  "tms.auth.tin.validation.request": "tms.auth.tin.validation.request",
  user_creation: "user_creation",
};

export const INDIVIDUAL_TAXPAYER_TEMPLATE = [
  "FIRSTNAME",
  "MIDDLE_NAME",
  "LASTNAME",
  "NIN",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "LGA_OF_ORIGIN",
  "STATE_OF_ORIGIN",
  "DATE_OF_BIRTH",
  "GENDER",
  "NATIONALITY",
  "MARITAL_STATUS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "LGA_OF_RESIDENCE",
  "POSITION",
];

export const EXPARTIATE_TAXPAYER_TEMPLATE = [
  "FIRSTNAME",
  "MIDDLE_NAME",
  "LASTNAME",
  "BVN",
  "EMAIL",
  "PHONE",
  "ADDRESS",
  "LGA_OF_ORIGIN",
  "STATE_OF_ORIGIN",
  "DATE_OF_BIRTH",
  "GENDER",
  "NATIONALITY",
  "MARITAL_STATUS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "LGA_OF_RESIDENCE",
  "POSITION",
];

export const CORPORATE_TAXPAYER_TEMPLATE =
  [
    "CAC_(RC/BN)_Number",
    "Email_Address",
    "Telephone_No",
    "Bus_Sector",
    "Operating Address",
    "LGA of Operations",
    "Institution Type",
    "current_address",
    "city",
    "state_of_residence",
    "secondary_phone",
    "company_email"
  ];
// company_email secondary_phone state_of_residence city current_address
// _

export const BANK_BRANCH_TEMPLATE = [
  "OPERATIONAL_NAME",
  "BRANCH_LOCATION",
  "PROOF_OF_RESIDENCY",
  "COMPANY_EMAIL",
  "EMAIL",
  "CITY",
  "CURRENT_ADDRESS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "PHONE",
  "LGA",
];

export const OIL_GAS_BRANCH_TEMPLATE = [
  "OPERATIONAL_NAME",
  "BRANCH_LOCATION",
  "PROOF_OF_RESIDENCY",
  "COMPANY_EMAIL",
  "EMAIL",
  "CITY",
  "CURRENT_ADDRESS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "PHONE",
  "LGA",
];

export const PETROL_STATION_BRANCH_TEMPLATE = [
  "OPERATIONAL_NAME",
  "BRANCH_LOCATION",
  "NUMBER_OF_PUMPS",
  "PROOF_OF_RESIDENCY",
  "COMPANY_EMAIL",
  "EMAIL",
  "CITY",
  "CURRENT_ADDRESS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "PHONE",
  "LGA",
];

export const HOSPITAL_BRANCH_TEMPLATE = [
  "NUMBER_OF_BEDS",
  "OPERATE_MORTUARY",
  "RUN_LABORATORY",
  "PROOF_OF_RESIDENCY",
  "COMPANY_EMAIL",
  "EMAIL",
  "CITY",
  "CURRENT_ADDRESS",
  "STATE_OF_RESIDENCE",
  "SECONDARY_PHONE",
  "PHONE",
  "LGA",
];

export const lgaOfOperationOptions = [
  { value: 'ABAK', label: 'Abak' },
  { value: 'EASTERN OBOLO', label: 'Eastern Obolo' },
  { value: 'EKET', label: 'Eket' },
  { value: 'ESIT EKET', label: 'Esit Eket' },
  { value: 'ESSIEN UDIM', label: 'Essien Udim' },
  { value: 'ETIM EKPO', label: 'Etim Ekpo' },
  { value: 'ETINAN', label: 'Etinan' },
  { value: 'IBENO', label: 'Ibeno' },
  { value: 'IBESIKPO ASUTAN', label: 'Ibesikpo Asutan' },
  { value: 'IBIONO IBOM', label: 'Ibiono Ibom' },
  { value: 'IKA', label: 'Ika' },
  { value: 'IKONO', label: 'Ikono' },
  { value: 'IKOT ABASI', label: 'Ikot Abasi' },
  { value: 'IKOT EKPENE', label: 'Ikot Ekpene' },
  { value: 'INI', label: 'Ini' },
  { value: 'ITU', label: 'Itu' },
  { value: 'MBO', label: 'Mbo' },
  { value: 'MKPAT ENIN', label: 'Mkpat Enin' },
  { value: 'NSIT ATAI', label: 'Nsit Atai' },
  { value: 'NSIT IBOM', label: 'Nsit Ibom' },
  { value: 'NSIT UBIUM', label: 'Nsit Ubium' },
  { value: 'OBOT AKARA', label: 'Obot Akara' },
  { value: 'OKOBO', label: 'Okobo' },
  { value: 'ONNA', label: 'Onna' },
  { value: 'ORON', label: 'Oron' },
  { value: 'ORUK ANAM', label: 'Oruk Anam' },
  { value: 'UDUNG UKO', label: 'Udung Uko' },
  { value: 'UKANAFON', label: 'Ukanafun' },
  { value: 'URUAN', label: 'Uruan' },
  { value: 'URUE-OFFONG/ORUKO', label: 'Urue-Offong/Oruko' },
  { value: 'UYO', label: 'Uyo' },
];


export const ZONE_2_LGAS = [
  'ORON',
  'UKANAFON',
  'IKONO',
  'ESSIEN UDIM',
  'NSIT UBIUM',
  'UDUNG UKO',
  'ONNA',
];


export const ZONE_1_LGAS = [
  'UYO',
  'EKET',
  'IKOT ABASI',
  'URUAN',
  'NSIT IBOM',
  'IBESIKPO ASUTAN',
  'IBIONO IBOM',
  'ETINAN',
  'IKOT EKPENE',
  'ABAK',
  'IBENO',
];


/**
 * @description REDIS
 */

export const REDIS_TTL = 1 * 24 * 60 * 60;
export const AUTH_DLQ_TOPIC = "auth.dlq.topic";

export const BULK_TAXPAYER_NOTIFICATION = "notification.bulk_taxpayer.created";
export const CHUNK_SIZE = 15;
export const BULK_TAXPAYER_EMAIL_TOPIC = "bulk.taxpayer.email.notification";
export const BULK_TAXPAYER_SMS_TOPIC = "bulk.taxpayer.sms.notification";
export const BULK_TAXPAYER_TOPIC = "bulk_taxpayer_creation";
export const BULK_CORPORATE_TAXPAYER_TOPIC = "bulk_corporate_taxpayer_creation";
export const BULK_TAXPAYER_REDIS_KEY = "bulk_taxpayer.created.batch";
/**
 * TOPICS
 */
export const USER_LOGIN_TOPIC = "reporting.user.signin";
export const USER_LOGOUT_TOPIC = "reporting.user.signout";
export const USER_REGISTRATION_TOPIC = "reporting.user.registered";
export const USER_CREATION_TOPIC = "user_creation";
export const TIN_VALIDATION_TOPIC = "tms.auth.tin.validation.request";
export const USER_CREATION_COMPLETED_TOPIC = "user_creation_completed";
export const USER_CREATION_FAILED_TOPIC = "user_creation_failed";
export const SEND_NOTIFICATION_TOPIC = "send_notification";

/**
 * @description Auth Notification Topic
 */
export const AGENCY_REGISTRATION_TOPIC =
  "notification.auth.agency.registration.topic";
export const ADMIN_REGISTRATION_TOPIC =
  "notification.auth.admin.registration.topic";
export const LOGIN_2FA_TOPIC = "tms.auth.login.2fa";
export const USER_NOTIFICATION_SUCCESS = "notification.signup.completed";
export const GROUP_REGISTRATION_TOPIC =
  "notification.auth.group.registration.topic";

export const ACCOUNT_UNRESTRICTION =
  "reporting.auth.account.unrestricted.topic";
export const ACCOUNT_RESTRICTION = "reporting.auth.account.restricted.topic";

export const NIN_VERIFICATION_TOPIC = "bulk.user.tin.verification.topic";
export const NIN_VERIFICATION_RESULT_TOPIC = "nin.verification.result.topic";
export const BULK_TAXPAYER_RESULT_TOPIC = "bulk.taxpayer.result.topic";
export const BULK_TAXPAYER_RESPONSE_TOPIC = "bulk.taxpayer.response";

/**
 * @description Taxpayer (National and Expartiate) Uploads Topic
 */
export const BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC =
  "bulk.national.taxpayer.upload.topic";
export const BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC =
  "bulk.expartiate.taxpayer.upload.topic";
export const BULK_COMPANY_BRANCH_UPLOAD_TOPIC =
  "bulk.company.branch.upload.topic";
export const BULK_COMPANY_UPLOAD_TOPIC =
  "bulk.company.upload.topic";



export const TCC_REQUEST_TIN_VALIDATION_TOPIC =
  "tms.auth.tcc.request.validation.topic";
export const TCC_COMPLIANCE_PROFILE_REQUEST_TOPIC =
  "tcc.compliance.profile.request";
export const TCC_REQUEST_EMPLOYEE_TIN_VALIDATION_TOPIC =
  "tms.auth.employee.tcc.request.validation.topic";

export const USER_PROFILE_UPDATE = "reporting.user.profile.updated";
export const ADMIN_CREATION = "reporting.admin.profile.created";
/**
 * EXCHANGES
 */
export const EXCHANGE_NAME = "notification_exchange";
export const REPORTING_EXCHANGE = "reporting_exchange";
export const USER_EXCHANGE = "auth_exchange";
/**
 * QUEUES
 */

export const MAX_ROWS = 700;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const SECONDS_IN_7_DAYS = 7 * 24 * 60 * 60;
export const SECONDS_IN_1_DAY = 24 * 60 * 60;
export const QUEUES = {
  user_creation: "user_creation_queue",
  [TIN_VALIDATION_TOPIC]: "tin_validation_queue",
  bulk_taxpayer_creation: "bulk_taxpayer_creation_queue",
  user_creation_completed: "user_creation_completed_queue",
  user_creation_failed: "user_creation_failed_queue",
  bulk_corporate_taxpayer_creation: "bulk_corporate_taxpayer_creation_queue",
  [TCC_COMPLIANCE_PROFILE_REQUEST_TOPIC]: "tcc.compliance.profile.queue",
  [NIN_VERIFICATION_TOPIC]: "bulk.user.tin.verification.queue",
  [NIN_VERIFICATION_RESULT_TOPIC]: "nin_verification_result_queue",
  [BULK_TAXPAYER_RESULT_TOPIC]: "bulk_taxpayer_result_queue",
  [TCC_REQUEST_TIN_VALIDATION_TOPIC]: "tms.auth.tcc.request.validation.queue",
  [TCC_REQUEST_EMPLOYEE_TIN_VALIDATION_TOPIC]:
    "tms.auth.employee.tcc.request.validation.queue",
  [BULK_NATIONAL_TAXPAYER_UPLOAD_TOPIC]: "bulk.national.taxpayer.upload.queue", //BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC
  [BULK_EXPARTIATE_TAXPAYER_UPLOAD_TOPIC]:
    "bulk.expartiate.taxpayer.upload.queue", //BULK_COMPANY_UPLOAD_TOPIC
  [BULK_COMPANY_BRANCH_UPLOAD_TOPIC]: "bulk.company.branch.upload.queue",
  [BULK_COMPANY_UPLOAD_TOPIC]: "bulk.company.upload.queue",

};

