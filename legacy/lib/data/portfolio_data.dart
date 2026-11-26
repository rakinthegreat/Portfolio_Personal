class ProjectData {
  final String name;
  final String description;
  final String year;
  final String type;
  final String url;
  final String? previewUrl;
  final bool isMobileView;
  final String? downloadUrl;

  const ProjectData({
    required this.name,
    required this.description,
    required this.year,
    required this.type,
    required this.url,
    this.previewUrl,
    this.isMobileView = false,
    this.downloadUrl,
  });
}

class EducationData {
  final String degree;
  final String batch;
  final String inst;
  final String period;

  const EducationData({
    required this.degree,
    required this.batch,
    required this.inst,
    required this.period,
  });
}

class SkillData {
  final String name;
  final String category;
  const SkillData(this.name, this.category);
}

class PortfolioData {
  // Contact details specifically for the resume
  static const String resumePhone = '+8801817092350';
  static const String resumeEmail = 'talukderrakinuzzaman@gmail.com';
  static const String website = 'rakin-talukder.me';
  static const String github = 'github.com/rakinthegreat';
  static const String linkedin = 'linkedin.com/in/rakin-talukder-me';

  static const List<ProjectData> projects = [
    ProjectData(
      name: 'WaitLess',
      description:
          'A productivity app that detects idle moments and prompts mindful tasks to prevent doomscrolling.',
      year: '2026',
      type: 'Web & Mobile App',
      url: 'https://github.com/rakinthegreat/friction_titanicSwimTeam',
      previewUrl: 'https://waitless-friction.vercel.app',
      isMobileView: true,
      downloadUrl:
          'https://github.com/rakinthegreat/friction_titanicSwimTeam/releases',
    ),
    ProjectData(
      name: 'HydroSync',
      description:
          'AI hydration tracker generating personalized strategies with a multi-AI fallback architecture.',
      year: '2026',
      type: 'Mobile App (Health/AI)',
      url: 'https://github.com/rakinthegreat/hydrosync-project',
      previewUrl: 'https://hydrosync-project-blush.vercel.app/',
      isMobileView: true,
      downloadUrl:
          'https://github.com/rakinthegreat/hydrosync-project/releases',
    ),
    ProjectData(
      name: 'Curzpay',
      description:
          'Fintech frontend demonstrating pixel-perfect, multi-platform UI fidelity across web and mobile.',
      year: '2026',
      type: 'Web/Mobile UI Showcase',
      url: 'https://github.com/rakinthegreat/Fintech_Demo_Flutter',
      previewUrl: 'https://curzpaydemo.vercel.app/',
      isMobileView: true,
    ),
    ProjectData(
      name: 'Plassey 1757',
      description:
          'Historical social deduction multiplayer web game featuring real-time sync.',
      year: '2025',
      type: 'Web App (Game)',
      url: 'https://github.com/rakinthegreat/Plassey',
      previewUrl: 'https://plassey.vercel.app',
      downloadUrl: 'https://github.com/rakinthegreat/Plassey/releases',
    ),
    ProjectData(
      name: 'Loaf',
      description:
          'Interactive sensory game for cats featuring procedural Koi AI and a custom haptic engine.',
      year: '2026',
      type: 'Mobile App (Game)',
      url: 'https://github.com/rakinthegreat/loaf',
      previewUrl: 'https://loaf-pi.vercel.app/',
      isMobileView: true,
      downloadUrl: 'https://github.com/rakinthegreat/loaf/releases',
    ),
    ProjectData(
      name: 'IIT Indoor Games',
      description:
          'Interactive application highlighting community engagement and event-specific user experiences.',
      year: '2026',
      type: 'Interactive Application',
      url: 'https://github.com/bikramroyutsa/iit-indoors-2026',
      previewUrl: 'https://iitindoorgames2026.vercel.app/',
    ),
    ProjectData(
      name: 'GCamUpdater',
      description:
          'Custom update logic injected into Google Camera mods via Dalvik Bytecode reverse engineering.',
      year: '2022',
      type: 'Modding Utility',
      url: 'https://github.com/rakinthegreat/GcamUpdater',
      downloadUrl:
          'https://www.celsoazevedo.com/files/android/google-camera/dev-greatness/',
    ),
    ProjectData(
      name: 'ImageEnhanceAndroid',
      description:
          'Low-level computational photography and image manipulation tool for Android devices.',
      year: '2023',
      type: 'Image Processing',
      url: 'https://gitlab.com/rakinthegreat1/ImageEnhanceAndroid',
      downloadUrl:
          'https://gitlab.com/rakinthegreat1/ImageEnhanceAndroid/-/blob/main/app/debug/app-debug.apk?ref_type=heads',
    ),
    ProjectData(
      name: 'PhotoCompare',
      description:
          'Complex UI state management and memory optimization for Matrix zooming and panning.',
      year: '2021',
      type: 'Utility App',
      url: 'https://github.com/rakinthegreat/photocompare',
    ),
    ProjectData(
      name: 'CameraHW',
      description:
          'Hardware abstraction tool demonstrating deep understanding of Android\'s Camera2 API.',
      year: '2021',
      type: 'Hardware Utility App',
      url: 'https://github.com/rakinthegreat/CameraHW',
      downloadUrl: 'https://github.com/rakinthegreat/CameraHW/releases',
    ),
  ];

  static const List<EducationData> academics = [
    EducationData(
      degree: 'Bachelor of Science in Software Engineering (BSSE)',
      batch: '17',
      inst: 'Institute of Information Technology, University of Dhaka',
      period: 'Since July 2025',
    ),
    EducationData(
      degree: 'Bachelor of Business Administration (BBA)',
      batch: '33',
      inst: 'Institute of Business Administration, University of Dhaka',
      period: 'Feb 2025 - June 2025',
    ),
    EducationData(
      degree: 'Higher Secondary Certificate (HSC)',
      batch: '2024',
      inst: 'Notre Dame College',
      period: '2024',
    ),
    EducationData(
      degree: 'Secondary School Certificate (SSC)',
      batch: '2022',
      inst: 'Rajshahi Cantonment Public School & College',
      period: '2022',
    ),
  ];

  static const List<SkillData> skills = [
    SkillData('C', 'Language'),
    SkillData('Java', 'Language'),
    SkillData('Kotlin', 'Language'),
    SkillData('Python', 'Language'),
    SkillData('Dart / Flutter', 'Language · Framework'),
    SkillData('Android', 'Platform'),
    SkillData('JavaScript', 'Language'),
    SkillData('TypeScript', 'Language'),
    SkillData('React', 'Framework'),
    SkillData('Next.js', 'Framework'),
    SkillData('Node.js', 'Runtime'),
    SkillData('SQL', 'Database'),
    SkillData('Git', 'Tool'),
    SkillData('Linux', 'Platform'),
    SkillData('Dalvik Bytecode', 'Android Reverse Engineering'),
    SkillData('Docker', 'Containerization'),
    SkillData('GitHub Actions', 'CI/CD · Automation'),
    SkillData('Vercel / Render', 'Cloud Deployment'),
    SkillData('Arduino / ESP32', 'IoT · Embedded Systems'),
    SkillData('MQTT / WebSockets', 'Real-time Protocols'),
    SkillData('REST APIs', 'API Architecture'),
    SkillData('NVIDIA NIM', 'AI Microservices'),
    SkillData('PyTorch / Pandas / PySpark', 'Data Science & Machine Learning'),
    SkillData('Firebase / Supabase', 'Backend as a Service · Analytics'),
    SkillData('Inkscape / Canva / Figma', 'Vector Graphics & UI Design'),
    SkillData('Design Principles', 'Material · Glassmorphism · Neo-Brutalism · Minimalism · Neumorphism'),
  ];

  static const List<ExtracurricularData> extracurriculars = [
    ExtracurricularData('Digital SAT Instructor', 'Aemers', '2025 - 2026'),
    ExtracurricularData(
      'Part-time IELTS Instructor',
      'Robi 10 Minutes School',
      'Briefly',
    ),
    ExtracurricularData(
      'President (Research & Development)',
      'Notre Dame Nature Study Club',
      '2023 - 2024',
    ),
    ExtracurricularData(
      'Founding President & Chairperson of Advisory Board',
      'Rajshahi Cantonment Public Model United Nations Association (RCPMUNA)',
      'Pres: 2019-20 · Chair: 2023-24',
    ),
  ];
}

class ExtracurricularData {
  final String title;
  final String role;
  final String period;

  const ExtracurricularData(this.title, this.role, this.period);
}
