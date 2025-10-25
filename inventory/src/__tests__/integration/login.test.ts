// import {
//   afterAll,
//   beforeAll,
//   beforeEach,
//   describe,
//   expect,
//   it,
//   jest,
// } from '@jest/globals';
// import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';
// import request from 'supertest';
// import { app } from '../../app';
// import User from '../../models/User';
// import { taxPayerMockData } from '../../data';
// import bcrypt from 'bcryptjs';
// import redisClient from '../../config/redis';
// import { sendUserMessage } from '../../messaging/producer';
// import { generateSecureToken } from '../../utils/resetTokenGenerator';
// import { normalizePhoneNumber } from '../../utils/normalizePhoneNumber';
// import { v4 as uuidv4 } from 'uuid';

// // types
// interface BcryptMock {
//   hash: jest.Mock<(password: string, salt: number | string) => Promise<string>>;
//   compare: jest.Mock<(password: string, hash: string) => Promise<boolean>>;
// }

// interface RedisClientMock {
//   setex: jest.Mock<(key: string, timeout: number, value: string) => Promise<string>>;
//   del: jest.Mock<(key: string | string[]) => Promise<number>>;
//   quit: jest.Mock<() => Promise<void>>;
// }

// interface SendUserMessageMock {
//   mockResolvedValue(undefined: undefined): unknown;
//   (topic: string, message: any): Promise<void>;
// }

// interface GenerateSecureTokenMock {
//   mockResolvedValue(arg0: string): unknown;
//   (): Promise<string>;
// }

// interface NormalizePhoneNumberMock {
//   mockReturnValue(arg0: string): unknown;
//   (phone: string): string;
// }

// interface UuidV4Mock {
//   mockReturnValue(arg0: string): unknown;
//   (): string;
// }

// // Mock external 
// jest.mock('bcryptjs', () => ({
//   hash: jest.fn<(password: string, salt: number | string) => Promise<string>>(),
//   compare: jest.fn<(password: string, hash: string) => Promise<boolean>>(),
// }));

// jest.mock('../../config/redis', () => ({
//   setex: jest.fn<(key: string, timeout: number, value: string) => Promise<string>>(),
//   del: jest.fn<(key: string | string[]) => Promise<number>>(),
//   quit: jest.fn<() => Promise<void>>(),
// }));

// jest.mock('../../messaging/producer', () => ({
//   sendUserMessage: jest.fn<(topic: string, message: any) => Promise<void>>(),
// }));

// jest.mock('../../utils/resetTokenGenerator', () => ({
//   generateSecureToken: jest.fn<() => Promise<string>>(),
// }));

// jest.mock('../../utils/normalizePhoneNumber', () => ({
//   normalizePhoneNumber: jest.fn<(phone: string) => string>(),
// }));

// jest.mock('uuid', () => ({
//   v4: jest.fn<() => string>(),
// }));

// // Set Jest timeout for integration tests
// jest.setTimeout(10000);

// // Mock environment variables
// process.env.WEB_ORIGIN = 'http://localhost:3000';

// let mongoServer: MongoMemoryServer;
// let mockedRedis: RedisClientMock = redisClient as any;
// const mockedBcrypt: BcryptMock = bcrypt as any;
// const mockedSendUserMessage: SendUserMessageMock = sendUserMessage as any;
// const mockedGenerateSecureToken: GenerateSecureTokenMock = generateSecureToken as any;
// const mockedNormalizePhoneNumber: NormalizePhoneNumberMock = normalizePhoneNumber as any;
// const mockedUuidV4: UuidV4Mock = uuidv4 as any;

// beforeAll(async () => {
//   mongoServer = await MongoMemoryServer.create();
//   await mongoose.connect(mongoServer.getUri());
// });

// afterAll(async () => {
//   await mongoose.disconnect();
//   await mongoServer.stop();
//   await mockedRedis.quit();
// });

// beforeEach(async () => {
//   await User.deleteMany({});
//   await mockedRedis.del(['2fa:*']);
//   jest.clearAllMocks(); 
// });

// describe('POST /api/v1/auth/login', () => {
//   const password = 'TestPass123!';

//   beforeEach(async () => {
//     // Mock bcrypt.hash for user creation
//     mockedBcrypt.hash.mockResolvedValue('hashedPassword');

//     // Create a test user
//     await User.create({
//       ...taxPayerMockData,
//       passwordHash: 'hashedPassword',
//     });

//     // Mock bcrypt.compare for login
//     mockedBcrypt.compare.mockResolvedValue(true);

//     // Mock generateSecureToken for 2FA
//     mockedGenerateSecureToken.mockResolvedValue('123456');

//     // Mock redisClient.setex for 2FA token storage
//     mockedRedis.setex.mockResolvedValue('OK');

//     // Mock sendUserMessage for notifications
//     mockedSendUserMessage.mockResolvedValue(undefined);

//     // Mock normalizePhoneNumber
//     mockedNormalizePhoneNumber.mockReturnValue('+2347065819848');

//     // Mock uuidv4 for notificationId
//     mockedUuidV4.mockReturnValue('mock-notification-id');
//   });

//   // describe('Success Case', () => {
//   //   it('should login successfully with valid TIN and password, sending 2FA code', async () => {})
//   // });

//   describe('Validation Errors', () => {
//     it('should return 400 if password is invalid', async () => {
//       mockedBcrypt.compare.mockResolvedValue(false);
//       const response = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ tin: taxPayerMockData.tin, password: 'wrongPassword' })
//         .set('x-forwarded-for', '127.0.0.1')
//         .set('user-agent', 'test-agent');
//       expect(response.status).toEqual(400);
//       expect(response.body.message).toEqual('Please provide a valid password!');
//     });

//     it('should return 404 if user does not exist', async () => {
//       await User.deleteMany({});
//       const response = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ tin: 'NON-EXISTENT-TIN', password })
//         .set('x-forwarded-for', '127.0.0.1')
//         .set('user-agent', 'test-agent');
//       expect(response.status).toEqual(404);
//       expect(response.body.message).toEqual('You do not have any record with us!!');
//     });
//   });
// });