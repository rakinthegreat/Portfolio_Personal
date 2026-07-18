import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

import '../data/portfolio_data.dart';

class ExpertiseSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const ExpertiseSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('expertise-section'),
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
                    visibilityKey: 'exp-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('03  ·  EXPERTISE', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'exp-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Text('03', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 70),
                          child: Text(
                            'Tech Stack',
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Skills list
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final bool twoCols = constraints.maxWidth > 600;
                      final double itemWidth = twoCols
                          ? (constraints.maxWidth - 48) / 2
                          : constraints.maxWidth;

                      return Wrap(
                        spacing: 48,
                        children: List.generate(PortfolioData.skills.length, (index) {
                          final skill = PortfolioData.skills[index];
                          return SizedBox(
                            width: itemWidth,
                            child: RevealOnScroll(
                              visibilityKey: 'skill-$index',
                              delay: Duration(milliseconds: 50 + (index % 3) * 50),
                              child: _SkillChip(skill: skill),
                            ),
                          );
                        }),
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

class _SkillChip extends StatefulWidget {
  final SkillData skill;
  const _SkillChip({required this.skill});

  @override
  State<_SkillChip> createState() => _SkillRowState();
}

class _SkillRowState extends State<_SkillChip> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: _hovered ? context.kGhostGrey : context.kWhite,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 4),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: _hovered ? context.kBlack : context.kGrey,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(child: Text(widget.skill.name, style: itemStyle(context))),
            Text(widget.skill.category, style: itemSubStyle(context)),
          ],
        ),
      ),
    );
  }
}
