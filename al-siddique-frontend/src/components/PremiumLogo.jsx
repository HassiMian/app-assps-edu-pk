"use client";

import React from 'react';

export default function PremiumLogo({ src, alt = 'Logo', size = 48, className = '', variant = 'default' }) {
  const inset = size > 84 ? 8 : 6;
  const isHero = variant === 'hero';
  const glowInset = isHero ? 14 : 10;
  return (
    <div
      className={`premium-logo-shell relative flex items-center justify-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        transformStyle: 'preserve-3d',
        perspective: 1200,
        animation: `premiumLogoFloat ${isHero ? '6.2s' : '8.4s'} ease-in-out infinite`,
      }}
    >
      <style>{`
        @keyframes premiumLogoFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.01); }
        }
        @keyframes premiumLogoSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes premiumLogoSweep {
          0% { transform: translateX(-120%) rotate(12deg); opacity: 0; }
          18% { opacity: 0.75; }
          45% { transform: translateX(35%) rotate(12deg); opacity: 0.26; }
          100% { transform: translateX(120%) rotate(12deg); opacity: 0; }
        }
        @keyframes premiumLogoOrbit {
          from { transform: rotate(0deg) translateX(${Math.max(18, Math.round(size * 0.22))}px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(${Math.max(18, Math.round(size * 0.22))}px) rotate(-360deg); }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="super-reveal absolute inset-0 rounded-full opacity-95"
        style={{
          background: 'conic-gradient(from 180deg, #C8991A, #31D6F5, #E7C96A, #C8991A, #31D6F5, #C8991A)',
          padding: size > 84 ? '3px' : '2px',
          boxShadow: isHero
            ? '0 18px 38px rgba(0,0,0,0.26), 0 0 34px rgba(200,153,26,0.16)'
            : '0 14px 28px rgba(0,0,0,0.22), 0 0 24px rgba(200,153,26,0.10)',
          animation: `premiumLogoSpin ${isHero ? '15s' : '22s'} linear infinite`,
        }}
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: 'linear-gradient(145deg, rgba(11,44,77,0.98), rgba(8,18,32,0.94))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -14px 22px rgba(0,0,0,0.25)',
          }}
        />
      </div>

      <div
        className="absolute rounded-full flex items-center justify-center overflow-hidden z-10"
        style={{
          width: `calc(100% - ${inset * 2}px)`,
          height: `calc(100% - ${inset * 2}px)`,
          top: inset,
          left: inset,
          background: 'rgba(255,255,255,0.97)',
          boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.12)',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.58), rgba(255,255,255,0) 30%)' }} />
        <div
          className="absolute rounded-full"
          style={{
            inset: `${glowInset}%`,
            background: 'linear-gradient(145deg, rgba(200,153,26,0.12), rgba(10,132,255,0.06))',
            filter: 'blur(4px)',
            animation: `pulse ${isHero ? '5s' : '7s'} ease-in-out infinite`,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            inset: '8%',
            background: 'linear-gradient(120deg, rgba(255,255,255,0) 25%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 75%)',
            mixBlendMode: 'screen',
            opacity: 0.58,
            animation: `premiumLogoSweep ${isHero ? '6.2s' : '7.8s'} ease-in-out infinite`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
          style={{
            marginLeft: -5,
            marginTop: -5,
            background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(200,153,26,0.95) 45%, rgba(200,153,26,0) 72%)',
            boxShadow: '0 0 14px rgba(200,153,26,0.42)',
            animation: `premiumLogoOrbit ${isHero ? '9.5s' : '12s'} linear infinite`,
            transformOrigin: 'center center',
          }}
        />
        <img
          src={src}
          alt="Premium School Logo"
          style={{
            position: 'relative',
            zIndex: 1,
            width: isHero ? '88%' : '84%',
            height: isHero ? '88%' : '84%',
            objectFit: 'contain',
            mixBlendMode: 'multiply',
            filter: isHero
              ? 'drop-shadow(0 4px 16px rgba(11,44,77,0.16)) saturate(1.04)'
              : 'drop-shadow(0 2px 10px rgba(11,44,77,0.12))',
            transform: 'translateZ(0)',
          }}
        />
      </div>
    </div>
  );
}
