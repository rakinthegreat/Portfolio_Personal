import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';

/// Enhanced scroll-reveal: fade + slide-up + subtle scale-in.
/// Uses an elastic/spring-like curve for a fluid feel.
class RevealOnScroll extends StatefulWidget {
  final Widget child;
  final String visibilityKey;
  final Duration delay;
  final double slideOffset;
  final double scaleFrom;
  final Duration duration;

  const RevealOnScroll({
    super.key,
    required this.child,
    required this.visibilityKey,
    this.delay = Duration.zero,
    this.slideOffset = 32,
    this.scaleFrom = 0.97,
    this.duration = const Duration(milliseconds: 750),
  });

  @override
  State<RevealOnScroll> createState() => _RevealOnScrollState();
}

class _RevealOnScrollState extends State<RevealOnScroll>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<Offset> _slide;
  late final Animation<double> _scale;
  bool _triggered = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);

    _opacity = CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.0, 0.65, curve: Curves.easeOut),
    );

    _slide = Tween<Offset>(
      begin: Offset(0, widget.slideOffset / 100),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.0, 1.0, curve: Curves.easeOutQuart),
    ));

    _scale = Tween<double>(
      begin: widget.scaleFrom,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.0, 0.8, curve: Curves.easeOutCubic),
    ));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onVisibilityChanged(VisibilityInfo info) {
    if (!_triggered && info.visibleFraction > 0.08) {
      _triggered = true;
      Future.delayed(widget.delay, () {
        if (mounted) _ctrl.forward();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return VisibilityDetector(
      key: Key(widget.visibilityKey),
      onVisibilityChanged: _onVisibilityChanged,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, child) => FadeTransition(
          opacity: _opacity,
          child: SlideTransition(
            position: _slide,
            child: ScaleTransition(
              scale: _scale,
              alignment: Alignment.centerLeft,
              child: child,
            ),
          ),
        ),
        child: widget.child,
      ),
    );
  }
}
