// Maps appliance type strings to @expo/vector-icons (Ionicons) names
export const ApplianceIcons: Record<string, string> = {
  'lightbulb-outline': 'bulb-outline',
  'lightbulb': 'bulb',
  'fan': 'nuclear-outline',          // closest fan icon in Ionicons
  'fan-off': 'nuclear-outline',
  'computer': 'desktop-outline',
  'projector': 'film-outline',
  'ac': 'snow-outline',
  'tv': 'tv-outline',
  'speaker': 'volume-high-outline',
  'camera': 'camera-outline',
  'door': 'door-open-outline',
  'plug': 'flash-outline',
  'wifi': 'wifi-outline',
  'default': 'flash-outline',
};

// Options shown to Admin when adding a new switch
export const ApplianceOptions = [
  { label: 'Light',      icon: 'lightbulb-outline', value: 'lightbulb-outline' },
  { label: 'Fan',        icon: 'fan',               value: 'fan' },
  { label: 'Computer',   icon: 'computer',          value: 'computer' },
  { label: 'Projector',  icon: 'projector',         value: 'projector' },
  { label: 'AC',         icon: 'ac',                value: 'ac' },
  { label: 'TV',         icon: 'tv',                value: 'tv' },
  { label: 'Speaker',    icon: 'speaker',           value: 'speaker' },
  { label: 'Power Plug', icon: 'plug',              value: 'plug' },
];
