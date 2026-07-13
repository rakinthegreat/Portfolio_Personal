import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class AboutSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const AboutSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('about-section'),
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
                  // Section label row
                  RevealOnScroll(
                    visibilityKey: 'about-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('01  ·  ABOUT', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  // Ghost number + heading row
                  RevealOnScroll(
                    visibilityKey: 'about-heading',
                    delay: const Duration(milliseconds: 100),
                    child: Stack(
                      children: [
                        Text('01', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Text(
                            'Building things\nthat matter.',
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  // Bio
                  RevealOnScroll(
                    visibilityKey: 'about-bio',
                    delay: const Duration(milliseconds: 200),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: Text(
                        'I\'m Rakin — a software engineer from Dhaka, Bangladesh. '
                        'I study at IIT, Dhaka University and spend my time '
                        'crafting clean, purposeful software. I care deeply about '
                        'design, performance, and the small details that make '
                        'experiences feel right.',
                        style: bodyStyle(context),
                      ),
                    ),
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
