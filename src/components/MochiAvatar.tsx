interface MochiAvatarProps {
  size?: number;
}

export default function MochiAvatar({ size = 48 }: MochiAvatarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blob body */}
      <defs>
        <radialGradient id="mochiGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#7B72FF" />
          <stop offset="100%" stopColor="#4ECDC4" />
        </radialGradient>
      </defs>
      <ellipse cx="22" cy="23" rx="18" ry="17" fill="url(#mochiGrad)" opacity="0.9" />
      {/* Eyes */}
      <circle cx="16" cy="20" r="2.5" fill="#fff" />
      <circle cx="28" cy="20" r="2.5" fill="#fff" />
      <circle cx="17" cy="20.5" r="1.2" fill="#1E2136" />
      <circle cx="29" cy="20.5" r="1.2" fill="#1E2136" />
      {/* Smile */}
      <path
        d="M 16 27 Q 22 32 28 27"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
