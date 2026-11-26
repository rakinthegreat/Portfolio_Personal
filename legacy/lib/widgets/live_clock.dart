import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:portfolio/widgets/theme_transition_overlay.dart';
import '../theme.dart';

/// Live updating clock — Concentric Rings minimalist style
class LiveClock extends StatefulWidget {
  final double size;
  final bool isBackground;
  final bool showDate;

  const LiveClock({
    super.key,
    this.size = 42,
    this.isBackground = false,
    this.showDate = true,
  });

  @override
  State<LiveClock> createState() => _LiveClockState();
}

class _LiveClockState extends State<LiveClock> {
  late Timer _timer;
  late DateTime _now;

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const months = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    final dateStr = '${_now.day.toString().padLeft(2, '0')} ${months[_now.month - 1]} ${_now.year}';

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _ConcentricClockPainter(_now, widget.size, widget.isBackground, context),
                ),
              ),
              Align(
                alignment: Alignment.center,
                child: Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    Padding(
                      // Symmetrical padding ensures the text remains perfectly dead-center
                      // while giving the Stack enough physical size to encompass the icon's hitbox.
                      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 24),
                      child: Text(
                        "BINDING INTO THE\nLOOM  OF  TIME",
                        textAlign: TextAlign.center,
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: widget.isBackground ? 14 : 8,
                          color: context.kBlack.withOpacity(0.5),
                          fontStyle: FontStyle.italic,
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                    Positioned(
                      top: widget.isBackground ? 0 : 8,
                      right: widget.isBackground ? 12 : 20,
                      child: Builder(
                        builder: (iconContext) {
                          return InkWell(
                            onTap: () {
                              final renderBox = iconContext.findRenderObject() as RenderBox?;
                              Offset center = Offset.zero;
                              if (renderBox != null) {
                                final position = renderBox.localToGlobal(Offset.zero);
                                center = position + Offset(renderBox.size.width / 2, renderBox.size.height / 2);
                              }
                              ThemeController.of(context).toggleTheme(center);
                            },
                            customBorder: const CircleBorder(),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Icon(
                                context.isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                                color: context.kBlack,
                                size: widget.isBackground ? 16 : 8,
                              ),
                            ),
                          );
                        }
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (widget.showDate) ...[
          const SizedBox(height: 8),
          Text(
            dateStr,
            style: GoogleFonts.spaceMono(
              fontSize: 9,
              color: context.kGrey,
              letterSpacing: 1.5,
            ),
          ),
        ]
      ],
    );
  }
}

class _ConcentricClockPainter extends CustomPainter {
  final DateTime time;
  final double sizeFactor;
  final bool isBackground;
  final BuildContext context;
  
  _ConcentricClockPainter(this.time, this.sizeFactor, this.isBackground, this.context);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;
    
    // Base it entirely on maxRadius so it scales perfectly up to 800px+ without blobbing
    final gap = maxRadius * 0.15; // 15% gap between rings

    // 3 distinct shades for the arcs
    final hrColor = isBackground ? context.kGrey.withOpacity(0.9) : context.kBlack;
    final minColor = isBackground ? context.kGrey.withOpacity(0.5) : context.kGrey;
    final secColor = isBackground ? context.kGrey.withOpacity(0.25) : context.kLightGrey;
    final trackColor = isBackground ? context.kGhostGrey : context.kGhostGrey;

    final secPaint = Paint()
      ..color = secColor
      ..strokeWidth = maxRadius * 0.02
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
      
    final minPaint = Paint()
      ..color = minColor
      ..strokeWidth = maxRadius * 0.04
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
      
    final hrPaint = Paint()
      ..color = hrColor
      ..strokeWidth = maxRadius * 0.06
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final trackPaint = Paint()
      ..color = trackColor
      ..strokeWidth = 1.0 // Crisp 1px line regardless of scale
      ..style = PaintingStyle.stroke;

    final rOuter = maxRadius;
    final rMid = maxRadius - gap;
    final rInner = maxRadius - (gap * 2);

    // Draw tracks
    canvas.drawCircle(center, rOuter, trackPaint);
    canvas.drawCircle(center, rMid, trackPaint);
    canvas.drawCircle(center, rInner, trackPaint);

    // Draw arcs (start from top: -pi/2)
    const startAngle = -math.pi / 2;
    
    // Seconds arc (0 to 60)
    final secAngle = (time.second / 60) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rOuter),
      startAngle,
      secAngle == 0 ? 0.001 : secAngle,
      false,
      secPaint,
    );

    // Minutes arc (0 to 60)
    final minAngle = (time.minute / 60) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rMid),
      startAngle,
      minAngle == 0 ? 0.001 : minAngle,
      false,
      minPaint,
    );

    // Hours arc (0 to 12)
    final hrAngle = ((time.hour % 12 + time.minute / 60) / 12) * 2 * math.pi;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: rInner),
      startAngle,
      hrAngle == 0 ? 0.001 : hrAngle,
      false,
      hrPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _ConcentricClockPainter oldDelegate) {
    return oldDelegate.time != time;
  }
}
