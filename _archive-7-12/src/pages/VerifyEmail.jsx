import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function VerifyEmail() {
  const { currentUser } = useAuth();
  const [time, setTime] = useState(60);
  const [timeActive, setTimeActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      currentUser?.reload()
        .then(() => {
          if (currentUser?.emailVerified) {
            clearInterval(interval);
            navigate('/');
          }
        })
        .catch((err) => {
          alert(err.message);
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, currentUser]);

  useEffect(() => {
    let interval = null;
    if (timeActive && time !== 0) {
      interval = setInterval(() => {
        setTime((time) => time - 1);
      }, 1000);
    } else if (time === 0) {
      setTimeActive(false);
      setTime(60);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timeActive, time]);

  const resendEmailVerification = () => {
    sendEmailVerification(auth.currentUser)
      .then(() => {
        setTimeActive(true);
      }).catch((err) => {
        alert(err.message);
      });
  };

  return (
    <div>
      <div id='page-contained' className='verifyEmail'>
        <h1>Verify your Email Address</h1>
        <p>
          <strong>A Verification email has been sent to:</strong><br />
          <span>{currentUser?.email}</span>
        </p>
        <span>Follow the instruction in the email to verify your account</span>       
        <button 
          onClick={resendEmailVerification}
          disabled={timeActive}
        >
          Resend Email {timeActive && time}
        </button>
      </div>
    </div>
  );
}

export default VerifyEmail;