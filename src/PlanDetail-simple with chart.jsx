import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { database, onValue, ref, update } from './firebase';

const PlanDetail = ({ user }) => {
  const [planDetails, setPlanDetails] = useState(null);
  const [results, setResults] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [realCompoundValues, setRealCompoundValues] = useState({});
  const [realContributionsValues, setRealContributionsValues] = useState({});
  const [realTotalValues, setRealTotalValues] = useState({});
  const [chartData, setChartData] = useState(null);

  const navigate = useNavigate();
  let { planId } = useParams();

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        console.log('Fetching plan details...');
        const planRef = ref(database, `users/${user.uid}/plans/${planId}`);
        onValue(planRef, (snapshot) => {
          const data = snapshot.val();
          console.log('data', data);
          if (!planDetails) {
            setPlanDetails(data);
          }
        });
      } catch (error) {
        console.error('Error fetching plan details:', error);
      }
    };

    if (user && planId) {
      fetchPlanDetails();
    }
  }, [user, planId, planDetails]);

  useEffect(() => {
    if (planDetails) {
      calculateRetirementPlan();
    }
  }, [planDetails]);

  useEffect(() => {
    calculateRetirementPlan();
  }, [planDetails?.data?.estimatedReturn, realContributionsValues]);

  useEffect(() => {
    // Update the chart data
    updateChartData(results, realCompoundValues, realContributionsValues);
  }, [results, realCompoundValues, realContributionsValues]);

  const handleChange = (property, value, period) => {
    setPlanDetails((prevPlanDetails) => ({
      ...prevPlanDetails,
      data: {
        ...prevPlanDetails.data,
        [property]: value,
      },
    }));

    const startingAmount = parseFloat(results[period - 1]?.startingAmount) || 0;
    const realCompound = parseFloat(realCompoundValues[period] || '0') || 0;
    const realContributions = parseFloat(realContributionsValues[period] || '0') || 0;

    setRealTotalValues((prevValues) => ({
      ...prevValues,
      [period]: (startingAmount + realCompound + realContributions).toFixed(2),
    }));

    setIsDirty(true);
  };

  const calculateRetirementPlan = () => {
    let currentTotal = parseFloat(planDetails?.data?.currentAssets) || 0;
    const returnRate = parseFloat(planDetails?.data?.estimatedReturn) / 100 || 0;
    const compoundingFactor = planDetails?.data?.compoundingFrequency === 'yearly' ? 1 : 12;
    const contribution = parseFloat(planDetails?.data?.contributionAmount) || 0;

    let newResults = [];

    for (let index = 0; index < parseInt(planDetails?.data?.yearsTillRetirement) * compoundingFactor; index++) {
      const yearlyReturn = currentTotal * returnRate;
      const monthlyReturn = yearlyReturn / 12;

      const startingAmount = index === 0 ? currentTotal : parseFloat(newResults[index - 1].total);

      currentTotal = startingAmount + (planDetails?.data?.compoundingFrequency === 'yearly' ? yearlyReturn : monthlyReturn);

      const totalWithContribution = currentTotal + contribution;

      newResults.push({
        period: index + 1,
        startingAmount: startingAmount.toFixed(2),
        compoundingAmount: (planDetails?.data?.compoundingFrequency === 'yearly' ? yearlyReturn : monthlyReturn).toFixed(2),
        contributionAmount: contribution.toFixed(2),
        total: totalWithContribution.toFixed(2),
      });
    }

    setResults(newResults);

    // Update the chart data
    updateChartData(newResults);
  };

  const updateChartData = (newResults) => {
    const updatedChartData = {
      labels: newResults.map((result) => result.period),
      datasets: [
        {
          label: 'Projected Principle',
          data: newResults.map((result) => parseFloat(result.startingAmount)),
          backgroundColor: 'rgba(75,192,192,1)',
          stack: 'Stack 0',
        },
        {
          label: 'Projected Return',
          data: newResults.map((result) => parseFloat(result.compoundingAmount)),
          backgroundColor: 'rgba(255,99,132,1)',
          stack: 'Stack 0',
        },
        {
          label: 'Projected Contributions',
          data: newResults.map((result) => parseFloat(result.contributionAmount)),
          backgroundColor: 'rgba(255,205,86,1)',
          stack: 'Stack 0',
        },
        {
          label: 'Real Total',
          data: newResults.map((result) => parseFloat(realTotalValues[result.period] || '')),
          backgroundColor: 'rgba(255, 0, 0, 1)',
          stack: 'Stack 1',
        },
        {
          label: 'Real Return',
          data: newResults.map((result) => parseFloat(result.compoundingAmount)),
          backgroundColor: 'rgba(255,99,132,1)',
          stack: 'Stack 1',
        },
        {
          label: 'Real Contributions',
          data: newResults.map((result) => parseFloat(realContributionsValues[result.period] || '')),
          backgroundColor: 'rgba(255, 159, 64, 1)',
          stack: 'Stack 1',
        },
      ],
    };

    setChartData(updatedChartData);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);

      const { data, ...rest } = planDetails;

      await update(ref(database, `users/${user.uid}/plans/${planId}/data`), data);

      setSaving(false);
      setIsDirty(false);

      navigate(`/plan/${planId}`);
    } catch (error) {
      console.error('Error saving changes:', error);
      setSaving(false);
    }
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
        display: false,
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

  return (
    <div>
      <h1>{planDetails?.name || ''}</h1>
      <div className="input-container">
        <div className="inputs">
          <div>
            <label>Current Assets:</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={planDetails?.data?.currentAssets || ''}
              onChange={(e) => handleChange('currentAssets', e.target.value.replace('$', ''), 0)}
            />
          </div>
          <div>
            <label>Years to save:</label>
            <div className="numeric-input">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={planDetails?.data?.yearsTillRetirement || ''}
                onChange={(e) => handleChange('yearsTillRetirement', e.target.value, 0)}
              />
              <button onClick={() => handleChange('yearsTillRetirement', parseInt(planDetails?.data?.yearsTillRetirement || 0) - 1, 0)}>-</button>
              <button onClick={() => handleChange('yearsTillRetirement', parseInt(planDetails?.data?.yearsTillRetirement || 0) + 1, 0)}>+</button>
            </div>
          </div>
          <div>
            <label>Estimated Return (%):</label>
            <div className="numeric-input">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={planDetails?.data?.estimatedReturn || ''}
                onChange={(e) => handleChange('estimatedReturn', e.target.value, 0)}
              />
              <button onClick={() => handleChange('estimatedReturn', parseInt(planDetails?.data?.estimatedReturn || 0) - 1, 0)}>-</button>
              <button onClick={() => handleChange('estimatedReturn', parseInt(planDetails?.data?.estimatedReturn || 0) + 1, 0)}>+</button>
            </div>
          </div>
          <div>
            <label>Contribution Amount:</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={planDetails?.data?.contributionAmount || ''}
              onChange={(e) => handleChange('contributionAmount', e.target.value.replace('$', ''), 0)}
            />
          </div>
          <button onClick={saveChanges} disabled={!isDirty || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className='results-container'>
        <table>
          <thead>
            <tr>
              <th className='sticky'>Period</th>
              <th>Start</th>
              <th>Projected Return</th>
              <th>Projected Contributions</th>
              <th>Projected Total</th>
              <th>Real</th>
              <th>Start</th>
              <th>User Adjusted Return</th>
              <th>User Adjusted Contributions</th>
              <th>User Adjusted Total</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.period}>
                <td className='sticky'>{result.period}</td>
                <td>${result.startingAmount}</td>
                <td>${result.compoundingAmount}</td>
                <td>${result.contributionAmount}</td>
                <td>${result.total}</td>
                <td> </td>
                <td>${result.startingAmount}</td>
                <td>${result.compoundingAmount}</td>
                <td>
                  <input
                    type="text"
                    value={realContributionsValues[result.period] || result.contributionAmount}
                    onChange={(e) =>
                      setRealContributionsValues((prevValues) => ({
                        ...prevValues,
                        [result.period]: e.target.value.replace('$', ''),
                      }))
                    }
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={(parseFloat(result.startingAmount) + parseFloat(result.compoundingAmount) + parseFloat(realContributionsValues[result.period] || '0')).toFixed(2)}
                    onChange={(e) => {
                      const newContributionAmount = parseFloat(e.target.value.replace('$', '')) || 0;
                      const newTotal = parseFloat(result.startingAmount) + parseFloat(result.compoundingAmount) + newContributionAmount;

                      setRealContributionsValues((prevValues) => ({
                        ...prevValues,
                        [result.period]: newContributionAmount.toFixed(2),
                      }));

                      setRealTotalValues((prevValues) => ({
                        ...prevValues,
                        [result.period]: newTotal.toFixed(2),
                      }));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {chartData && <Bar data={chartData} options={chartOptions} />}
    </div>
  );
};

export default PlanDetail;

