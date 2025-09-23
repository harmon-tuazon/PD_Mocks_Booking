import React from 'react';

const CapacityBadge = ({ availableSlots, capacity, size = 'normal' }) => {
  const percentage = capacity > 0 ? (availableSlots / capacity) * 100 : 0;

  let colorClass = '';
  let text = '';

  if (availableSlots === 0) {
    colorClass = 'bg-cool-grey text-gray-800 border border-gray-300';
    text = 'Full';
  } else if (percentage <= 20) {
    colorClass = 'bg-coral-100 text-coral-800 border border-coral-200';
    text = availableSlots === 1 ? '1 slot left' : `${availableSlots} slots left`;
  } else {
    colorClass = 'bg-teal-100 text-teal-800 border border-teal-200';
    text = `${availableSlots} slots available`;
  }

  const sizeClass = size === 'large'
    ? 'px-3 py-1.5 text-sm font-subheading font-semibold'
    : 'px-2.5 py-0.5 text-xs font-subheading font-medium';

  return (
    <span className={`inline-flex items-center rounded-full transition-all duration-200 ${sizeClass} ${colorClass}`}>
      {text}
    </span>
  );
};

export default CapacityBadge;