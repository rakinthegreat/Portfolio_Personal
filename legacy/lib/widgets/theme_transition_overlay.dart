import 'package:flutter/material.dart';

class ThemeController extends InheritedWidget {
  final bool isDark;
  final void Function(Offset) toggleTheme;

  const ThemeController({
    super.key,
    required this.isDark,
    required this.toggleTheme,
    required super.child,
  });

  static ThemeController of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<ThemeController>()!;
  }

  @override
  bool updateShouldNotify(ThemeController oldWidget) => isDark != oldWidget.isDark;
}

class ThemeTransitionOverlay extends StatefulWidget {
  final bool initialDark;
  final void Function(bool) onThemeChanged;
  final Widget child;

  const ThemeTransitionOverlay({
    super.key,
    required this.initialDark,
    required this.onThemeChanged,
    required this.child,
  });

  @override
  State<ThemeTransitionOverlay> createState() => _ThemeTransitionOverlayState();
}

class _ThemeTransitionOverlayState extends State<ThemeTransitionOverlay> with SingleTickerProviderStateMixin {
  late bool _isDark;
  late bool _wasDark;
  Offset? _tapPos;
  late AnimationController _ctrl;
  late Animation<double> _radiusAnim;

  @override
  void initState() {
    super.initState();
    _isDark = widget.initialDark;
    _wasDark = _isDark;
    
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    
    _radiusAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOutCubic),
    );

    _ctrl.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        setState(() {
          _wasDark = _isDark;
        });
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _toggleTheme(Offset pos) {
    if (_ctrl.isAnimating) return;
    
    setState(() {
      _wasDark = _isDark;
      _isDark = !_isDark;
      _tapPos = pos;
    });
    
    widget.onThemeChanged(_isDark);
    
    _ctrl.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    // Max radius needs to cover the whole screen from any point
    final maxRadius = size.longestSide * 1.5;

    final oldColor = _wasDark ? const Color(0xFF070707) : const Color(0xFFFFFFFF);
    final newColor = _isDark ? const Color(0xFF070707) : const Color(0xFFFFFFFF);

    return Directionality(
      textDirection: TextDirection.ltr,
      child: Stack(
        children: [
          // Bottom layer: Old background color
          Positioned.fill(
            child: ColoredBox(color: oldColor),
          ),
          
          // Ripple layer: New background color expanding
          if (_ctrl.isAnimating && _tapPos != null)
            AnimatedBuilder(
              animation: _radiusAnim,
              builder: (context, child) {
                final currentRadius = _radiusAnim.value * maxRadius;
                return Positioned(
                  left: _tapPos!.dx - currentRadius,
                  top: _tapPos!.dy - currentRadius,
                  width: currentRadius * 2,
                  height: currentRadius * 2,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: newColor,
                    ),
                  ),
                );
              },
            )
          else
            Positioned.fill(
              child: ColoredBox(color: newColor),
            ),

          // Top layer: The actual app with transparent scaffold
          Positioned.fill(
            child: ThemeController(
              isDark: _isDark,
              toggleTheme: _toggleTheme,
              child: widget.child,
            ),
          ),
        ],
      ),
    );
  }
}
