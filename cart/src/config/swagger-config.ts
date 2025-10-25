import { OpenAPIObject } from 'openapi3-ts/oas31';

export const swaggerSpec: OpenAPIObject = {
  openapi: '3.1.0',
  info: {
    title: 'Auth Service API',
    version: '1.0.0',
    description: 'Authentication and authorization endpoints for the Tax Management System',
  },
  servers: [
    {
      url: 'http://localhost:4012',
      description: 'Auth Service',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
  ],
  paths: {
    '/api/v1/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account with the specified details',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SignupRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UserResponse'
                }
              }
            }
          },
          '400': {
            description: 'Bad request - validation failed'
          },
          '409': {
            description: 'User already exists'
          }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user',
        description: 'Authenticate user and return JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginResponse'
                }
              }
            }
          },
          '400': {
            description: 'Bad request - validation failed'
          },
          '401': {
            description: 'Invalid credentials'
          }
        }
      }
    },
    '/api/v1/auth/request-reset': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset',
        description: 'Request a password reset for the specified email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PasswordResetRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset request sent successfully'
          },
          '404': {
            description: 'User not found'
          }
        }
      }
    },
    '/api/v1/auth/password-reset': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password',
        description: 'Reset user password using reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PasswordResetConfirmRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset successful'
          },
          '400': {
            description: 'Bad request - validation failed'
          },
          '404': {
            description: 'Reset token not found or expired'
          }
        }
      }
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout user',
        description: 'Invalidate the user\'s session token',
        security: [
          {
            bearerAuth: []
          }
        ],
        responses: {
          '200': {
            description: 'Logout successful'
          },
          '401': {
            description: 'Unauthorized access'
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      UserResponse: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address",
          },
          userType: {
            type: 'string',
            enum: ['INDIVIDUAL', 'COMPANY'],
            description: 'Type of user account',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the user was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp when the user was last updated',
          }
        },
        required: ['_id', 'email', 'userType', 'createdAt', 'updatedAt']
      },
      SignupRequest: {
        type: 'object',
        properties: {
          userType: {
            type: 'string',
            enum: ['INDIVIDUAL', 'COMPANY'],
            description: 'Type of user account (Individual or Company)',
          },
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address",
          },
          phone: {
            type: 'string',
            pattern: '^[0-9]{10,15}$',
            description: "User's phone number",
          },
          houseNumber: {
            type: 'string',
            description: 'House number (optional)',
          },
          streetName: {
            type: 'string',
            description: 'Street name (optional)',
          },
          cityTownArea: {
            type: 'string',
            description: 'City/town/area (optional)',
          },
          lga: {
            type: 'string',
            description: 'Local Government Area',
          },
          state: {
            type: 'string',
            description: 'State',
          },
          proofOfResidency: {
            type: 'string',
            enum: ['UTILITY_BILL', 'LEASE_AGREEMENT', 'BANK_STATEMENT'],
            description: 'Type of proof of residency',
          },
          secondaryPhone: {
            type: 'string',
            pattern: '^[0-9]{10,15}$',
            description: 'Secondary phone number (optional)',
          },
          natureOfBusiness: {
            type: 'string',
            description: 'Nature of business (optional)',
          },
          firstName: {
            type: 'string',
            description: 'First name (required for individual users)',
          },
          lastName: {
            type: 'string',
            description: 'Last name (required for individual users)',
          },
          employmentDetails: {
            type: 'object',
            properties: {
              dateOfEntry: {
                type: 'string',
                format: 'date',
                description: 'Date of entry (optional)',
              },
              employerTaxId: {
                type: 'string',
                description: 'Employer tax ID (optional)',
              },
              employerJtbTin: {
                type: 'string',
                description: 'Employer JTB TIN (optional)',
              },
              nameOfBusiness: {
                type: 'string',
                description: 'Name of business (optional)',
              },
              businessAddress: {
                type: 'string',
                description: 'Business address (optional)',
              },
            },
            description: 'Employment details (optional)',
          },
          unemploymentDetails: {
            type: 'object',
            properties: {
              nameOfLastEmployer: {
                type: 'string',
                description: 'Name of last employer (optional)',
              },
              lastDateEmployed: {
                type: 'string',
                format: 'date',
                description: 'Last date employed (optional)',
              },
              addressOfLastEmployer: {
                type: 'string',
                description: 'Address of last employer (optional)',
              },
              businessSectorOfEmployer: {
                type: 'string',
                description: 'Business sector of employer (optional)',
              },
            },
            description: 'Unemployment details (optional)',
          },
        },
        required: [
          'userType',
          'email',
          'phone',
          'lga',
          'state',
          'proofOfResidency'
        ]
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address",
          },
          password: {
            type: 'string',
            format: 'password',
            description: "User's password",
          },
        },
        required: ['email', 'password']
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
          },
          refreshToken: {
            type: 'string',
            description: 'JWT refresh token',
          },
          user: {
            type: 'object',
            properties: {
              _id: {
                type: 'string',
                description: 'User ID',
              },
              email: {
                type: 'string',
                format: 'email',
                description: "User's email address",
              },
              userType: {
                type: 'string',
                enum: ['INDIVIDUAL', 'COMPANY'],
                description: 'Type of user account',
              },
            },
          },
        },
      },
      PasswordResetRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: "User's email address",
          },
        },
        required: ['email']
      },
      PasswordResetConfirmRequest: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'Password reset token',
          },
          password: {
            type: 'string',
            format: 'password',
            description: 'New password',
          },
          confirmPassword: {
            type: 'string',
            format: 'password',
            description: 'Confirm new password',
          },
        },
        required: ['token', 'password', 'confirmPassword']
      },
    }
  }
};
