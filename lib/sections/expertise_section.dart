import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class _Skill {
  final String name;
  final String category;
  const _Skill(this.name, this.category);
}

const _skills = [
  _Skill('Python', 'Language'),
  _Skill('Dart / Flutter', 'Language · Framework'),
  _Skill('JavaScript', 'Language'),
  _Skill('TypeScript', 'Language'),
  _Skill('React', 'Framework'),
  _Skill('Next.js', 'Framework'),
  _Skill('Node.js', 'Runtime'),
  _Skill('SQL', 'Database'),
  _Skill('Git', 'Tool'),
  _Skill('Linux', 'Platform'),
];

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
          sectionDivider(),
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 24 : 48,
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
                        dot(size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('03  ·  EXPERTISE'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'exp-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Text('03', style: ghostNumberStyle(context)),
                  ),
                  const SizedBox(height: 12),
                  // Skills list
                  ...List.generate(_skills.length, (i) {
                    return RevealOnScroll(
                      visibilityKey: 'skill-$i',
                      delay: Duration(milliseconds: 100 + i * 60),
                      child: _SkillRow(skill: _skills[i]),
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

class _SkillRow extends StatefulWidget {
  final _Skill skill;
  const _SkillRow({required this.skill});

  @override
  State<_SkillRow> createState() => _SkillRowState();
}

class _SkillRowState extends State<_SkillRow> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: _hovered ? kGhostGrey : kWhite,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 4),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: _hovered ? kBlack : kGrey,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Text(widget.skill.name, style: itemStyle()),
            ),
            Text(widget.skill.category, style: itemSubStyle()),
          ],
        ),
      ),
    );
  }
}
