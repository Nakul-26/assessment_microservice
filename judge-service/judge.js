import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { createClient } from 'redis';

import Problem from './models/Problem.js';
import Submission from './models/Submission.js';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis Client
const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';
const redisClient = createClient({ url: REDIS_URI });
redisClient.on('error', (err) => console.log('❌ Redis Client Error', err));
redisClient.connect().then(() => console.log('✅ Redis client connected'));

export const executeCode = async (submissionId) => {
    console.log(`Processing submission: ${submissionId}`);
    const submission = await Submission.findById(submissionId);
    if (!submission) {
        console.error(`❌ Submission with ID ${submissionId} not found.`);
        return;
    }

    const problem = await Problem.findById(submission.problem);
    if (!problem) {
        console.error(`❌ Problem with ID ${submission.problem} not found.`);
        submission.status = 'Fail';
        submission.output = 'Internal error: Problem not found.';
        await submission.save();
        return;
    }

    console.log(`Found problem: ${problem.title}`);
    submission.status = 'Running';
    await submission.save();

    const tempDir = path.join(__dirname, 'temp');
    const filePath = path.join(tempDir, `code-${Date.now()}.js`);
    if (!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`Created temp directory: ${tempDir}`);
    }
    fs.writeFileSync(filePath, submission.code);
    console.log(`Wrote submission code to: ${filePath}`);

    let passedAllTests = true;
    let finalOutput = '';

    try {
        for (const [index, testCase] of problem.testCases.entries()) {
            console.log(`Running test case ${index + 1}/${problem.testCases.length}`);
            const command = `node ${filePath} ${testCase.input}`;

            const execution = new Promise((resolve, reject) => {
                exec(command, { timeout: 5000 }, (error, stdout, stderr) => { // 5 second timeout
                    if (error) {
                        return reject({ type: 'error', output: stderr || error.message });
                    }
                    resolve(stdout.trim());
                });
            });

            const output = await execution;
            if (output !== testCase.expectedOutput) {
                passedAllTests = false;
                finalOutput = `Test failed on input: ${testCase.input}\nExpected: ${testCase.expectedOutput}\nGot: ${output}`;
                console.log(`Test case ${index + 1} failed`);
                break;
            }
            console.log(`Test case ${index + 1} passed`);
        }
    } catch (err) {
        passedAllTests = false;
        finalOutput = `Execution Error: ${err.output}`;
        console.error(`Execution error for submission ${submissionId}:`, err);
    }

    fs.unlinkSync(filePath); // Clean up the temp file
    console.log(`Deleted temp file: ${filePath}`);

    submission.status = passedAllTests ? 'Success' : 'Fail';
    submission.output = passedAllTests ? 'All test cases passed!' : finalOutput;
    await submission.save();

    // Cache the final result in Redis
    await redisClient.set(`submission:${submissionId}`, JSON.stringify(submission), { EX: 3600 }); // Cache for 1 hour

    console.log(`✅ Finished judging submission ${submissionId}. Result: ${submission.status}. Cached in Redis.`);
};