// Shared style tokens for the whole app's professional/LinkedIn-inspired
// theme: a single blue accent, white cards with a subtle border, and pill
// buttons. Plain constants rather than a Tailwind theme extension, so pages
// can adopt them incrementally.
export const li = {
  blue: '#0A66C2',
  blueHover: '#004182',
  blueTint: '#EBF4FD',

  card: 'bg-white rounded-lg border border-black/10 shadow-sm',
  pageBg: 'bg-[#F4F2EE]',

  primaryBtn:
    'px-4 py-1.5 rounded-full text-sm font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] transition disabled:opacity-50 whitespace-nowrap',
  outlineBtn:
    'px-4 py-1.5 rounded-full text-sm font-semibold border border-black/60 text-black/60 hover:bg-black/5 transition disabled:opacity-50 whitespace-nowrap',
  ghostLink: 'text-sm font-semibold text-[#0A66C2] hover:underline',
  link: 'text-[#0A66C2] hover:underline',

  input:
    'w-full px-3 py-2 rounded border border-black/20 focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none transition',
}
