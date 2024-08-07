// Header.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

function Header({ showPlanSelector, planName, setPlanName, savedPlans, onSave, onRename, onDelete, onLoad }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newPlanName, setNewPlanName] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSave = () => {
    if (currentUser) {
      onSave();
      setIsDropdownOpen(false);
    } else {
      alert("Please log in to save your plan.");
    }
  };

  const handleRename = async (planId, name) => {
    try {
      await onRename(planId, name);
      setEditingPlanId(null);
      setNewPlanName('');
    } catch (error) {
      console.error('Error renaming plan:', error);
    }
  };

  const handleDelete = (planId) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      onDelete(planId);
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/');
    }).catch((error) => {
      console.error('Error signing out:', error);
    });
  };

  const handleLoadPlan = (plan) => {
    onLoad(plan);
    setIsDropdownOpen(false);
  };

  return (
    <header className="flex justify-between items-center p-4 bg-gray-100">
      {showPlanSelector && (
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center text-xl font-bold"
          >
            {planName} <span className="ml-2">▼</span>
          </button>
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white shadow-lg rounded-md">
              {!currentUser && <p className="p-4">Log in to save your plans and access your saved plans.</p>}
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="w-full p-2 border-b"
                placeholder="Enter plan name"
              />
              <button 
                onClick={handleSave}
                className="w-full bg-blue-500 text-white px-4 py-2 hover:bg-blue-600"
              >
                Save Plan
              </button>
              {currentUser && savedPlans.map((plan) => (
                <div key={plan.id} className="p-2 hover:bg-gray-100 flex justify-between items-center">
                  {editingPlanId === plan.id ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(plan.id, newPlanName);
                    }}>
                      <input
                        type="text"
                        value={newPlanName}
                        onChange={(e) => setNewPlanName(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="text-blue-500 ml-2">
                        Save
                      </button>
                    </form>
                  ) : (
                    <span onClick={() => handleLoadPlan(plan)}>{plan.name}</span>
                  )}
                  <div>
                    <button 
                      onClick={() => {
                        setEditingPlanId(plan.id);
                        setNewPlanName(plan.name);
                      }}
                      className="text-blue-500 mr-2"
                    >
                      Rename
                    </button>
                    <button 
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <nav className="flex items-center space-x-4">
        <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
        {currentUser ? (
          <>
            <Link to="/profile" className="text-blue-600 hover:text-blue-800">Profile</Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-blue-600 hover:text-blue-800">Login</Link>
            <Link to="/register" className="text-blue-600 hover:text-blue-800">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;