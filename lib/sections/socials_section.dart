import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class _Social {
  final String platform;
  final String handle;
  final String url;

  const _Social(this.platform, this.handle, this.url);
}

const _socials = [
  _Social('GitHub', '@rakintalukder', 'https://github.com/rakintalukder'),
  _Social('LinkedIn', 'Rakin Talukder', 'https://linkedin.com/in/rakintalukder'),
  _Social('Twitter / X', '@rakintalukder', 'https://twitter.com/rakintalukder'),
  _Social('Instagram', '@rakin.talukder', 'https://instagram.com/rakin.talukder'),
];

class SocialsSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const SocialsSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('socials-section'),
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
                    visibilityKey: 'social-label',
                    child: Row(
                      children: [
                        dot(size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('06  ·  SOCIALS'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'social-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Text('06', style: ghostNumberStyle(context)),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(_socials.length, (i) {
                    return RevealOnScroll(
                      visibilityKey: 'social-$i',
                      delay: Duration(milliseconds: 80 + i * 80),
                      child: _SocialRow(social: _socials[i]),
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

class _SocialRow extends StatefulWidget {
  final _Social social;
  const _SocialRow({required this.social});

  @override
  State<_SocialRow> createState() => _SocialRowState();
}

class _SocialRowState extends State<_SocialRow> {
  bool _hovered = false;

  Future<void> _launch() async {
    final uri = Uri.parse(widget.social.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: _launch,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          color: _hovered ? kGhostGrey : kWhite,
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 4),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.social.platform,
                      style: TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w700,
                        color: _hovered ? kBlack : kBlack,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  Text(
                    widget.social.handle,
                    style: TextStyle(
                      fontSize: 14,
                      color: _hovered ? kBlack : kGrey,
                    ),
                  ),
                  const SizedBox(width: 12),
                  AnimatedDefaultTextStyle(
                    duration: const Duration(milliseconds: 180),
                    style: TextStyle(
                      fontSize: 18,
                      color: _hovered ? kBlack : kGrey,
                    ),
                    child: const Text('↗'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Divider(color: kLightGrey, thickness: 1, height: 1),
            ],
          ),
        ),
      ),
    );
  }
}
