import { Router } from "express";
import { authenticate, requirePermissions } from "../middleware/auth.middleware";
import {
  GetAllTaxStationsHandler,
  GetSingleTaxStationsHandler,
  UpdateTaxStationHandler,
  DeleteTaxStationHandler,
} from "../controllers/taxStation.controller";
import { Permission } from "../models/User";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all users (Public)
router.get("/", GetAllTaxStationsHandler);

// Get a single user (ADMIN/AKIRS or self)
router.get("/:id", GetSingleTaxStationsHandler);

// Update a user (ADMIN/AKIRS or self)
router.put("/:id", requirePermissions([Permission.READ_USER]), UpdateTaxStationHandler);

// Delete a user (ADMIN/AKIRS only)
router.delete(
  "/:id",
  requirePermissions([Permission.READ_USER]),
  DeleteTaxStationHandler
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
