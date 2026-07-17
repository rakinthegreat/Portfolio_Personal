import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/live_preview_popup.dart';
import '../widgets/reveal_on_scroll.dart';

class _Project {
  final String name;
  final String description;
  final String year;
  final String type;
  final String url;
  final String? previewUrl;

  const _Project({
    required this.name,
    required this.description,
    required this.year,
    required this.type,
    required this.url,
    this.previewUrl,
  });
}

const _projects = [
  _Project(
    name: 'WaitLess',
    description: 'A productivity app that detects idle moments and prompts mindful tasks to prevent doomscrolling.',
    year: '2024',
    type: 'Web & Mobile App',
    url: 'https://github.com/rakinthegreat/friction_titanicSwimTeam',
    previewUrl: 'https://waitless-friction.vercel.app',
  ),
  _Project(
    name: 'HydroSync',
    description: 'AI-calibrated hydration tracker generating personalized strategies via multi-AI fallback architecture.',
    year: '2024',
    type: 'Mobile App (Health/AI)',
    url: 'https://github.com/rakinthegreat/hydrosync-project',
  ),
  _Project(
    name: 'Fintech App Demo',
    description: 'Highly polished, pixel-perfect UI/UX demonstration of a modern financial application in Flutter.',
    year: '2024',
    type: 'Web/Mobile UI Showcase',
    url: 'https://github.com/rakinthegreat/Fintech_Demo_Flutter',
    previewUrl: 'https://curzpaydemo.vercel.app/',
  ),
  _Project(
    name: 'Plassey 1757',
    description: 'Historical social deduction multiplayer web game based on the Battle of Plassey with real-time sync.',
    year: '2024',
    type: 'Web App (Game)',
    url: 'https://github.com/rakinthegreat/Plassey',
    previewUrl: 'https://plassey.vercel.app',
  ),
  _Project(
    name: 'Loaf',
    description: 'Interactive sensory game for cats featuring procedural Koi AI and a custom haptic engine.',
    year: '2024',
    type: 'Mobile App (Game)',
    url: 'https://github.com/rakinthegreat/loaf',
  ),
  _Project(
    name: 'IIT Indoor Games',
    description: 'Interactive application highlighting community engagement and event-specific user experiences.',
    year: '2023',
    type: 'Interactive Application',
    url: 'https://github.com/rakinthegreat',
  ),
  _Project(
    name: 'GCamUpdater',
    description: 'Custom update logic injected into Google Camera mods via Dalvik Bytecode reverse engineering.',
    year: '2021',
    type: 'Modding Utility',
    url: 'https://github.com/rakinthegreat/GcamUpdater',
  ),
  _Project(
    name: 'ImageEnhanceAndroid',
    description: 'Showcases low-level computational photography and image manipulation directly on Android devices.',
    year: '2021',
    type: 'Image Processing',
    url: 'https://gitlab.com/rakinthegreat1/ImageEnhanceAndroid',
  ),
  _Project(
    name: 'PhotoCompare',
    description: 'Complex UI state management and aggressive memory optimization for Matrix zooming/panning.',
    year: '2021',
    type: 'Utility App',
    url: 'https://github.com/rakinthegreat/photocompare',
  ),
  _Project(
    name: 'CameraHW',
    description: 'Hardware abstraction tool demonstrating deep understanding of Android\'s Camera2 API.',
    year: '2017',
    type: 'Hardware Utility App',
    url: 'https://github.com/rakinthegreat/CameraHW',
  ),
];

class ProjectsSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const ProjectsSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('projects-section'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction > 0.3) onVisible();
      },
      child: Column(
        key: sectionKey,
        children: [
          sectionDivider(context),
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile
                  ? 24
                  : MediaQuery.of(context).size.width * 0.08,
              vertical: kSectionPaddingV,
            ),
            child: MaxWidthBox(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RevealOnScroll(
                    visibilityKey: 'proj-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('04  ·  PROJECTS & APPS', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'proj-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Text('04', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 70),
                          child: Text(
                            'Featured Projects',
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Grid or single column depending on width
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final crossCount = constraints.maxWidth > 500 ? 2 : 1;
                      return GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: crossCount,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: crossCount == 2 ? 1.5 : 2.2,
                        ),
                        itemCount: _projects.length,
                        itemBuilder: (ctx, i) => RevealOnScroll(
                          visibilityKey: 'proj-card-$i',
                          delay: Duration(milliseconds: 100 + i * 80),
                          child: _ProjectCard(project: _projects[i]),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProjectCard extends StatefulWidget {
  final _Project project;
  const _ProjectCard({required this.project});

  @override
  State<_ProjectCard> createState() => _ProjectCardState();
}

class _ProjectCardState extends State<_ProjectCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: () {
          if (widget.project.previewUrl != null && widget.project.previewUrl!.isNotEmpty) {
            showDialog(
              context: context,
              builder: (ctx) => LivePreviewPopup(url: widget.project.previewUrl!),
            );
          } else if (widget.project.url.isNotEmpty) {
            launchUrl(Uri.parse(widget.project.url));
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _hovered ? context.kGhostGrey : context.kWhite,
            border: Border.all(
              color: _hovered
                  ? context.kBlack.withValues(alpha: 0.2)
                  : context.kLightGrey,
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.project.name,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: context.kBlack,
                      ),
                    ),
                  ),
                  Text(
                    '↗',
                    style: TextStyle(
                      fontSize: 16,
                      color: _hovered ? context.kBlack : context.kGrey,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                widget.project.description,
                style: TextStyle(
                  fontSize: 13,
                  color: context.kGrey,
                  height: 1.5,
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  Text(
                    widget.project.type.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      color: context.kGrey,
                      letterSpacing: 2,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    widget.project.year,
                    style: TextStyle(
                      fontSize: 13,
                      color: context.kGrey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
