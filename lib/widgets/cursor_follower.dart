import 'package:flutter/material.dart';
import '../theme.dart';

/// Custom animated cursor — a small black dot that follows the mouse
/// with a slight spring lag. Web/desktop only; no-ops on touch devices.
class CursorFollower extends StatefulWidget {
  final Widget child;
  const CursorFollower({super.key, required this.child});

  @override
  State<CursorFollower> createState() => _CursorFollowerState();
}

class _CursorFollowerState extends State<CursorFollower>
    with SingleTickerProviderStateMixin {
  Offset _cursor = Offset.zero;
  Offset _dot = Offset.zero;
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16),
    )..addListener(_tick);
    _ctrl.repeat();
  }

  void _tick() {
    final dx = (_cursor.dx - _dot.dx) * 0.12;
    final dy = (_cursor.dy - _dot.dy) * 0.12;
    if ((dx.abs() + dy.abs()) > 0.1) {
      setState(() => _dot = Offset(_dot.dx + dx, _dot.dy + dy));
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.none,
      onHover: (event) => _cursor = event.position,
      child: Stack(
        children: [
          widget.child,
          // Lagging dot
          Positioned(
            left: _dot.dx - 4,
            top: _dot.dy - 4,
            child: IgnorePointer(
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: context.kBlack,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          // Sharp instant dot (smaller)
          Positioned(
            left: _cursor.dx - 2,
            top: _cursor.dy - 2,
            child: IgnorePointer(
              child: Container(
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: context.kBlack.withValues(alpha: 0.5),
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
