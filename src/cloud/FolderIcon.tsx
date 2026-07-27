interface Props {
  count?: number;
  shared?: boolean;
  starred?: boolean;
  size?: number;
}

export default function FolderIcon({ count, shared, starred, size = 80 }: Props) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 80 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Folder back */}
      <rect x="0" y="10" width="80" height="52" rx="5" fill="#F3C24B" />
      {/* Folder tab */}
      <path d="M0 10 C0 7.8 1.8 6 4 6 L28 6 C30.2 6 32 7.8 32 10 L32 14 L0 14 Z" fill="#F3C24B" />
      {/* Folder front face (lighter) */}
      <rect x="0" y="14" width="80" height="48" rx="5" fill="#FADA6A" />
      {/* Subtle inner shadow line at top of front */}
      <rect x="0" y="14" width="80" height="3" rx="0" fill="#F6CB52" />

      {/* Item count badge */}
      {count !== undefined && (
        <>
          <rect x="4" y="19" width="22" height="12" rx="3" fill="#E8B426" />
          <text
            x="15"
            y="28"
            textAnchor="middle"
            fontSize="7.5"
            fontFamily="system-ui, sans-serif"
            fontWeight="600"
            fill="white"
          >
            {count > 999 ? "999+" : count}
          </text>
        </>
      )}

      {/* Shared icon (two people) */}
      {shared && (
        <g transform="translate(52, 46)">
          <circle cx="9" cy="3" r="3" fill="#3B82F6" />
          <path d="M3 14 C3 10.7 5.7 8 9 8 C12.3 8 15 10.7 15 14" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="3" r="2.5" fill="#60A5FA" />
          <path d="M12 14 C12.5 11.5 14.1 9.5 16.5 9.5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* Star */}
      {starred && (
        <g transform="translate(59, 47)">
          <polygon
            points="7,0 8.76,5.4 14.4,5.4 9.82,8.72 11.58,14.12 7,10.8 2.42,14.12 4.18,8.72 -0.4,5.4 5.24,5.4"
            fill="#FBBF24"
            transform="scale(0.85)"
          />
        </g>
      )}
    </svg>
  );
}
