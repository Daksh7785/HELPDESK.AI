/**
 * Smart Ticket Templates — predefined issue templates for common IT problems.
 *
 * Each template contains:
 *   - id:                   unique slug identifier
 *   - label:                short display name
 *   - icon:                 lucide-react icon name string (resolved in the component)
 *   - category:             broad category for Quick Actions bridging
 *   - priority_hint:        soft signal for the AI pipeline
 *   - title:                auto-filled ticket title
 *   - description_template: structured markdown body with placeholders
 *   - tags:                 search/filter keywords
 *   - ai_hints:             metadata passed to the AI pipeline for better routing
 */

const TICKET_TEMPLATES = [
  {
    id: 'vpn-connectivity',
    label: 'VPN Connectivity Issue',
    icon: 'ShieldOff',
    category: 'Network',
    priority_hint: 'high',
    title: 'Unable to connect to company VPN',
    description_template:
      'Unable to establish a secure VPN connection.\n\n' +
      '**Error Message:**\n[Paste the exact error here]\n\n' +
      '**Device & OS:**\n[e.g., Windows 11 laptop / MacBook M2]\n\n' +
      '**Location:**\n[Office / Home WiFi / Mobile Hotspot]\n\n' +
      '**Internet Status:**\n[Working / Not Working]\n\n' +
      '**Additional Context:**\n[What changed recently? e.g., after password reset, OS update]',
    tags: ['vpn', 'network', 'connectivity', 'remote-access'],
    ai_hints: {
      likely_category: 'Network & Connectivity',
      likely_team: 'IT Infrastructure',
      keywords: ['vpn', 'authentication failed', 'tunnel', 'cisco', 'globalprotect'],
    },
  },
  {
    id: 'password-reset',
    label: 'Password Reset Request',
    icon: 'KeyRound',
    category: 'Access',
    priority_hint: 'medium',
    title: 'Password reset request',
    description_template:
      'I need to reset my account password.\n\n' +
      '**Account / System:**\n[e.g., Email, SSO, Active Directory, VPN]\n\n' +
      '**Username / Email:**\n[Your account identifier]\n\n' +
      '**Reason for Reset:**\n[Forgotten / Expired / Locked out / Compromised]\n\n' +
      '**Last Successful Login:**\n[Approximate date]\n\n' +
      '**Additional Context:**\n[Any error messages or relevant details]',
    tags: ['password', 'reset', 'account', 'locked', 'login'],
    ai_hints: {
      likely_category: 'Access & Authentication',
      likely_team: 'Identity & Access Management',
      keywords: ['password', 'reset', 'locked', 'expired', 'MFA', 'login'],
    },
  },
  {
    id: 'email-access',
    label: 'Email Access Problem',
    icon: 'MailX',
    category: 'Software',
    priority_hint: 'high',
    title: 'Unable to access email',
    description_template:
      'Experiencing issues accessing company email.\n\n' +
      '**Email Client:**\n[Outlook Desktop / Outlook Web / Gmail / Mobile App]\n\n' +
      '**Error Message:**\n[Paste the exact error here]\n\n' +
      '**Device & OS:**\n[e.g., Windows 11 / macOS Sonoma / iPhone 15]\n\n' +
      '**Issue Type:**\n[Cannot login / Emails not loading / Cannot send / Cannot receive]\n\n' +
      '**Since When:**\n[Date & time the issue started]\n\n' +
      '**Additional Context:**\n[Any recent changes — password reset, device change, etc.]',
    tags: ['email', 'outlook', 'mail', 'inbox', 'access'],
    ai_hints: {
      likely_category: 'Email & Communication',
      likely_team: 'Messaging & Collaboration',
      keywords: ['email', 'outlook', 'exchange', 'mail', 'inbox', 'SMTP'],
    },
  },
  {
    id: 'printer-issue',
    label: 'Printer Not Working',
    icon: 'Printer',
    category: 'Hardware',
    priority_hint: 'low',
    title: 'Printer not working',
    description_template:
      'Having trouble with the office printer.\n\n' +
      '**Printer Name / Location:**\n[e.g., 3rd Floor HP LaserJet, Room 201]\n\n' +
      '**Issue Type:**\n[Not printing / Paper jam / Offline / Poor quality / Driver error]\n\n' +
      '**Error Message:**\n[Any error shown on screen or printer display]\n\n' +
      '**Connected Via:**\n[USB / WiFi / Network / Bluetooth]\n\n' +
      '**Steps Already Tried:**\n[Restart, re-add printer, check cables, etc.]\n\n' +
      '**Additional Context:**\n[Is this affecting multiple users?]',
    tags: ['printer', 'print', 'hardware', 'paper jam', 'offline'],
    ai_hints: {
      likely_category: 'Hardware & Peripherals',
      likely_team: 'Desktop Support',
      keywords: ['printer', 'print', 'paper', 'toner', 'driver', 'spooler'],
    },
  },
  {
    id: 'wifi-network',
    label: 'WiFi / Network Issue',
    icon: 'WifiOff',
    category: 'Network',
    priority_hint: 'high',
    title: 'WiFi or network connectivity issue',
    description_template:
      'Experiencing WiFi or network connectivity problems.\n\n' +
      '**Issue Type:**\n[No connection / Slow speed / Intermittent drops / Cannot access specific sites]\n\n' +
      '**Network Name (SSID):**\n[e.g., CorpWiFi-5G, GuestNetwork]\n\n' +
      '**Device & OS:**\n[e.g., Dell Laptop / Windows 11]\n\n' +
      '**Location:**\n[Building, floor, room number]\n\n' +
      '**Wired or Wireless:**\n[WiFi / Ethernet cable]\n\n' +
      '**Since When:**\n[Date & time the issue started]\n\n' +
      '**Additional Context:**\n[Are other users affected? Any recent changes?]',
    tags: ['wifi', 'network', 'internet', 'connectivity', 'slow'],
    ai_hints: {
      likely_category: 'Network & Connectivity',
      likely_team: 'IT Infrastructure',
      keywords: ['wifi', 'network', 'internet', 'ethernet', 'DNS', 'DHCP'],
    },
  },
  {
    id: 'software-installation',
    label: 'Software Installation Request',
    icon: 'Download',
    category: 'Software',
    priority_hint: 'medium',
    title: 'Software installation request',
    description_template:
      'Requesting installation of software on my workstation.\n\n' +
      '**Software Name & Version:**\n[e.g., Adobe Acrobat Pro 2024, Python 3.12]\n\n' +
      '**Business Justification:**\n[Why is this software needed for your role?]\n\n' +
      '**Device & OS:**\n[e.g., Windows 11 laptop, Asset Tag #12345]\n\n' +
      '**License Available:**\n[Yes / No / Not sure]\n\n' +
      '**Urgency:**\n[Needed by a specific date? e.g., before project deadline]\n\n' +
      '**Additional Context:**\n[Any special configuration requirements?]',
    tags: ['software', 'install', 'application', 'license', 'download'],
    ai_hints: {
      likely_category: 'Software & Applications',
      likely_team: 'Software Deployment',
      keywords: ['install', 'software', 'application', 'license', 'deploy'],
    },
  },
];

export default TICKET_TEMPLATES;
