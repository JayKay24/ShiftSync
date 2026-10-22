// Generate ESLint zone rules from feature configuration
function generateImportRules() {
  const zones = [];

  // 1. Prevent shared utilities & UI primitives from importing from features or app directories
  zones.push({
    target: [
      './src/components/**',
      './src/config/**',
      './src/hooks/**',
      './src/lib/**',
      './src/stores/**',
      './src/types/**',
      './src/utils/**',
    ],
    from: ['./src/features/**', './src/app/**'],
    message:
      'Shared utilities and UI components should not import from features or app directories.',
  });

  // 2. Prevent any feature from importing from the app directory
  zones.push({
    target: './src/features/**',
    from: './src/app/**',
    message: 'Features should not import from the app directory.',
  });

  // 3. Cross-feature dependency matrix
  const features = [
    {
      name: 'auth',
      allowedFeatures: [],
    },
    {
      name: 'notifications',
      allowedFeatures: ['auth'],
    },
    {
      name: 'audit',
      allowedFeatures: ['auth'],
    },
    {
      name: 'analytics',
      allowedFeatures: ['auth'],
    },
    {
      name: 'profile',
      allowedFeatures: ['auth'],
    },
    {
      name: 'shifts',
      allowedFeatures: ['auth', 'audit'],
    },
    {
      name: 'swaps',
      allowedFeatures: ['auth', 'notifications'],
    },
    {
      name: 'staff',
      allowedFeatures: ['auth', 'shifts', 'analytics'],
    },
  ];

  features.forEach((feature) => {
    // Get all other features that this feature is NOT allowed to import from
    const forbiddenFeatures = features
      .filter(
        (f) =>
          f.name !== feature.name && !feature.allowedFeatures.includes(f.name),
      )
      .map((f) => f.name);

    if (forbiddenFeatures.length > 0) {
      zones.push({
        target: `./src/features/${feature.name}/**`,
        from: `./src/features/{${forbiddenFeatures.join(',')}}/**`,
        message: `${feature.name} feature should not import from ${forbiddenFeatures.join(', ')} features.`,
      });
    }
  });

  return zones;
}

export const importRules = generateImportRules();
