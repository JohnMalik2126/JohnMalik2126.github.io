const categories = {
  invitation: {
    title: 'Wedding Invitation',
    fields: [
      {
        key: 'brideName',
        label: "Bride's name",
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'groomName',
        label: "Groom's name",
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'inviteeName',
        label: 'Guest name to display on card',
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'weddingDate',
        label: 'Wedding date and time (YYYY-MM-DD HH:mm)',
        required: true,
        validate: (value) => {
          const parsed = Date.parse(value.replace(' ', 'T'));
          return Number.isFinite(parsed) || 'Use format YYYY-MM-DD HH:mm.';
        },
      },
      {
        key: 'weddingAddress',
        label: 'Wedding address',
        required: true,
        validate: (value) => value.length >= 6 || 'Address is too short.',
      },
      {
        key: 'customMessage',
        label: 'Optional custom message',
        required: false,
        validate: (value) => value.length <= 300 || 'Message must be 300 characters or fewer.',
      },
    ],
  },
  greeting_card: {
    title: 'Greeting Card',
    fields: [
      {
        key: 'recipientName',
        label: 'Recipient name',
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'occasion',
        label: 'Occasion (birthday, holiday, etc.)',
        required: true,
        validate: (value) => value.length >= 3 || 'Please enter at least 3 characters.',
      },
      {
        key: 'senderName',
        label: 'Sender name',
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'message',
        label: 'Greeting message',
        required: true,
        validate: (value) => value.length <= 400 || 'Message must be 400 characters or fewer.',
      },
      {
        key: 'eventDate',
        label: 'Optional event date (YYYY-MM-DD HH:mm)',
        required: false,
        validate: (value) => {
          if (!value) {
            return true;
          }
          const parsed = Date.parse(value.replace(' ', 'T'));
          return Number.isFinite(parsed) || 'Use format YYYY-MM-DD HH:mm or skip.';
        },
      },
    ],
  },
  love_letter: {
    title: 'Love Letter',
    fields: [
      {
        key: 'recipientName',
        label: 'Beloved name',
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'senderName',
        label: 'Your name',
        required: true,
        validate: (value) => value.length >= 2 || 'Please enter at least 2 characters.',
      },
      {
        key: 'message',
        label: 'Your love letter text',
        required: true,
        validate: (value) => value.length >= 10 || 'Please write at least 10 characters.',
      },
      {
        key: 'deliveryDate',
        label: 'Optional special date (YYYY-MM-DD HH:mm)',
        required: false,
        validate: (value) => {
          if (!value) {
            return true;
          }
          const parsed = Date.parse(value.replace(' ', 'T'));
          return Number.isFinite(parsed) || 'Use format YYYY-MM-DD HH:mm or skip.';
        },
      },
    ],
  },
};

const invitationTemplates = [
  { id: 'classic-gold', name: 'Classic Gold', theme: '#d4af37' },
  { id: 'royal-blue', name: 'Royal Blue', theme: '#2f4f9e' },
  { id: 'rose-garden', name: 'Rose Garden', theme: '#c83f68' },
  { id: 'emerald-night', name: 'Emerald Night', theme: '#1f7a5b' },
];

const genericTemplates = [
  { id: 'soft-paper', name: 'Soft Paper', theme: '#8b5e3c' },
];

module.exports = {
  categories,
  invitationTemplates,
  genericTemplates,
};
