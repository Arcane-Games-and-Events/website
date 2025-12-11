'use client'

import React from 'react'

export const Icon: React.FC = () => {
  return (
    <>
      <style>{`
        .custom-icon {
          max-width: 25px;
          height: auto;
        }
        [data-theme="light"] .custom-icon {
          filter: invert(1) brightness(0.4);
        }
      `}</style>
      <img
        src="/logo.svg"
        alt="AGE"
        className="custom-icon"
      />
    </>
  )
}

export default Icon
