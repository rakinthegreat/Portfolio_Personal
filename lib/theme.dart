import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Colours ────────────────────────────────────────────────────────────────
const kBlack = Color(0xFF000000);
const kWhite = Color(0xFFFFFFFF);
const kGrey = Color(0xFF888888);
const kLightGrey = Color(0xFFEEEEEE);
const kGhostGrey = Color(0xFFF0F0F0);

// ─── Text Styles ─────────────────────────────────────────────────────────────

/// Massive hero name
TextStyle heroNameStyle(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  return GoogleFonts.spaceGrotesk(
    fontSize: w < 600 ? 72 : 120,
    fontWeight: FontWeight.w800,
    color: kBlack,
    height: 0.92,
    letterSpacing: -2,
  );
}

/// Large section heading
TextStyle sectionHeadingStyle(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  return GoogleFonts.spaceGrotesk(
    fontSize: w < 600 ? 36 : 56,
    fontWeight: FontWeight.w800,
    color: kBlack,
    letterSpacing: -1,
  );
}

/// Section ghost number
TextStyle ghostNumberStyle(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  return GoogleFonts.spaceGrotesk(
    fontSize: w < 600 ? 80 : 140,
    fontWeight: FontWeight.w800,
    color: kGhostGrey,
    height: 1,
    letterSpacing: -4,
  );
}

/// Small label / monospace
TextStyle labelStyle() => GoogleFonts.spaceMono(
      fontSize: 12,
      color: kGrey,
      letterSpacing: 2,
      fontWeight: FontWeight.w400,
    );

/// Body text
TextStyle bodyStyle() => GoogleFonts.spaceGrotesk(
      fontSize: 18,
      color: kGrey,
      height: 1.6,
      fontWeight: FontWeight.w400,
    );

/// Big skill / item text
TextStyle itemStyle() => GoogleFonts.spaceGrotesk(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: kBlack,
      letterSpacing: -0.5,
    );

TextStyle itemSubStyle() => GoogleFonts.spaceGrotesk(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: kGrey,
    );

// ─── Layout Constants ────────────────────────────────────────────────────────
const double kSectionPaddingV = 100;
const double kMaxWidth = 900;

// ─── Helpers ─────────────────────────────────────────────────────────────────
Widget sectionDivider() => const Divider(
      color: kLightGrey,
      thickness: 1,
      height: 1,
    );

Widget dot({double size = 8, Color color = kBlack}) => Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
      ),
    );

Widget sectionLabel(String text) => Text(
      text,
      style: GoogleFonts.spaceMono(
        fontSize: 11,
        color: kGrey,
        letterSpacing: 2.5,
        fontWeight: FontWeight.w400,
      ),
    );

class MaxWidthBox extends StatelessWidget {
  final Widget child;
  const MaxWidthBox({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: kMaxWidth),
        child: child,
      ),
    );
  }
}
