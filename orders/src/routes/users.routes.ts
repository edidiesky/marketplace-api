import { Router } from "express";
import {
  authenticate,
  requirePermissions,
  requireDirectorate,
  requireMinimumRoleLevel,
} from "../middleware/auth.middleware";
import {
  GetAllUsersHandler,
  GetSingleUsersHandler,
  UpdateUserHandler,
  GetAggregatedUserHandler,
  DeleteUserHandler,
  GetAggregatedCompanyEmployeesHandler,
  DownloadTaxPayerRecordAsCSV,
  GetAggregatedAdminHandler,
  GetAggregatedAgencyHandler,
} from "../controllers/user.controller";
import { validateRequest } from "../middleware/validate.middleware";
import { userUpdateSchema } from "../validators/user.validator";
import createLimiter from "../utils/customRateLimiter";
import { DirectorateType, Permission, RoleLevel } from "../models/User";
import { sendUserMessage } from "../messaging/producer";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all users (requires READ_USER permission and appropriate directorate)
router.get(
  "/",
  // createLimiter({
  //   windowMs: 5 * 60 * 1000,
  //   max: 25,
  //   prefix: "auth",
  //   onLimitReached: (req) => {
  //     sendUserMessage("RATE_LIMIT_ALERT", {
  //       userId: req.user?.userId,
  //       ip: req.ip,
  //       path: req.path,
  //       timestamp: new Date(),
  //     });
  //   },
  // }),
  // requirePermissions([Permission.READ_USER]),
  // requireDirectorate([
  //   DirectorateType.ICT,
  //   DirectorateType.MDA,
  //   DirectorateType.PAYE,
  //   DirectorateType.ASSESSMENT,
  //   DirectorateType.AGENT,
  //   DirectorateType.CHAIRMAN,
  //   DirectorateType.BANK,
  //   DirectorateType.SCHOOL,
  // ]),
  GetAllUsersHandler
);

router.get("/aggregated-agencies", GetAggregatedAgencyHandler);
router.get(
  "/aggregated-adminstrators",
  // createLimiter({
  //   windowMs: 5 * 60 * 1000,
  //   max: 25,
  //   prefix: "auth",
  //   onLimitReached: (req) => {
  //     sendUserMessage("RATE_LIMIT_ALERT", {
  //       userId: req.user?.userId,
  //       ip: req.ip,
  //       path: req.path,
  //       timestamp: new Date(),
  //     });
  //   },
  // }),
  // requirePermissions([Permission.READ_USER]),
  // requireDirectorate([
  //   DirectorateType.ICT,
  //   DirectorateType.MDA,
  //   DirectorateType.PAYE,
  //   DirectorateType.ASSESSMENT,
  //   DirectorateType.AGENT,
  //   DirectorateType.CHAIRMAN,
  //   DirectorateType.BANK,
  //   DirectorateType.SCHOOL,
  // ]),
  GetAggregatedAdminHandler
);

// Download user records as CSV (requires EXPORT_DATA permission)
router.get("/generate-user-record-csv/user", DownloadTaxPayerRecordAsCSV);

// Get a single user (requires READ_USER permission or self-access)
router.get(
  "/:id",
  // requirePermissions([Permission.READ_USER]),
  GetSingleUsersHandler
);

// Update a user (requires UPDATE_USER permission or self-access)
router.put(
  "/:id",
  requirePermissions([Permission.UPDATE_USER]),
  validateRequest(userUpdateSchema),
  UpdateUserHandler
);

// Delete a user (requires DELETE_USER permission and SUPER_ADMIN level)
router.delete(
  "/:id",
  requirePermissions([Permission.DELETE_USER]),
  requireMinimumRoleLevel(RoleLevel.SUPER_ADMIN),
  DeleteUserHandler
);

// Get aggregated user data (requires VIEW_REPORTS permission)
router.get(
  "/aggregated-users/users",
  requirePermissions([Permission.VIEW_REPORTS]),
  GetAggregatedUserHandler
);

// Get aggregated company employees (requires READ_USER permission and ASSESSMENT or BANK directorate)
router.get(
  "/aggregated-employees/company",
  // requirePermissions([Permission.READ_USER]),
  // requireDirectorate([DirectorateType.ASSESSMENT, DirectorateType.BANK]),
  GetAggregatedCompanyEmployeesHandler
);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The user's unique ID
 *         tin:
 *           type: string
 *           description: Taxpayer Identification Number
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         userType:
 *           type: string
 *           enum: [INDIVIDUAL, COMPANY, ADMIN, AKIRS]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users with filtering and pagination
 *     description: Retrieves a list of users with optional filtering and pagination. Only accessible to ADMIN and AKIRS roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [INDIVIDUAL, COMPANY, ADMIN, AKIRS]
 *         description: Filter by user type
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: lga
 *         schema:
 *           type: string
 *         description: Filter by local government area
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created before this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by TIN, name, phone, or company name
 *     responses:
 *       200:
 *         description: List of users with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalCount:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient privileges
 *
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a single user by ID
 *     description: Retrieves a single user by ID. Users can only access their own data unless they have ADMIN or AKIRS roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to fetch
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient privileges
 *       404:
 *         description: User not found
 *
 *   put:
 *     tags: [Users]
 *     summary: Update a user by ID
 *     description: Updates a user's details by ID. Only ADMIN and AKIRS roles can update any user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient privileges
 *       404:
 *         description: User not found
 *
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user by ID
 *     description: Deletes a user by ID. Only ADMIN and AKIRS roles can delete users.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient privileges
 *       404:
 *         description: User not found
 *
 * /api/v1/users/aggregated-users:
 *   get:
 *     tags: [Users]
 *     summary: Get aggregated user data
 *     description: Retrieves aggregated data about users (e.g., total users, corporate, individual). Only accessible to ADMIN and AKIRS roles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeFrameDays
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Time frame in days for total users
 *       - in: query
 *         name: activeTimeFrameDays
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Time frame in days for active users
 *       - in: query
 *         name: corporateTimeFrameDays
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Time frame in days for corporate users
 *       - in: query
 *         name: individualFrameDays
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Time frame in days for individual users
 *     responses:
 *       200:
 *         description: Aggregated user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTaxUsers:
 *                   type: string
 *                 totalCorporateUsers:
 *                   type: string
 *                 totalIndividualUsers:
 *                   type: string
 *                 totalActiveUsers:
 *                   type: string
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient privileges
 */
