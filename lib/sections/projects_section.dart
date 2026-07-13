import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class _Project {
  final String name;
  final String description;
  final String year;
  final String type;
  final String url;

  const _Project({
    required this.name,
    required this.description,
    required this.year,
    required this.type,
    required this.url,
  });
}

const _projects = [
  _Project(
    name: 'Project Alpha',
    description: 'A full-stack web application built with Next.js and Node.js.',
    year: '2024',
    type: 'Web App',
    url: '',
  ),
  _Project(
    name: 'MobileKit',
    description: 'Cross-platform mobile app crafted in Flutter & Dart.',
    year: '2024',
    type: 'Mobile App',
    url: '',
  ),
  _Project(
    name: 'DataFlow',
    description: 'Python data pipeline for real-time analytics processing.',
    year: '2023',
    type: 'Tool',
    url: '',
  ),
  _Project(
    name: 'PortfolioOS',
    description: 'This very website — minimalist personal portfolio.',
    year: '2025',
    type: 'Website',
    url: '',
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
          sectionDivider(),
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 24 : MediaQuery.of(context).size.width * 0.08,
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
                        dot(size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('04  ·  PROJECTS & APPS'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'proj-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Text('04', style: ghostNumberStyle(context)),
                  ),
                  const SizedBox(height: 16),
                  // Grid or single column depending on width
                  LayoutBuilder(builder: (context, constraints) {
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
                  }),
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
        onTap: widget.project.url.isNotEmpty
            ? () => launchUrl(Uri.parse(widget.project.url))
            : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _hovered ? kGhostGrey : kWhite,
            border: Border.all(
              color: _hovered ? kBlack.withValues(alpha: 0.2) : kLightGrey,
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
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: kBlack,
                      ),
                    ),
                  ),
                  Text(
                    '↗',
                    style: TextStyle(
                      fontSize: 16,
                      color: _hovered ? kBlack : kGrey,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                widget.project.description,
                style: const TextStyle(
                  fontSize: 13,
                  color: kGrey,
                  height: 1.5,
                ),
              ),
              const Spacer(),
              Row(
                children: [
                  Text(
                    widget.project.type.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      color: kGrey,
                      letterSpacing: 2,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    widget.project.year,
                    style: const TextStyle(
                      fontSize: 13,
                      color: kGrey,
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
