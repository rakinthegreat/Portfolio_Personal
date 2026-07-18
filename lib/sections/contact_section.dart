import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:visibility_detector/visibility_detector.dart';
import 'package:printing/printing.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';
import '../utils/resume_generator.dart';
import '../utils/web_downloader.dart';

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
  static const _email = 'support@rakin-talukder.me';

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
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Text('07', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 70),
                          child: Text(
                            "Let's build\nsomething.",
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
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
                    visibilityKey: 'contact-actions',
                    delay: const Duration(milliseconds: 280),
                    child: Wrap(
                      spacing: 24,
                      runSpacing: 24,
                      children: [
                        _EmailBlock(
                          email: _email,
                          copied: _copied,
                          onCopy: _copyEmail,
                          onEmail: _sendEmail,
                        ),
                        const _ResumeDownloadBlock(),
                      ],
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
          Text('EMAIL', style: labelStyle(context).copyWith(fontSize: 10)),
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

class _ResumeDownloadBlock extends StatefulWidget {
  const _ResumeDownloadBlock();

  @override
  State<_ResumeDownloadBlock> createState() => _ResumeDownloadBlockState();
}

class _ResumeDownloadBlockState extends State<_ResumeDownloadBlock> {
  bool _hovered = false;
  bool _isGenerating = false;

  void _downloadResume() async {
    setState(() => _isGenerating = true);
    try {
      final pdf = await ResumeGenerator.generate();
      final bytes = await pdf.save();
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => _ResumePreviewDialog(pdfBytes: bytes),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

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
          Text('RESUME', style: labelStyle(context).copyWith(fontSize: 10)),
          const SizedBox(height: 12),
          MouseRegion(
            cursor: SystemMouseCursors.click,
            onEnter: (_) => setState(() => _hovered = true),
            onExit: (_) => setState(() => _hovered = false),
            child: GestureDetector(
              onTap: _isGenerating ? null : _downloadResume,
              child: AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 200),
                style: bodyStyle(context).copyWith(
                  color: _hovered ? context.kGrey : context.kBlack,
                  fontWeight: FontWeight.w500,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_isGenerating ? 'GENERATING...' : 'PREVIEW RESUME'),
                    const SizedBox(width: 24),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _hovered ? context.kBlack : context.kGhostGrey,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.open_in_new_rounded,
                        size: 14,
                        color: _hovered ? context.kWhite : context.kBlack,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResumePreviewDialog extends StatefulWidget {
  final Uint8List pdfBytes;
  const _ResumePreviewDialog({required this.pdfBytes});

  @override
  State<_ResumePreviewDialog> createState() => _ResumePreviewDialogState();
}

class _ResumePreviewDialogState extends State<_ResumePreviewDialog> {
  bool _isDownloadingPng = false;

  void _downloadPdf() {
    WebDownloader.download(widget.pdfBytes, 'Rakin_Talukder_Resume.pdf', 'application/pdf');
  }

  void _downloadPng() async {
    setState(() => _isDownloadingPng = true);
    try {
      await for (final page in Printing.raster(widget.pdfBytes, dpi: 300)) {
        final png = await page.toPng();
        WebDownloader.download(png, 'Rakin_Talukder_Resume.png', 'image/png');
        break; 
      }
    } finally {
      if (mounted) setState(() => _isDownloadingPng = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 700;

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.all(isMobile ? 16 : 24),
      child: Container(
        width: 800,
        height: MediaQuery.of(context).size.height * 0.9,
        decoration: BoxDecoration(
          color: context.kWhite,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.kLightGrey, width: 1),
        ),
        child: isMobile
            ? Column(
                children: [
                  // Custom Action Topbar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        Text('PREVIEW', style: labelStyle(context).copyWith(fontSize: 12)),
                        const Spacer(),
                        IconButton(
                          onPressed: _downloadPdf,
                          icon: Icon(Icons.picture_as_pdf, color: context.kBlack),
                          tooltip: 'Download PDF',
                        ),
                        IconButton(
                          onPressed: _isDownloadingPng ? null : _downloadPng,
                          icon: _isDownloadingPng
                              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                              : Icon(Icons.image, color: context.kBlack),
                          tooltip: 'Download PNG',
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: Icon(Icons.close, color: context.kBlack),
                          tooltip: 'Close',
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  // PDF Preview body
                  Expanded(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
                      child: PdfPreview(
                        build: (format) => widget.pdfBytes,
                        useActions: false,
                        allowPrinting: false,
                        allowSharing: false,
                        canChangeOrientation: false,
                        canChangePageFormat: false,
                      ),
                    ),
                  ),
                ],
              )
            : Row(
                children: [
                  // PDF Preview body
                  Expanded(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.horizontal(left: Radius.circular(12)),
                      child: PdfPreview(
                        build: (format) => widget.pdfBytes,
                        useActions: false,
                        allowPrinting: false,
                        allowSharing: false,
                        canChangeOrientation: false,
                        canChangePageFormat: false,
                      ),
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  // Custom Action Sidebar
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                    child: SizedBox(
                      width: 120,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Align(
                            alignment: Alignment.topRight,
                            child: IconButton(
                              onPressed: () => Navigator.of(context).pop(),
                              icon: Icon(Icons.close, color: context.kBlack),
                              tooltip: 'Close',
                            ),
                          ),
                          const Spacer(),
                          Text('DOWNLOADS', style: labelStyle(context).copyWith(fontSize: 10, color: context.kGrey), textAlign: TextAlign.left),
                          const SizedBox(height: 16),
                          TextButton.icon(
                            onPressed: _downloadPdf,
                            icon: Icon(Icons.picture_as_pdf, size: 18, color: context.kBlack),
                            label: Text('PDF', style: TextStyle(color: context.kBlack)),
                            style: TextButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.all(16)),
                          ),
                          const SizedBox(height: 8),
                          TextButton.icon(
                            onPressed: _isDownloadingPng ? null : _downloadPng,
                            icon: _isDownloadingPng 
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                : Icon(Icons.image, size: 18, color: context.kBlack),
                            label: Text('PNG', style: TextStyle(color: context.kBlack)),
                            style: TextButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.all(16)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
