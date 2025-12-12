'use client'

import React from 'react'

export const Logo: React.FC = () => {
  return (
    <>
      <style>{`
        .custom-logo {
          max-width: 200px;
          height: auto;
        }
        [data-theme="light"] .custom-logo {
          filter: invert(1) brightness(0.4);
        }
      `}</style>
      <img
        src="/logo.svg"
        alt="AGE"
        className="custom-logo"
      />
    </>
  )
}

export default Logo
