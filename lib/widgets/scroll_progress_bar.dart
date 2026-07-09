import 'package:flutter/material.dart';
import '../theme.dart';

/// A thin black progress line at the very top that grows with scroll position.
class ScrollProgressBar extends StatelessWidget {
  final ScrollController scrollController;

  const ScrollProgressBar({super.key, required this.scrollController});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: scrollController,
      builder: (context, _) {
        double progress = 0;
        try {
          if (scrollController.hasClients &&
              scrollController.positions.length == 1) {
            final pos = scrollController.position;
            final max = pos.maxScrollExtent;
            if (max > 0) {
              progress = (pos.pixels / max).clamp(0.0, 1.0);
            }
          }
        } catch (_) {}

        return Align(
          alignment: Alignment.centerLeft,
          child: FractionallySizedBox(
            widthFactor: progress,
            child: Container(height: 2, color: kBlack),
          ),
        );
      },
    );
  }
}
