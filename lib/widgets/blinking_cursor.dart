import 'package:flutter/material.dart';
import '../theme.dart';

/// A blinking text cursor  ▋  that pulses on/off continuously.
class BlinkingCursor extends StatefulWidget {
  final double size;
  const BlinkingCursor({super.key, this.size = 20});

  @override
  State<BlinkingCursor> createState() => _BlinkingCursorState();
}

class _BlinkingCursorState extends State<BlinkingCursor>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 530),
    )..repeat(reverse: true);
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
        opacity: _ctrl.value > 0.5 ? 1.0 : 0.0,
        child: Container(
          width: widget.size * 0.12,
          height: widget.size,
          color: context.kBlack,
        ),
      ),
    );
  }
}
