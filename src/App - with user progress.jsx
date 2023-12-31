import React, { useState, useEffect } from 'react';

const formatNumberWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseFormattedNumber = (formattedNumber) => {
  return parseFloat(formattedNumber.replace(/,/g, '')) || 0;
};

const RetirementPlanner = () => {
  const [userProgress, setUserProgress] = useState([]);
  const [editedUserProgress, setEditedUserProgress] = useState([]);
  const [yearsForUserProgress, setYearsForUserProgress] = useState('');
  const [currentAssets, setCurrentAssets] = useState(localStorage.getItem('currentAssets') || '');
  const [yearsTillRetirement, setYearsTillRetirement] = useState(localStorage.getItem('yearsTillRetirement') || '');
  const [estimatedReturn, setEstimatedReturn] = useState(localStorage.getItem('estimatedReturn') || '');
  const [contributionAmount, setContributionAmount] = useState(localStorage.getItem('contributionAmount') || '');
  const [compoundingFrequency, setCompoundingFrequency] = useState('yearly');
  const [results, setResults] = useState([]);
  const [showInputs, setShowInputs] = useState(true);
  const [enteredValues, setEnteredValues] = useState({
    currentAssets: '',
    yearsTillRetirement: '',
    estimatedReturn: '',
    contributionAmount: '',
    compoundingFrequency: 'yearly',
  });

  useEffect(() => {
    setEnteredValues({
      currentAssets,
      yearsTillRetirement,
      estimatedReturn,
      contributionAmount,
      compoundingFrequency,
    });

    localStorage.setItem('currentAssets', currentAssets);
    localStorage.setItem('yearsTillRetirement', yearsTillRetirement);
    localStorage.setItem('estimatedReturn', estimatedReturn);
    localStorage.setItem('contributionAmount', contributionAmount);
    localStorage.setItem('compoundingFrequency', compoundingFrequency);

    calculateRetirementPlan();
  }, [currentAssets, yearsTillRetirement, estimatedReturn, contributionAmount, compoundingFrequency]);

  const calculateRetirementPlan = () => {
    let currentTotal = parseFormattedNumber(currentAssets);
    const returnRate = parseFloat(estimatedReturn) / 100;
    const contribution = parseFormattedNumber(contributionAmount);

    const newUserProgress = userProgress.map(user => ({
      period: user.period,
      startingAmount: parseFormattedNumber(user.startingAmount),
      contribution: parseFormattedNumber(user.contribution),
      interest: parseFormattedNumber(user.interest),
    }));

    const newResults = Array.from({ length: parseInt(yearsTillRetirement) }, (_, index) => {
      const yearlyReturn = currentTotal * returnRate;

      const userProgressValues = newUserProgress[index] || { startingAmount: 0, contribution: 0, interest: 0 };

      const startingAmount = currentTotal + userProgressValues.startingAmount;
      const contributions = contribution + userProgressValues.contribution;
      const interest = userProgressValues.interest;
      const compoundInterestAccrued = currentTotal + contributions + interest - startingAmount;

      currentTotal = startingAmount + yearlyReturn;

      const totalWithContribution = currentTotal + contributions;

      return {
        period: index + 1,
        startingAmount: formatNumberWithCommas(startingAmount.toFixed(2)),
        compoundingAmount: formatNumberWithCommas(yearlyReturn.toFixed(2)),
        contributionAmount: formatNumberWithCommas(contributions.toFixed(2)),
        total: formatNumberWithCommas(totalWithContribution.toFixed(2)),
        compoundInterestAccrued: formatNumberWithCommas(compoundInterestAccrued.toFixed(2)),
      };
    });

    setResults(newResults);
  };

  const handleReset = () => {
    setCurrentAssets('');
    setYearsTillRetirement('');
    setEstimatedReturn('');
    setContributionAmount('');
    setCompoundingFrequency('yearly');
  };

  useEffect(() => {
    const newYearsForUserProgress = parseInt(yearsTillRetirement) || 0;
    setYearsForUserProgress(newYearsForUserProgress);

    const newUserProgress = results.map(result => ({
      period: result.period,
      startingAmount: result.startingAmount,
      contribution: result.contributionAmount,
      interest: result.compoundInterestAccrued,
    }));

    setUserProgress(newUserProgress);
    setEditedUserProgress(newUserProgress);
  }, [yearsTillRetirement, results]);

  const handleUserInputChange = (index, field, value) => {
    const newUserProgress = userProgress.slice();
    newUserProgress[index][field] = value;
    setUserProgress(newUserProgress);
  };

  const handleEditedUserInputChange = (index, field, value) => {
    const newEditedUserProgress = editedUserProgress.slice();
    newEditedUserProgress[index][field] = value;
    setEditedUserProgress(newEditedUserProgress);
  };

  const calculateUserProgressTotal = (yearIndex) => {
    const userYearData = userProgress[yearIndex];
    if (!userYearData) {
      return 0;
    }

    const startingAmount = parseFormattedNumber(userYearData.startingAmount);
    const contribution = parseFormattedNumber(userYearData.contribution);
    const interest = parseFormattedNumber(userYearData.interest);

    return startingAmount + contribution + interest;
  };

  const toggleInputs = () => {
    setShowInputs(!showInputs);
  };

  const getTotal = (property) => {
    return results.reduce((total, result) => total + parseFloat(result[property].replace(/,/g, '')), 0).toFixed(2);
  };

  // Calculate final balance and compound interest accrued separately
  const finalBalance = getTotal('total');
  const compoundInterestAccrued = finalBalance - getTotal('startingAmount');

  return (
    <div>
      <h1>Savings Planner</h1>

      <div className='input-container'>
        <div>
          <button onClick={toggleInputs}>{showInputs ? 'Hide Inputs' : 'Show Inputs'}</button>
        </div>

        {(showInputs || !enteredValues) && (
          <div className='inputs'> 
            <div>
              <label>Current Assets:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={`$${currentAssets}`}
                onChange={(e) => setCurrentAssets(e.target.value.replace('$', ''))}
              />
            </div>
            <div>
              <label>Years to save:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={yearsTillRetirement}
                onChange={(e) => setYearsTillRetirement(e.target.value)}
              />
            </div>
            <div>
              <label>Estimated Return (%):</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={estimatedReturn}
                onChange={(e) => setEstimatedReturn(e.target.value)}
              />
            </div>
            <div>
              <label>Contribution Amount:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={`$${contributionAmount}`}
                onChange={(e) => setContributionAmount(e.target.value.replace('$', ''))}
              />
            </div>
            <div>
              <label>Compounding Frequency:</label>
              <select value={compoundingFrequency} onChange={(e) => setCompoundingFrequency(e.target.value)}>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <button onClick={handleReset}>Reset</button>
            </div>
          </div>
        )}

        <div className='display-values' style={{ display: showInputs ? 'none' : 'flex' }}>
          <p><strong>Current Assets:</strong> {`$${currentAssets}`}</p>
          <p><strong>Period:</strong> {yearsTillRetirement}</p>
          <p><strong>Est. Return (%):</strong> {estimatedReturn}</p>
          <p><strong>Contribution:</strong> {`$${contributionAmount}`}</p>
          <p><strong>Frequency:</strong> {compoundingFrequency}</p>
        </div>
      </div>

      <div>
        <div className='results-container'>
          <h2 className='results-heading'>Results</h2>
          <div className='results-header'>
            <div className="year">Period</div>
            <div>Starting</div>
            <div>Compounding</div>
            <div>Contributions</div>
            <div>End Total</div>
          </div>
          <div className="results">
            {results.map((result) => (
              <div className="card" key={result.period}>
                <div className="year">{result.period}</div>
                <div><span className='dollar-sign'>$</span>{result.startingAmount}</div>
                <div><span className='dollar-sign'>$</span>{result.compoundingAmount}</div>
                <div><span className='dollar-sign'>$</span>{result.contributionAmount}</div>
                <div><span className='dollar-sign'>$</span>{result.total}</div>
              </div>
            ))}
          </div>
        </div>

        <div className='progress-container'>
          <h2>User Progress</h2>

          {editedUserProgress.map((user, index) => (
            <div key={index}>
              <h3>{user.period}</h3>
              {/* Editable row with initial values from results */}
              <div className="card">
                <div className="year">{user.period}</div>
                <div>
                  <label>Starting</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={user.startingAmount}
                    onChange={(e) => handleEditedUserInputChange(index, 'startingAmount', e.target.value)}
                  />
                </div>
                <div>
                  <label>Compounding</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={user.compoundingAmount}
                    onChange={(e) => handleEditedUserInputChange(index, 'compoundingAmount', e.target.value)}
                  />
                </div>
                <div>
                  <label>Contribution</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={user.contributionAmount}
                    onChange={(e) => handleEditedUserInputChange(index, 'contributionAmount', e.target.value)}
                  />
                </div>
              </div>

              {/* Display total */}
              <div>
                <p>Total: ${calculateUserProgressTotal(index).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className='totals-section'>
          <h2>Totals</h2>
          <p><strong>Final Balance:</strong> ${finalBalance}</p>
          <p><strong>Interest Accrued:</strong> ${compoundInterestAccrued.toFixed(2)}</p>
          <p><strong>Total Contributions:</strong> ${getTotal('contributionAmount')}</p>
          <p><strong>Return:</strong> {(((finalBalance - getTotal('startingAmount')) / getTotal('startingAmount')) * 100).toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
};

export default RetirementPlanner;
