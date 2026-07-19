import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

class RadialEdgeMenu extends StatefulWidget {
  final List<String> labels;
  final int activeIndex;
  final void Function(int) onTap;

  const RadialEdgeMenu({
    super.key,
    required this.labels,
    required this.activeIndex,
    required this.onTap,
  });

  @override
  State<RadialEdgeMenu> createState() => _RadialEdgeMenuState();
}

class _RadialEdgeMenuState extends State<RadialEdgeMenu> with SingleTickerProviderStateMixin {
  bool _isOpen = false;
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleMenu() {
    setState(() {
      _isOpen = !_isOpen;
      if (_isOpen) {
        _controller.forward(from: 0.0);
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // 0 is closed knob, 1 is fully open dial
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = _controller.value;
        final double closedWidth = 23.0;
        final double closedHeight = 110.0;
        final double openRadius = 125.0; // Reduced footprint
        
        // Smoothly interpolate size
        final curve = Curves.easeOutCubic.transform(t);
        final currentWidth = closedWidth + (openRadius - closedWidth) * curve;
        final currentHeight = closedHeight + ((openRadius * 2) - closedHeight) * curve;

        return TapRegion(
          onTapOutside: (event) {
            if (_isOpen) {
              _toggleMenu();
            }
          },
          child: GestureDetector(
            onTap: _isOpen ? null : _toggleMenu,
            child: Container(
              width: currentWidth,
              height: currentHeight,
              decoration: BoxDecoration(
                color: context.isDark ? context.kGhostGrey : context.kLightGrey, // Darker in dark mode
                borderRadius: BorderRadius.horizontal(
                  left: Radius.circular(currentHeight),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 20,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.horizontal(
                  left: Radius.circular(currentHeight),
                ),
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.centerRight,
                  children: [
                    // --- CLOSED STATE TEXT ---
                    if (t < 1.0)
                      Opacity(
                        opacity: 1.0 - curve,
                        child: Center(
                          child: RotatedBox(
                            quarterTurns: 3,
                            child: Text(
                              widget.activeIndex >= 0 && widget.activeIndex < widget.labels.length
                                  ? widget.labels[widget.activeIndex].toUpperCase()
                                  : '',
                              style: TextStyle(
                                color: context.kBlack, // High contrast text
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ),
                      ),

                    // --- OPEN STATE RADIAL DIAL ---
                    if (t > 0.0)
                      Opacity(
                        opacity: curve,
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: List.generate(widget.labels.length, (i) {
                            final double totalAngle = pi * 0.86; 
                            final double startAngle = -totalAngle / 2;
                            final double angleStep = totalAngle / (widget.labels.length - 1);
                            // Invert angle to put About on top
                            final double angle = -(startAngle + (i * angleStep));
                            
                            final isActive = i == widget.activeIndex;

                            return Positioned(
                              right: 0,
                              top: (currentHeight / 2) - 15, 
                              child: Transform.rotate(
                                angle: angle,
                                alignment: Alignment.centerRight,
                                child: GestureDetector(
                                  onTap: () {
                                    widget.onTap(i);
                                    _toggleMenu();
                                  },
                                  child: Container(
                                    width: openRadius, 
                                    height: 30,
                                    alignment: Alignment.centerRight, // Align to inner radius
                                    padding: const EdgeInsets.only(right: 54, left: 16), // Bound inner and outer radius
                                    color: Colors.transparent, // Ensure gesture detector catches taps
                                    child: FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerRight,
                                      child: Text(
                                        widget.labels[i].toUpperCase(),
                                        style: TextStyle(
                                          color: isActive ? context.kBlack : context.kGrey, // High contrast
                                          fontWeight: isActive ? FontWeight.w900 : FontWeight.w600,
                                          fontSize: isActive ? 12 : 10,
                                          letterSpacing: isActive ? 2 : 1,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),
                      ),
                      
                    // Back button / Close icon in center when open
                    if (t > 0.0)
                      Positioned(
                        right: 0, 
                        child: Opacity(
                          opacity: curve,
                          child: GestureDetector(
                            onTap: _toggleMenu,
                            child: Container(
                              width: 36,
                              height: 72,
                              decoration: BoxDecoration(
                                borderRadius: const BorderRadius.horizontal(left: Radius.circular(36)),
                                color: context.kBlack.withValues(alpha: 0.1),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.only(left: 6),
                                child: Icon(Icons.close, color: context.kBlack, size: 18),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
