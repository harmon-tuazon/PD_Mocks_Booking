import React from 'react';

const TokenCard = ({ creditBreakdown, mockType, compact = false }) => {
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
      <div className="bg-white border rounded-md p-3 shadow-sm max-w-xs">
        <h3 className="text-xs font-medium text-gray-900 mb-2">Available Credits</h3>
        <div className="space-y-1">
          {tokenData.map((token, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="text-gray-600">{token.type}</span>
              <span className={`font-medium ${token.amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {token.amount}
              </span>
            </div>
          ))}
          <div className="pt-1 border-t flex justify-between items-center text-xs font-medium">
            <span className="text-gray-900">Total</span>
            <span className={`${total > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {total}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-md overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium text-gray-900">Available Credits</h3>
        <p className="text-xs text-gray-500 mt-1">Your current credit balance</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Credit Type
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokenData.map((token, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {token.type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                  <span className={token.amount > 0 ? 'text-green-600' : 'text-gray-400'}>
                    {token.amount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                Total
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold">
                <span className={total > 0 ? 'text-green-600' : 'text-red-600'}>
                  {total}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Credits are automatically deducted when you book an exam.
      </div>
    </div>
  );
};

export default TokenCard;