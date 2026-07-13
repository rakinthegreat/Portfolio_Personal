import 'package:flutter/material.dart';
import '../theme.dart';

/// Ambient floating dots that drift and breathe continuously in the background.
/// Each dot has its own phase, size, position, and drift speed.
class AmbientDots extends StatefulWidget {
  const AmbientDots({super.key});

  @override
  State<AmbientDots> createState() => _AmbientDotsState();
}

class _AmbientDotsState extends State<AmbientDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  // Each entry: [x%, y%, size, phaseOffset, driftAmplitudeX, driftAmplitudeY]
  static const _dots = [
    [0.06, 0.18, 80.0, 0.0, 18.0, 12.0],
    [0.88, 0.12, 40.0, 0.3, 10.0, 20.0],
    [0.72, 0.72, 120.0, 0.6, 14.0, 8.0],
    [0.14, 0.80, 55.0, 0.9, 8.0, 16.0],
    [0.50, 0.40, 30.0, 0.45, 22.0, 10.0],
    [0.92, 0.50, 64.0, 0.75, 6.0, 18.0],
  ];

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final w = constraints.maxWidth;
      final h = constraints.maxHeight;

      return AnimatedBuilder(
        animation: _ctrl,
        builder: (context, child) {
          final t = _ctrl.value;

          return Stack(
            children: _dots.map((d) {
              final baseX = d[0] * w;
              final baseY = d[1] * h;
              final size = d[2];
              final phase = d[3];
              final ampX = d[4];
              final ampY = d[5];

              // Lissajous-like drift
              final progress = (t + phase) % 1.0;
              final angle = progress * 2 * 3.14159;
              final dx = ampX * _sin(angle);
              final dy = ampY * _cos(angle * 0.7);

              // Breathing scale: 0.85 → 1.0
              final scale = 0.85 + 0.15 * _sin(angle + phase);

              return Positioned(
                left: baseX + dx - size / 2,
                top: baseY + dy - size / 2,
                child: Transform.scale(
                  scale: scale,
                  child: Container(
                    width: size,
                    height: size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: context.kBlack.withValues(alpha: 0.045),
                        width: 1,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          );
        },
      );
    });
  }

  double _sin(double radians) => (radians % (2 * 3.14159) < 3.14159)
      ? (radians % 3.14159) / (3.14159 / 2) - 1
      : _approxSin(radians);

  double _approxSin(double r) {
    // Cheap but good enough sine approximation
    r = r % (2 * 3.14159265);
    if (r < 0) r += 2 * 3.14159265;
    return r < 3.14159265
        ? (4 * r * (3.14159265 - r)) / (3.14159265 * 3.14159265) * 0.9
        : -(4 * (r - 3.14159265) * (2 * 3.14159265 - r)) /
            (3.14159265 * 3.14159265) *
            0.9;
  }

  double _cos(double r) => _approxSin(r + 3.14159265 / 2);
}
