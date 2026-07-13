import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class _Activity {
  final String title;
  final String role;
  final String period;

  const _Activity(this.title, this.role, this.period);
}

const _activities = [
  _Activity('Digital SAT Instructor', 'Aemers', '2025 — 2026'),
  _Activity('Part-time IELTS Instructor', 'Robi 10 Minutes School', 'Briefly'),
  _Activity('President (Research & Development)', 'Notre Dame Nature Study Club', '2023 — 2024'),
  _Activity(
    'Founding President & Chairperson of Advisory Board',
    'Rajshahi Cantonment Public Model United Nations Association (RCPMUNA)',
    'Pres: 2019-20 · Chair: 2023-24',
  ),
];

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
                    visibilityKey: 'extra-label',
                    child: Row(
                      children: [
                        dot(size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('05  ·  EXPERIENCES'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'extra-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Text('05', style: ghostNumberStyle(context)),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(_activities.length, (i) {
                    return RevealOnScroll(
                      visibilityKey: 'activity-$i',
                      delay: Duration(milliseconds: 80 + i * 70),
                      child: _ActivityRow(activity: _activities[i]),
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
  final _Activity activity;
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
        color: _hovered ? kGhostGrey : kWhite,
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
                color: kGrey,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            // Job Title / Role
            Text(
              widget.activity.title,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: kBlack,
                height: 1.2,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 24),
            // Period
            Row(
              children: [
                Container(
                  width: 32,
                  height: 1,
                  color: kGrey,
                ),
                const SizedBox(width: 12),
                Text(
                  widget.activity.period,
                  style: GoogleFonts.spaceMono(
                    fontSize: 12,
                    color: kGrey,
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
