import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ProblemPage = () => {
    const { id } = useParams();
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState('// Write your code here\n// For this problem, your code should read from process.argv[2] and print to console.log\n// Example: const input = process.argv[2].split(\' \');');
    const [submission, setSubmission] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/problems/${id}`);
                setProblem(res.data);
            } catch (err) {
                console.error(`Error fetching problem ${id}:`, err);
            }
        };
        fetchProblem();

        // Cleanup interval on component unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [id]);

    const checkStatus = async (submissionId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/submissions/${submissionId}`);
            const currentSubmission = res.data;
            setSubmission(currentSubmission);

            if (currentSubmission.status === 'Success' || currentSubmission.status === 'Fail') {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        } catch (err) {
            console.error('Error checking status:', err);
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleSubmit = async () => {
        if (intervalRef.current) return; // Don't submit if already polling

        const payload = {
            problemId: id,
            code,
            language: 'javascript'
        };

        try {
            setSubmission({ status: 'Submitting...', output: '' });
            const res = await axios.post('http://localhost:5000/api/submit', payload);
            const newSubmission = res.data;
            setSubmission(newSubmission);

            // Start polling
            intervalRef.current = setInterval(() => {
                checkStatus(newSubmission._id);
            }, 2000);

        } catch (err) {
            console.error('Error submitting code:', err);
            setSubmission({ status: 'Error', output: 'An error occurred during submission.' });
        }
    };

    if (!problem) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h2>{problem.title}</h2>
            <p>{problem.description}</p>
            <textarea 
                value={code} 
                onChange={(e) => setCode(e.target.value)} 
                rows="20"
                cols="75"
                disabled={submission && (submission.status === 'Pending' || submission.status === 'Running')}
            />
            <br />
            <button 
                onClick={handleSubmit} 
                disabled={submission && (submission.status === 'Pending' || submission.status === 'Running')}
            >
                {submission && (submission.status === 'Pending' || submission.status === 'Running') ? 'Judging...' : 'Submit'}
            </button>
            <h3>Status: {submission ? submission.status : 'Not submitted'}</h3>
            {submission && submission.output && (
                <>
                    <h3>Output:</h3>
                    <pre>{submission.output}</pre>
                </>
            )}
        </div>
    );
};

export default ProblemPage;