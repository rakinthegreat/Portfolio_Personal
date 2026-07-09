import 'package:flutter/material.dart';
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
  _Activity('IIT Programming Club', 'Member', '2022 — Present'),
  _Activity('Competitive Programming', 'Contestant', '2021 — Present'),
  _Activity('Open Source Contributions', 'Contributor', '2023 — Present'),
  _Activity('Tech Blogging', 'Author', '2023 — Present'),
  _Activity('Hackathon Participant', 'Team Lead', '2022 — Present'),
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
              horizontal: isMobile ? 24 : 48,
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
                        sectionLabel('05  ·  EXTRACURRICULARS'),
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
    final isMobile = MediaQuery.of(context).size.width < 600;

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        color: _hovered ? kGhostGrey : kWhite,
        padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 4),
        child: Column(
          children: [
            Row(
              children: [
                dot(size: 5, color: _hovered ? kBlack : kGrey),
                const SizedBox(width: 16),
                Expanded(
                  child: isMobile
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(widget.activity.title,
                                style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: kBlack)),
                            const SizedBox(height: 4),
                            Text(widget.activity.role,
                                style: const TextStyle(
                                    fontSize: 13, color: kGrey)),
                          ],
                        )
                      : Row(
                          children: [
                            Expanded(
                              child: Text(widget.activity.title,
                                  style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w700,
                                      color: kBlack)),
                            ),
                            Text(widget.activity.role,
                                style: const TextStyle(
                                    fontSize: 14, color: kGrey)),
                          ],
                        ),
                ),
                const SizedBox(width: 16),
                Text(widget.activity.period,
                    style: const TextStyle(fontSize: 12, color: kGrey)),
              ],
            ),
            const SizedBox(height: 22),
            const Divider(color: kLightGrey, thickness: 1, height: 1),
          ],
        ),
      ),
    );
  }
}
