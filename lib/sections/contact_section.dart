import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class ContactSection extends StatefulWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const ContactSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  State<ContactSection> createState() => _ContactSectionState();
}

class _ContactSectionState extends State<ContactSection> {
  bool _copied = false;
  static const _email = 'rakin.talukder@gmail.com';

  Future<void> _copyEmail() async {
    await Clipboard.setData(const ClipboardData(text: _email));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copied = false);
  }

  Future<void> _sendEmail() async {
    final uri = Uri(scheme: 'mailto', path: _email);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('contact-section'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction > 0.3) widget.onVisible();
      },
      child: Column(
        key: widget.sectionKey,
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
                    visibilityKey: 'contact-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('07  ·  CONTACT', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'contact-ghost',
                    delay: const Duration(milliseconds: 80),
                    child: Text('07', style: ghostNumberStyle(context)),
                  ),
                  const SizedBox(height: 12),
                  RevealOnScroll(
                    visibilityKey: 'contact-cta',
                    delay: const Duration(milliseconds: 120),
                    child: Text(
                      "Let's build\nsomething.",
                      style: sectionHeadingStyle(context),
                    ),
                  ),
                  const SizedBox(height: 32),
                  RevealOnScroll(
                    visibilityKey: 'contact-sub',
                    delay: const Duration(milliseconds: 200),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Text(
                        'Open to internships, collaborations, and interesting conversations.',
                        style: bodyStyle(context),
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'contact-email',
                    delay: const Duration(milliseconds: 280),
                    child: _EmailBlock(
                      email: _email,
                      copied: _copied,
                      onCopy: _copyEmail,
                      onEmail: _sendEmail,
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

class _EmailBlock extends StatefulWidget {
  final String email;
  final bool copied;
  final VoidCallback onCopy;
  final VoidCallback onEmail;

  const _EmailBlock({
    required this.email,
    required this.copied,
    required this.onCopy,
    required this.onEmail,
  });

  @override
  State<_EmailBlock> createState() => _EmailBlockState();
}

class _EmailBlockState extends State<_EmailBlock> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border.all(color: context.kLightGrey, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'EMAIL',
            style: labelStyle(context).copyWith(fontSize: 10),
          ),
          const SizedBox(height: 12),
          MouseRegion(
            cursor: SystemMouseCursors.click,
            onEnter: (_) => setState(() => _hovered = true),
            onExit: (_) => setState(() => _hovered = false),
            child: GestureDetector(
              onTap: widget.onEmail,
              child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 180),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: _hovered ? context.kGrey : context.kBlack,
                  letterSpacing: -0.5,
                ),
                child: Text(widget.email),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              _ActionButton(
                label: widget.copied ? '✓ COPIED' : 'COPY',
                onTap: widget.onCopy,
              ),
              const SizedBox(width: 12),
              _ActionButton(
                label: 'SEND EMAIL',
                filled: true,
                onTap: widget.onEmail,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatefulWidget {
  final String label;
  final bool filled;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.onTap,
    this.filled = false,
  });

  @override
  State<_ActionButton> createState() => _ActionButtonState();
}

class _ActionButtonState extends State<_ActionButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: widget.filled
                ? (_hovered ? context.kGrey : context.kBlack)
                : (_hovered ? context.kGhostGrey : context.kWhite),
            border: Border.all(
              color: widget.filled ? Colors.transparent : context.kLightGrey,
              width: 1,
            ),
          ),
          child: Text(
            widget.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: widget.filled ? context.kWhite : context.kBlack,
              letterSpacing: 2,
            ),
          ),
        ),
      ),
    );
  }
}
