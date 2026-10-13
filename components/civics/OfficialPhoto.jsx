import React, { useState } from 'react';
import { User } from 'lucide-react';

export default function OfficialPhoto({ photoUrl, name, size = 'md' }) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const bgColors = [
    'bg-blue-200 text-blue-800',
    'bg-red-200 text-red-800',
    'bg-green-200 text-green-800',
    'bg-purple-200 text-purple-800',
    'bg-amber-200 text-amber-800',
  ];

  const colorIndex = name ? name.charCodeAt(0) % bgColors.length : 0;
  const bgColor = bgColors[colorIndex];

  if (!photoUrl || imgError) {
    return (
      <div className={`${sizes[size]} rounded-full ${bgColor} flex items-center justify-center border-2 border-white shadow`}>
        <span className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={name || 'Official'}
      className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow`}
      onError={() => setImgError(true)}
    />
  );
}