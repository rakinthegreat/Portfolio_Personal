import 'package:flutter/material.dart';
import '../theme.dart';

/// Minimalist side navigation with elegant hover-reveal text labels.
class SideNav extends StatefulWidget {
  final List<String> labels;
  final int activeIndex;
  final void Function(int) onTap;

  const SideNav({
    super.key,
    required this.labels,
    required this.activeIndex,
    required this.onTap,
  });

  @override
  State<SideNav> createState() => _SideNavState();
}

class _SideNavState extends State<SideNav> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      // Increase hit area for easier interaction
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
        color: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: List.generate(widget.labels.length, (i) {
            final isActive = i == widget.activeIndex;
            final isExpanded = _isHovered || isActive;

            return GestureDetector(
              onTap: () => widget.onTap(i),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // The text label
                    AnimatedOpacity(
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeOutCubic,
                      opacity: isExpanded ? (isActive ? 1.0 : 0.4) : 0.0,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        curve: Curves.easeOutCubic,
                        transform: Matrix4.translationValues(isExpanded ? 0 : 10, 0, 0),
                        child: Text(
                          widget.labels[i].toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                            letterSpacing: 2,
                            color: context.kBlack,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // The indicator dot/line
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 350),
                      curve: Curves.easeOutCubic,
                      width: isActive ? 16 : (isExpanded ? 12 : 6),
                      height: 4,
                      decoration: BoxDecoration(
                        color: isActive
                            ? context.kBlack
                            : context.kGrey.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
