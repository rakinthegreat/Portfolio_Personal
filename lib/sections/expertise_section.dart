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
  _Skill('C', 'Language'),
  _Skill('Java', 'Language'),
  _Skill('Kotlin', 'Language'),
  _Skill('Python', 'Language'),
  _Skill('Dart / Flutter', 'Language · Framework'),
  _Skill('Android Development', 'Platform'),
  _Skill('JavaScript', 'Language'),
  _Skill('TypeScript', 'Language'),
  _Skill('React', 'Framework'),
  _Skill('Next.js', 'Framework'),
  _Skill('Node.js', 'Runtime'),
  _Skill('SQL', 'Database'),
  _Skill('Git', 'Tool'),
  _Skill('Linux', 'Platform'),
  _Skill('Dalvik Bytecode', 'Android Reverse Engineering'),
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
          sectionDivider(context),
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
                    child: Text('03', style: ghostNumberStyle(context)),
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
                        spacing: 48, // horizontal spacing between columns
                        runSpacing: 0,
                        children: List.generate(_skills.length, (i) {
                          return SizedBox(
                            width: itemWidth,
                            child: RevealOnScroll(
                              visibilityKey: 'skill-$i',
                              delay: Duration(milliseconds: 100 + (i % (twoCols ? 2 : 1)) * 100),
                              child: _SkillRow(skill: _skills[i]),
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
            Expanded(
              child: Text(widget.skill.name, style: itemStyle(context)),
            ),
            Text(widget.skill.category, style: itemSubStyle(context)),
          ],
        ),
      ),
    );
  }
}
