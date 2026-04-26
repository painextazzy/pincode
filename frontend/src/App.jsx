// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PinPad from './components/PinPad';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Dashboard avec ses sous-routes */}
        <Route path="/*" element={<PinPad />} />
      </Routes>
    </Router>
  );
}

export default App;