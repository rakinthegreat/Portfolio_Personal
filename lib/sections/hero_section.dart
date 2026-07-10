import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/bouncing_scroll_arrow.dart';
import '../widgets/ambient_dots.dart';
import '../widgets/live_clock.dart';
import '../widgets/blinking_cursor.dart';

class HeroSection extends StatefulWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;
  final ScrollController scrollController;

  const HeroSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
    required this.scrollController,
  });

  @override
  State<HeroSection> createState() => _HeroSectionState();
}

class _HeroSectionState extends State<HeroSection>
    with TickerProviderStateMixin {
  static const _line1 = 'RAKIN';
  static const _line2 = 'TALUKDER';

  late final List<AnimationController> _charCtrls;
  late final List<Animation<double>> _charOpacity;
  late final List<Animation<Offset>> _charSlide;

  late final AnimationController _metaCtrl;
  late final Animation<double> _metaOpacity;
  late final Animation<Offset> _metaSlide;

  late final AnimationController _dotCtrl;
  late final Animation<double> _dotScale;

  bool _started = false;

  @override
  void initState() {
    super.initState();

    final allChars = _line1.length + _line2.length;

    _charCtrls = List.generate(
      allChars,
      (_) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      ),
    );

    _charOpacity = _charCtrls
        .map((c) => CurvedAnimation(parent: c, curve: Curves.easeOut))
        .toList();

    _charSlide = _charCtrls
        .map(
          (c) => Tween<Offset>(
            begin: const Offset(0, 0.6),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: c, curve: Curves.easeOutQuart)),
        )
        .toList();

    _metaCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _metaOpacity = CurvedAnimation(parent: _metaCtrl, curve: Curves.easeOut);
    _metaSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _metaCtrl, curve: Curves.easeOutCubic));

    _dotCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _dotScale = Tween<double>(
      begin: 0.7,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _dotCtrl, curve: Curves.easeInOut));
  }

  void _startAnimation() {
    if (_started) return;
    _started = true;

    final allChars = _line1.length + _line2.length;
    const baseDelay = 80;

    for (int i = 0; i < allChars; i++) {
      Future.delayed(Duration(milliseconds: i * baseDelay), () {
        if (mounted) _charCtrls[i].forward();
      });
    }

    Future.delayed(Duration(milliseconds: allChars * baseDelay + 100), () {
      if (mounted) _metaCtrl.forward();
    });
  }

  @override
  void dispose() {
    for (final c in _charCtrls) {
      c.dispose();
    }
    _metaCtrl.dispose();
    _dotCtrl.dispose();
    super.dispose();
  }

  Widget _buildChar(int index, String char, TextStyle style) {
    return ClipRect(
      child: FadeTransition(
        opacity: _charOpacity[index],
        child: SlideTransition(
          position: _charSlide[index],
          child: Text(char, style: style),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 600;
    final nameStyle = heroNameStyle(context);

    return VisibilityDetector(
      key: const Key('hero-section'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction > 0.2) {
          widget.onVisible();
          _startAnimation();
        }
      },
      child: SizedBox(
        key: widget.sectionKey,
        height: size.height,
        child: Stack(
          children: [
            // ── Ambient drifting dots in background ──────────────────────
            const Positioned.fill(child: AmbientDots()),

            // ── Main content with parallax ────────────────────────────────
            AnimatedBuilder(
              animation: widget.scrollController,
              builder: (_, child) {
                double offset = 0;
                try {
                  if (widget.scrollController.hasClients &&
                      widget.scrollController.positions.length == 1) {
                    offset = widget.scrollController.offset * 0.35;
                  }
                } catch (_) {}
                return Transform.translate(
                  offset: Offset(0, -offset),
                  child: child,
                );
              },
              child: MaxWidthBox(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: isMobile ? 24 : 48),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Top bar: Live clock top-right ─────────────────
                      Padding(
                        padding: const EdgeInsets.only(top: 32),
                        child: FadeTransition(
                          opacity: _metaOpacity,
                          child: Row(
                            children: [
                              // Location pill
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                    color: kLightGrey,
                                    width: 1,
                                  ),
                                ),
                                child: Text('DHAKA, BD', style: labelStyle()),
                              ),
                              const Spacer(),
                              const LiveClock(),
                            ],
                          ),
                        ),
                      ),

                      const Spacer(flex: 2),

                      // ── RAKIN ──────────────────────────────────────────
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: List.generate(
                          _line1.length,
                          (i) => _buildChar(i, _line1[i], nameStyle),
                        ),
                      ),

                      // ── TALUKDER + blinking cursor ─────────────────────
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          ...List.generate(
                            _line2.length,
                            (i) => _buildChar(
                              _line1.length + i,
                              _line2[i],
                              nameStyle,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Blinking cursor — visible after name finishes
                          FadeTransition(
                            opacity: _metaOpacity,
                            child: Padding(
                              padding: EdgeInsets.only(
                                bottom: isMobile ? 10 : 13,
                              ),
                              child: BlinkingCursor(size: isMobile ? 48 : 76),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 32),

                      // ── Rule + role label ──────────────────────────────
                      FadeTransition(
                        opacity: _metaOpacity,
                        child: SlideTransition(
                          position: _metaSlide,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              sectionDivider(),
                              const SizedBox(height: 20),
                              Row(
                                children: [
                                  ScaleTransition(
                                    scale: _dotScale,
                                    child: dot(size: 6),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'SOFTWARE ENGINEER  ·  IIT, DHAKA UNIVERSITY',
                                    style: labelStyle(),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),

                      const Spacer(flex: 2),

                      // ── Bouncing scroll arrow ──────────────────────────
                      FadeTransition(
                        opacity: _metaOpacity,
                        child: const Padding(
                          padding: EdgeInsets.only(bottom: 48),
                          child: BouncingScrollArrow(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
