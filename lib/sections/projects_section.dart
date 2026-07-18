import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/live_preview_popup.dart';
import '../widgets/reveal_on_scroll.dart';
import '../data/portfolio_data.dart';

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
                      return GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: isMobile ? 1 : 2,
                          childAspectRatio: isMobile ? 1.0 : 1.2,
                          mainAxisExtent: 420,
                          crossAxisSpacing: 24,
                          mainAxisSpacing: 24,
                        ),
                        itemCount: PortfolioData.projects.length,
                        itemBuilder: (context, index) {
                          final project = PortfolioData.projects[index];
                          return RevealOnScroll(
                            visibilityKey: 'proj-card-$index',
                            delay: Duration(milliseconds: 100 + index * 80),
                            child: _ProjectCard(project: project),
                          );
                        },
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
  final ProjectData project;
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
            Text(
              widget.project.name,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: context.kBlack,
              ),
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
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (widget.project.url.isNotEmpty)
                  _ProjectActionButton(
                    label: 'Source',
                    icon: Icons.code,
                    onTap: () => launchUrl(Uri.parse(widget.project.url)),
                  ),
                if (widget.project.previewUrl != null && widget.project.previewUrl!.isNotEmpty)
                  _ProjectActionButton(
                    label: 'Live Preview',
                    icon: Icons.visibility,
                    onTap: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => LivePreviewPopup(
                          url: widget.project.previewUrl!,
                          isMobileView: widget.project.isMobileView,
                        ),
                      );
                    },
                  ),
                if (widget.project.downloadUrl != null && widget.project.downloadUrl!.isNotEmpty)
                  _ProjectActionButton(
                    label: 'Download App',
                    icon: Icons.download,
                    onTap: () => launchUrl(Uri.parse(widget.project.downloadUrl!)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;

  const _ProjectActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: context.kLightGrey),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: context.kBlack),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: context.kBlack,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
