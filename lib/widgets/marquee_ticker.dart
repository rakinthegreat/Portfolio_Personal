import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';

/// Infinitely scrolling horizontal ticker strip.
class MarqueeTicker extends StatefulWidget {
  final String text;
  final double speed; // pixels per second

  const MarqueeTicker({
    super.key,
    this.text =
        'SOFTWARE ENGINEER  ·  FLUTTER  ·  REACT  ·  PYTHON  ·  OPEN SOURCE  ·  IIT DU  ·  DHAKA  ·  ',
    this.speed = 60,
  });

  @override
  State<MarqueeTicker> createState() => _MarqueeTickerState();
}

class _MarqueeTickerState extends State<MarqueeTicker>
    with SingleTickerProviderStateMixin {
  AnimationController? _ctrl;
  final _textKey = GlobalKey();
  double _textWidth = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _measureAndStart());
  }

  void _measureAndStart() {
    if (!mounted) return;
    final renderBox =
        _textKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    _textWidth = renderBox.size.width;
    if (_textWidth == 0) return;

    final duration =
        Duration(milliseconds: (_textWidth / widget.speed * 1000).round());

    final ctrl = AnimationController(vsync: this, duration: duration);
    setState(() => _ctrl = ctrl);
    ctrl.repeat();
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textStyle = GoogleFonts.spaceMono(
      fontSize: 11,
      color: kGrey,
      letterSpacing: 2,
    );

    // Invisible measurement text
    final measureWidget = Opacity(
      opacity: 0,
      child: Text(widget.text, key: _textKey, style: textStyle),
    );

    if (_ctrl == null || _textWidth == 0) {
      return SizedBox(height: 16, child: measureWidget);
    }

    return ClipRect(
      child: SizedBox(
        height: 20,
        child: Stack(
          children: [
            // Invisible measure text (keeps key alive)
            measureWidget,
            // Animated scrolling row
            AnimatedBuilder(
              animation: _ctrl!,
              builder: (_, snap) {
                final offset = -_textWidth * _ctrl!.value;
                return OverflowBox(
                  alignment: Alignment.centerLeft,
                  maxWidth: double.infinity,
                  child: Transform.translate(
                    offset: Offset(offset, 0),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (int i = 0; i < 5; i++)
                          Text(widget.text, style: textStyle),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
