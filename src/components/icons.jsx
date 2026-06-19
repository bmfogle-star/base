// Drop-in replacements for the old Lucide line icons — every icon name now
// renders an Apple emoji (via <Emoji>), so the whole app uses emoji symbols
// instead of line-drawn glyphs. Call sites are unchanged: <Plus size={16} />
// still works; color classNames are ignored (emoji carry their own color),
// while sizing/spacing classes still apply. fill="none" dims the emoji so
// toggle affordances (e.g. an un-favorited star) still read as "off".
import Emoji from './Emoji';

const MAP = {
  AlertCircle: '⚠️', Apple: '🍎', ArrowLeft: '⬅️', BellRing: '🔔',
  Building: '🏢', Building2: '🏢', Cake: '🎂', Calendar: '📅',
  CalendarDays: '📅', Camera: '📷', Check: '✔️', CheckCircle: '✅',
  ChevronDown: '🔽', ChevronLeft: '◀️', ChevronRight: '▶️', ChevronUp: '🔼',
  Clock: '🕐', Copy: '📋', CreditCard: '💳', Download: '⬇️',
  Edit2: '✏️', ExternalLink: '🔗', Eye: '👁️', EyeOff: '🙈',
  FileAudio: '🎵', FileText: '📄', Filter: '🔽', Heart: '❤️',
  Home: '🏠', Image: '🖼️', Info: 'ℹ️', Key: '🔑',
  Loader: '⏳', Lock: '🔒', LogOut: '🚪', Mail: '✉️',
  Menu: '📋', Mic: '🎙️', Monitor: '🖥️', Moon: '🌙',
  Paperclip: '📎', Phone: '📞', Pin: '📌', Plus: '➕',
  RefreshCw: '🔄', Save: '💾', ScanLine: '📇', Search: '🔍',
  Server: '☁️', Settings: '⚙️', StopCircle: '⏹️', Star: '⭐',
  Sun: '☀️', Tag: '🏷️', Trash2: '🗑️', Upload: '⬆️',
  User: '👤', UserCheck: '✅', UserPlus: '➕', Users: '👥',
  Video: '🎥', X: '✖️', Zap: '⚡',
};

function makeIcon(emoji) {
  return function Icon({ size = 18, className = '', fill, style }) {
    const dim = fill === 'none' ? { opacity: 0.3 } : null;
    return (
      <Emoji
        e={emoji}
        size={typeof size === 'number' ? `${size}px` : size}
        className={className}
        style={dim || style ? { ...dim, ...style } : undefined}
      />
    );
  };
}

export const AlertCircle = makeIcon(MAP.AlertCircle);
export const Apple = makeIcon(MAP.Apple);
export const ArrowLeft = makeIcon(MAP.ArrowLeft);
export const BellRing = makeIcon(MAP.BellRing);
export const Building = makeIcon(MAP.Building);
export const Building2 = makeIcon(MAP.Building2);
export const Cake = makeIcon(MAP.Cake);
export const Calendar = makeIcon(MAP.Calendar);
export const CalendarDays = makeIcon(MAP.CalendarDays);
export const Camera = makeIcon(MAP.Camera);
export const Check = makeIcon(MAP.Check);
export const CheckCircle = makeIcon(MAP.CheckCircle);
export const ChevronDown = makeIcon(MAP.ChevronDown);
export const ChevronLeft = makeIcon(MAP.ChevronLeft);
export const ChevronRight = makeIcon(MAP.ChevronRight);
export const ChevronUp = makeIcon(MAP.ChevronUp);
export const Clock = makeIcon(MAP.Clock);
export const Copy = makeIcon(MAP.Copy);
export const CreditCard = makeIcon(MAP.CreditCard);
export const Download = makeIcon(MAP.Download);
export const Edit2 = makeIcon(MAP.Edit2);
export const ExternalLink = makeIcon(MAP.ExternalLink);
export const Eye = makeIcon(MAP.Eye);
export const EyeOff = makeIcon(MAP.EyeOff);
export const FileAudio = makeIcon(MAP.FileAudio);
export const FileText = makeIcon(MAP.FileText);
export const Filter = makeIcon(MAP.Filter);
export const Heart = makeIcon(MAP.Heart);
export const Home = makeIcon(MAP.Home);
export const Image = makeIcon(MAP.Image);
export const Info = makeIcon(MAP.Info);
export const Key = makeIcon(MAP.Key);
export const Loader = makeIcon(MAP.Loader);
export const Lock = makeIcon(MAP.Lock);
export const LogOut = makeIcon(MAP.LogOut);
export const Mail = makeIcon(MAP.Mail);
export const Menu = makeIcon(MAP.Menu);
export const Mic = makeIcon(MAP.Mic);
export const Monitor = makeIcon(MAP.Monitor);
export const Moon = makeIcon(MAP.Moon);
export const Paperclip = makeIcon(MAP.Paperclip);
export const Phone = makeIcon(MAP.Phone);
export const Pin = makeIcon(MAP.Pin);
export const Plus = makeIcon(MAP.Plus);
export const RefreshCw = makeIcon(MAP.RefreshCw);
export const Save = makeIcon(MAP.Save);
export const ScanLine = makeIcon(MAP.ScanLine);
export const Search = makeIcon(MAP.Search);
export const Server = makeIcon(MAP.Server);
export const Settings = makeIcon(MAP.Settings);
export const StopCircle = makeIcon(MAP.StopCircle);
export const Star = makeIcon(MAP.Star);
export const Sun = makeIcon(MAP.Sun);
export const Tag = makeIcon(MAP.Tag);
export const Trash2 = makeIcon(MAP.Trash2);
export const Upload = makeIcon(MAP.Upload);
export const User = makeIcon(MAP.User);
export const UserCheck = makeIcon(MAP.UserCheck);
export const UserPlus = makeIcon(MAP.UserPlus);
export const Users = makeIcon(MAP.Users);
export const Video = makeIcon(MAP.Video);
export const X = makeIcon(MAP.X);
export const Zap = makeIcon(MAP.Zap);
