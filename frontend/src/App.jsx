import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ProblemListPage from './pages/ProblemListPage';
import ProblemPage from './pages/ProblemPage';
import './App.css';

function App() {
    useEffect(() => {
        console.log('App component mounted');
    }, []);

    return (
        <Router>
            <div className="App">
                <h1>Placement Assessment</h1>
                <Routes>
                    <Route path="/" element={<ProblemListPage />} />
                    <Route path="/problems/:id" element={<ProblemPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;