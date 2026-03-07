const mongoose = require('mongoose');
const AdminOTP = require('./backend/models/AdminOTP');
const Round = require('./backend/models/Round');
const Submission = require('./backend/models/Submission');
const User = require('./backend/models/User');

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ccc');
        console.log('Connected to MongoDB');

        // 1. Setup mock data
        const adminA = new mongoose.Types.ObjectId();
        const adminB = new mongoose.Types.ObjectId();
        const student = new mongoose.Types.ObjectId();
        const roundId = new mongoose.Types.ObjectId();

        // 2. Simulate Admin A generating OTP
        const otpA = { adminId: adminA, roundId, startOtp: '111111', endOtp: '222222', otpIssuedAt: new Date() };
        await AdminOTP.create(otpA);
        console.log('Admin A generated OTP 111111');

        // 3. Simulate Admin B generating OTP
        const otpB = { adminId: adminB, roundId, startOtp: '333333', endOtp: '444444', otpIssuedAt: new Date() };
        await AdminOTP.create(otpB);
        console.log('Admin B generated OTP 333333');

        // 4. Verify Admin A sees only their OTP
        const foundA = await AdminOTP.findOne({ adminId: adminA, roundId });
        console.log('Admin A found OTP:', foundA.startOtp);
        if (foundA.startOtp !== '111111') throw new Error('Admin A OTP mismatch');

        // 5. Simulate student joining with Admin B's OTP
        const inputOtp = '333333';
        const validOtpDoc = await AdminOTP.findOne({ roundId, startOtp: inputOtp });

        if (validOtpDoc) {
            console.log('Student found valid OTP doc for Admin:', validOtpDoc.adminId);
            const submission = new Submission({
                student,
                round: roundId,
                status: 'IN_PROGRESS',
                startTime: new Date(),
                conductedBy: validOtpDoc.adminId
            });
            await submission.save();
            console.log('Submission created with conductedBy:', submission.conductedBy);
        } else {
            throw new Error('OTP verification failed');
        }

        console.log('Test completed successfully!');
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
