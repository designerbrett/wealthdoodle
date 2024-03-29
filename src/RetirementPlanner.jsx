import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import OptionsModal from './components/OptionsModal';
import { auth, database } from './firebase';
import SignUp from './components/SignUp';
import SignIn from './components/SignIn';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { savePlan, getPlans, deletePlan } from './components/firebaseFunctions';

const formatNumberWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseFormattedNumber = (formattedNumber) => {
  if (typeof formattedNumber === 'number') {
    return formattedNumber;
  }
  return parseFloat((formattedNumber || '').replace(/,/g, '')) || 0;
};

const RetirementPlanner = ({ user, params = {} }) => {
  const [planName, setPlanName] = useState('');
  const { planName: urlPlanName } = params;
  const [currentAssets, setCurrentAssets] = useState(localStorage.getItem('currentAssets') || '');
  const [startingYear, setStartingYear] = useState(new Date().getFullYear());
  const [yearsTillRetirement, setYearsTillRetirement] = useState(localStorage.getItem('yearsTillRetirement') || '');
  const [estimatedReturn, setEstimatedReturn] = useState(localStorage.getItem('estimatedReturn') || '');
  const [contributionAmount, setContributionAmount] = useState(localStorage.getItem('contributionAmount') || '');
  const [compoundingFrequency, setCompoundingFrequency] = useState('yearly');
  const [results, setResults] = useState([]);
  const [showInputs, setShowInputs] = useState(true);
  const [enteredValues, setEnteredValues] = useState({
    currentAssets: '',
    startingYear: '',
    yearsTillRetirement: '',
    estimatedReturn: '',
    contributionAmount: '',
    compoundingFrequency: 'yearly',
  });

  const [planNameState, setPlanNameState] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [planNames, setPlanNames] = useState([]);

  const handleSavePlan = async () => {
    console.log('Plan Name:', planName);
  
    if (planName.trim() === '') {
      alert('Please enter a name for your plan.');
      return;
    }

    const planId = planName;
  
    const planData = {
      currentAssets,
      startingYear,
      yearsTillRetirement,
      estimatedReturn,
      contributionAmount,
      compoundingFrequency,
      results,
      timestamp: new Date().toISOString(),
    };
  
    // Save the plan using the firebaseFunctions.js function
    try {
      await savePlan(user.uid, planId, planData);

      // Optionally handle the planId if needed
      console.log('Plan saved successfully with ID:', planId);

      // Fetch updated plan names after saving a plan
      const plans = await getPlans(user.uid);
      const names = plans.map((plan) => plan.name);
      setPlanNames(names);

      // Clear the planName input
      setPlanName('');

    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        await deletePlan(user.uid, planId);
        // After deleting the plan, you might want to update the list of plans
        const updatedPlans = await getPlans(user.uid);
        setSavedPlans(updatedPlans); // Update the state with the new plans
      } catch (error) {
        console.error('Error deleting plan:', error);
      }
    }
  };

useEffect(() => {
  if (urlPlanName && user) {
    // Fetch the plan data using the firebaseFunctions.js function
    // Replace the following code with your logic to fetch plan data based on urlPlanName and user.uid
    database
      .ref(`users/${user.uid}/plans/${urlPlanName}`)
      .once('value')
      .then((snapshot) => {
        const planData = snapshot.val();

        if (planData) {
          // Update state with the fetched plan data
          setCurrentAssets(planData.currentAssets || '');
          setStartingYear(planData.startingYear || '');
          setYearsTillRetirement(planData.yearsTillRetirement || '');
          setEstimatedReturn(planData.estimatedReturn || '');
          setContributionAmount(planData.contributionAmount || '');
          setCompoundingFrequency(planData.compoundingFrequency || 'yearly');
          setPlanNameState(urlPlanName); // Set the planNameState
        }
      })
      .catch((error) => {
        console.error('Error fetching plan data:', error);
      });
  }
}, [user, urlPlanName]);

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const handleToggleOptionsModal = () => {
    setIsOptionsModalOpen(!isOptionsModalOpen);
  };

  const [visibleOptions, setVisibleOptions] = useState({
    period: true,
    starting: true,
    compounding: true,
    contribution: true,
    total: true,
  });

  useEffect(() => {
    setEnteredValues({
      currentAssets,
      startingYear,
      yearsTillRetirement,
      estimatedReturn,
      contributionAmount,
      compoundingFrequency,
    });

    //localStorage.setItem('currentAssets', currentAssets);
    //localStorage.setItem('yearsTillRetirement', yearsTillRetirement);
    //localStorage.setItem('estimatedReturn', estimatedReturn);
    //localStorage.setItem('contributionAmount', contributionAmount);
    //localStorage.setItem('compoundingFrequency', compoundingFrequency);

    calculateRetirementPlan();
  }, [currentAssets, startingYear, yearsTillRetirement, estimatedReturn, contributionAmount, compoundingFrequency, visibleOptions]);

  useEffect(() => {
    calculateRetirementPlan();
  }, [visibleOptions]);

  const calculateRetirementPlan = () => {
    let currentTotal = parseFormattedNumber(currentAssets);
    const returnRate = parseFloat(estimatedReturn) / 100;
    const compoundingFactor = compoundingFrequency === 'yearly' ? 1 : 12;
    const contribution = parseFormattedNumber(contributionAmount);
  
    let newResults = [];
  
    for (let index = 0; index < parseInt(yearsTillRetirement) * compoundingFactor; index++) {
      const yearlyReturn = currentTotal * returnRate;
      const monthlyReturn = yearlyReturn / 12;
      const currentYear = parseInt(startingYear) + Math.floor(index / compoundingFactor);
  
      // Calculate the starting amount based on the period
      const startingAmount = index === 0 ? currentTotal : parseFormattedNumber(newResults[index - 1].total);
  
      currentTotal = startingAmount + (compoundingFrequency === 'yearly' ? yearlyReturn : monthlyReturn);
  
      const totalWithContribution = currentTotal + contribution;
  
      newResults.push({
        period: currentYear, // Use currentYear as the period
        startingAmount: formatNumberWithCommas(startingAmount.toFixed(2)),
        compoundingAmount: formatNumberWithCommas((compoundingFrequency === 'yearly' ? yearlyReturn : monthlyReturn).toFixed(2)),
        contributionAmount: formatNumberWithCommas(contribution.toFixed(2)),
        total: formatNumberWithCommas(totalWithContribution.toFixed(2)),
      });
    }
  
    const totalContributions = parseFormattedNumber(
      newResults.reduce((total, result) => total + parseFormattedNumber(result.contributionAmount), 0)
    ).toFixed(2);
  
    const finalBalance = newResults.length > 0 ? parseFormattedNumber(newResults[newResults.length - 1].total) : 0;
    const compoundInterestAccrued =
      newResults.length > 0
        ? finalBalance - parseFormattedNumber(newResults[0].startingAmount) - parseFormattedNumber(totalContributions)
        : 0;
  
    const returnPercentage =
      newResults.length > 0
        ? (
            (finalBalance - parseFormattedNumber(newResults[0]?.startingAmount)) /
            parseFormattedNumber(newResults[0]?.startingAmount) *
            100
          ).toFixed(2)
        : 0;
  
    // Use the newResults array for rendering
    setResults(newResults);
    setReturnPercentage(returnPercentage);
  };
  
  const handleReset = () => {
    setCurrentAssets('');
    setYearsTillRetirement('');
    setEstimatedReturn('');
    setContributionAmount('');
    setCompoundingFrequency('yearly');
  };

  const toggleInputs = () => {
    setShowInputs(!showInputs);
  };

  const handleOptionToggle = (option) => {
    setVisibleOptions((prevOptions) => ({
      ...prevOptions,
      [option]: !prevOptions[option],
    }));
  };

  const getTotal = (property) => {
    return results.reduce((total, result) => total + parseFloat(result[property].replace(/,/g, '')), 0).toFixed(2);
  };

  const [returnPercentage, setReturnPercentage] = useState(0);

  const totalContributions = getTotal('contributionAmount');
  const finalBalance = results.length > 0 ? parseFormattedNumber(results[results.length - 1].total) : 0;
  const compoundInterestAccrued = results.length > 0 ? finalBalance - parseFormattedNumber(results[0].startingAmount) - parseFormattedNumber(totalContributions) : 0;

  const getTotalWithCommas = (property) => {
    const total = getTotal(property);
    return formatNumberWithCommas(total);
  };

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );

  const chartOptions = {
    plugins: {
      title: {
        display: true,
        text: 'Stacked Bar Chart',
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Period',
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Amount ($)',
        },
      },
    },
  };
  
  const labels = results.map((result) => result.period);
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Starting Amount',
        data: results.map((result) => parseFormattedNumber(result.startingAmount)),
        backgroundColor: 'rgba(75,192,192,1)',
      },
      {
        label: 'Interest',
        data: results.map((result) => parseFormattedNumber(result.compoundingAmount)),
        backgroundColor: 'rgba(255,99,132,1)',
      },
      {
        label: 'Contribution',
        data: results.map((result) => parseFormattedNumber(result.contributionAmount)),
        backgroundColor: 'rgba(255,205,86,1)',
      },
    ],
  };

  return (
    <div>
      <div className='input-container'>
        <div>
          <button onClick={toggleInputs}>{showInputs ? 'Hide Inputs' : 'Edit Inputs'}</button>
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
              <label>Starting Year:</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength="4"
                value={startingYear}
                onChange={(e) => {
                  const inputYear = e.target.value;
                  if (/^\d{0,4}$/.test(inputYear)) {
                    setStartingYear(inputYear);
                  }
                }}
              />
            </div>
            <div>
              <label>Years to save:</label>
              <div className="numeric-input">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={yearsTillRetirement}
                  onChange={(e) => setYearsTillRetirement(e.target.value)}
                />
                <button onClick={() => setYearsTillRetirement((prev) => (prev ? parseInt(prev) - 1 : prev))}>-</button>
                <button onClick={() => setYearsTillRetirement((prev) => (prev ? parseInt(prev) + 1 : prev))}>+</button>
              </div>
            </div>
            <div>
              <label>Estimated Return (%):</label>
              <div className="numeric-input">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={estimatedReturn}
                  onChange={(e) => setEstimatedReturn(e.target.value)}
                />
                <button onClick={() => setEstimatedReturn((prev) => (prev ? parseInt(prev) - 1 : prev))}>-</button>
                <button onClick={() => setEstimatedReturn((prev) => (prev ? parseInt(prev) + 1 : prev))}>+</button>
              </div>
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
            {/* <div>
              <label>Compounding Frequency:</label>
              <select value={compoundingFrequency} onChange={(e) => setCompoundingFrequency(e.target.value)}>
                <option value="yearly">Yearly</option>
                <option value="monthly">Monthly</option>
              </select>
        </div> */}
            <div>
              <button onClick={handleReset}>Reset</button>
            </div>

            <div className='save-plan-section'>
              <label>Save Plan:</label>
              <input
                type="text"
                value={planName}
                placeholder="Enter plan name"
                onChange={(e) => setPlanName(e.target.value)}
              />
              <button onClick={handleSavePlan}>Save</button>
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

      <div className='totals-section'>
        <p><strong>Final Balance:</strong> ${formatNumberWithCommas(finalBalance)}</p>
        <p><strong>Interest Accrued:</strong> ${formatNumberWithCommas(compoundInterestAccrued.toFixed(2))}</p>
        <p><strong>Total Contributions:</strong> ${formatNumberWithCommas(totalContributions)}</p>
        <p><strong>Return:</strong> {returnPercentage}%</p>
      </div>

      <Bar data={chartData} options={chartOptions} />
      <div>
        <h2 className='results-heading'>Results</h2>
        <div className='options-dropdown'>
          <button onClick={handleToggleOptionsModal}>Visibility</button>
          <OptionsModal
            isOpen={isOptionsModalOpen}
            onRequestClose={handleToggleOptionsModal}
            visibleOptions={visibleOptions}
            handleOptionToggle={handleOptionToggle}
          />
        </div>
        <div className='results-container'>
        <table>
          <thead>
            <tr>
              <th className='sticky'>Period</th>
              <th>Start</th>
              <th>Projected Compound</th>
              <th>Projected Contributions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.period}>
                <td className='sticky'>{result.period}</td>
                <td>${result.startingAmount}</td>
                <td>${result.compoundingAmount}</td>
                <td>${result.contributionAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};

export default RetirementPlanner;
