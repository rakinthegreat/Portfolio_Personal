import 'package:flutter/material.dart';
import '../theme.dart';

/// Animated dot strip nav — active dot morphs to a short pill shape.
class DotNav extends StatelessWidget {
  final int count;
  final int activeIndex;
  final void Function(int) onTap;

  const DotNav({
    super.key,
    required this.count,
    required this.activeIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (i) {
        final isActive = i == activeIndex;
        return GestureDetector(
          onTap: () => onTap(i),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 350),
              curve: Curves.easeOutCubic,
              width: 6,
              height: isActive ? 22 : 6,
              decoration: BoxDecoration(
                color: isActive
                    ? context.kBlack
                    : context.kGrey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        );
      }),
    );
  }
}
