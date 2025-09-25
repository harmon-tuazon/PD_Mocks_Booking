import React from 'react';

const TokenCard = ({ creditBreakdown, mockType, compact = false, className = "" }) => {
  if (!creditBreakdown) {
    return null;
  }

  const { specific_credits = 0, shared_credits = 0 } = creditBreakdown;

  // Get the specific credit type name based on mock type
  const getSpecificCreditName = (type) => {
    switch (type) {
      case 'Situational Judgment':
        return 'SJ Credits';
      case 'Clinical Skills':
        return 'CS Credits';
      case 'Mini-mock':
        return 'Mini-Mock Credits';
      default:
        return 'Specific Credits';
    }
  };

  const tokenData = [
    {
      type: getSpecificCreditName(mockType),
      amount: specific_credits,
    },
  ];

  // Only add shared credits for non-mini-mock types
  if (mockType !== 'Mini-mock') {
    tokenData.push({
      type: 'Shared Credits',
      amount: shared_credits,
    });
  }

  const total = specific_credits + (mockType !== 'Mini-mock' ? shared_credits : 0);

  if (compact) {
    return (
      <div className={`bg-white border rounded-lg overflow-hidden shadow-sm ${className}`}>
        <div className="px-3 py-2 border-b">
          <h3 className="font-subheading text-sm font-medium text-primary-900">Available Credits</h3>
          <p className="font-body text-xs text-primary-600 mt-0.5">Your current balance</p>
        </div>
        <div className="p-3">
          <div className="space-y-1.5">
            {tokenData.map((token, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="font-body text-sm text-gray-700">{token.type}</span>
                <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                  token.amount > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {token.amount}
                </span>
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t flex justify-between items-center">
              <span className="font-body text-sm font-medium text-gray-900">Total</span>
              <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                total > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {total}
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-500">
          Credits deducted automatically
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg overflow-hidden shadow-sm ${className}`}>
      <div className="px-4 py-3 border-b">
        <h3 className="font-subheading text-base font-medium text-primary-900">Available Credits</h3>
        <p className="font-body text-sm text-primary-600 mt-0.5">Your current credit balance</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit Type
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokenData.map((token, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {token.type}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    token.amount > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {token.amount}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-medium">
              <td className="px-3 py-2 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900">
                  Total Available
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  total > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {total}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">
        Credits are automatically deducted when you book an exam.
      </div>
    </div>
  );
};

export default TokenCard;