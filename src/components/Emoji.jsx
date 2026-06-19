// Renders an emoji as an Apple-style image so it looks identical on every
// device (Android/Windows included), not just Apple hardware.
// Images: iamcal/emoji-data (Apple set) via jsDelivr CDN.
const BASE = 'https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-64/';

export default function Emoji({ e, size = '1.15em', className = '' }) {
  const code = [...e].map(c => c.codePointAt(0).toString(16)).join('-').replace(/-fe0f$/, '');
  return (
    <img
      src={`${BASE}${code}.png`}
      alt={e}
      draggable="false"
      loading="lazy"
      className={`inline-block align-[-0.15em] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
