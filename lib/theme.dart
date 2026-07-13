import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Theme Management ────────────────────────────────────────────────────────
class ThemeController extends InheritedWidget {
  final bool isDark;
  final VoidCallback toggleTheme;

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

// ─── Theme Extensions ────────────────────────────────────────────────────────
extension AppColors on BuildContext {
  bool get isDark => ThemeController.of(this).isDark;
  
  Color get kBlack => isDark ? const Color(0xFFFFFFFF) : const Color(0xFF000000);
  Color get kWhite => isDark ? const Color(0xFF070707) : const Color(0xFFFFFFFF);
  Color get kGrey => isDark ? const Color(0xFFAAAAAA) : const Color(0xFF888888);
  Color get kLightGrey => isDark ? const Color(0xFF2A2A2A) : const Color(0xFFEEEEEE);
  Color get kGhostGrey => isDark ? const Color(0xFF1A1A1A) : const Color(0xFFF0F0F0);
}

// ─── Text Styles ─────────────────────────────────────────────────────────────

/// Massive hero name
TextStyle heroNameStyle(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  return GoogleFonts.spaceGrotesk(
    fontSize: w < 600 ? 72 : 120,
    fontWeight: FontWeight.w800,
    color: context.kBlack,
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
    color: context.kBlack,
    letterSpacing: -1,
  );
}

/// Section ghost number
TextStyle ghostNumberStyle(BuildContext context) {
  final w = MediaQuery.of(context).size.width;
  return GoogleFonts.spaceGrotesk(
    fontSize: w < 600 ? 80 : 140,
    fontWeight: FontWeight.w800,
    color: context.kGhostGrey,
    height: 1,
    letterSpacing: -4,
  );
}

/// Small label / monospace
TextStyle labelStyle(BuildContext context) => GoogleFonts.spaceMono(
      fontSize: 12,
      color: context.kGrey,
      letterSpacing: 2,
      fontWeight: FontWeight.w400,
    );

/// Body text
TextStyle bodyStyle(BuildContext context) => GoogleFonts.spaceGrotesk(
      fontSize: 18,
      color: context.kGrey,
      height: 1.6,
      fontWeight: FontWeight.w400,
    );

/// Big skill / item text
TextStyle itemStyle(BuildContext context) => GoogleFonts.spaceGrotesk(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: context.kBlack,
      letterSpacing: -0.5,
    );

TextStyle itemSubStyle(BuildContext context) => GoogleFonts.spaceGrotesk(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: context.kGrey,
    );

// ─── Layout Constants ────────────────────────────────────────────────────────
const double kSectionPaddingV = 100;
const double kMaxWidth = 1200;

// ─── Helpers ─────────────────────────────────────────────────────────────────
Widget sectionDivider(BuildContext context) => Divider(
      color: context.kLightGrey,
      thickness: 1,
      height: 1,
    );

Widget dot(BuildContext context, {double size = 8, Color? color}) => Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color ?? context.kBlack,
        shape: BoxShape.circle,
      ),
    );

Widget sectionLabel(String text, BuildContext context) => Text(
      text,
      style: GoogleFonts.spaceMono(
        fontSize: 11,
        color: context.kGrey,
        letterSpacing: 2.5,
        fontWeight: FontWeight.w400,
      ),
    );

class MaxWidthBox extends StatelessWidget {
  final Widget child;
  const MaxWidthBox({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: kMaxWidth),
        child: SizedBox(
          width: double.infinity,
          child: child,
        ),
      ),
    );
  }
}
