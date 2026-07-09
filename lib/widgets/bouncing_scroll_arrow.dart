import 'package:flutter/material.dart';
import '../theme.dart';

/// A continuously bouncing down-arrow scroll indicator.
class BouncingScrollArrow extends StatefulWidget {
  const BouncingScrollArrow({super.key});

  @override
  State<BouncingScrollArrow> createState() => _BouncingScrollArrowState();
}

class _BouncingScrollArrowState extends State<BouncingScrollArrow>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _bounce;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);

    _bounce = Tween<double>(begin: 0, end: 10).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );

    _opacity = Tween<double>(begin: 0.35, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) => Opacity(
        opacity: _opacity.value,
        child: Transform.translate(
          offset: Offset(0, _bounce.value),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  dot(size: 5, color: kGrey),
                  const SizedBox(width: 10),
                  Text('SCROLL', style: labelStyle()),
                ],
              ),
              const SizedBox(height: 8),
              // Stacked chevrons for depth
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _Chevron(opacity: 0.25),
                  const SizedBox(height: 3),
                  _Chevron(opacity: 0.55),
                  const SizedBox(height: 3),
                  _Chevron(opacity: 1.0),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Chevron extends StatelessWidget {
  final double opacity;
  const _Chevron({required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: CustomPaint(
        size: const Size(14, 7),
        painter: _ChevronPainter(),
      ),
    );
  }
}

class _ChevronPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = kGrey
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_) => false;
}
