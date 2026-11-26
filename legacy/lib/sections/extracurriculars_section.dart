import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

import '../data/portfolio_data.dart';

class ExtracurricularsSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const ExtracurricularsSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('extra-section'),
      onVisibilityChanged: (info) {
        final screenHeight = MediaQuery.of(context).size.height;
        if (info.visibleFraction > 0.3 || info.visibleBounds.height > screenHeight * 0.4) {
          onVisible();
        }
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
                    visibilityKey: 'extra-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('05  ·  EXPERIENCES', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'extra-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Text('05', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 70),
                          child: Text(
                            'Experiences',
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(PortfolioData.extracurriculars.length, (i) {
                    return RevealOnScroll(
                      visibilityKey: 'activity-$i',
                      delay: Duration(milliseconds: 80 + i * 70),
                      child: _ActivityRow(activity: PortfolioData.extracurriculars[i]),
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

class _ActivityRow extends StatefulWidget {
  final ExtracurricularData activity;
  const _ActivityRow({required this.activity});

  @override
  State<_ActivityRow> createState() => _ActivityRowState();
}

class _ActivityRowState extends State<_ActivityRow> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: _hovered ? context.kGhostGrey : context.kWhite,
        padding: const EdgeInsets.all(32),
        margin: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Organization name
            Text(
              widget.activity.role.toUpperCase(),
              style: GoogleFonts.spaceMono(
                fontSize: 12,
                letterSpacing: 2,
                color: context.kGrey,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            // Job Title / Role
            Text(
              widget.activity.title,
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: context.kBlack,
                height: 1.2,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 24),
            // Period
            Row(
              children: [
                Container(width: 32, height: 1, color: context.kGrey),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.activity.period,
                    style: GoogleFonts.spaceMono(
                      fontSize: 12,
                      color: context.kGrey,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
