import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';

class FooterSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const FooterSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('footer-section'),
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
              vertical: 40,
            ),
            child: MaxWidthBox(
              child: Row(
                children: [
                  Row(
                    children: [
                      dot(size: 5, color: kGrey),
                      const SizedBox(width: 10),
                      Text(
                        'RAKIN TALUKDER',
                        style: labelStyle(),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    '© ${DateTime.now().year}',
                    style: labelStyle(),
                  ),
                  const SizedBox(width: 24),
                  Text(
                    'DHAKA, BD',
                    style: labelStyle(),
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
