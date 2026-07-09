import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'sections/hero_section.dart';
import 'sections/about_section.dart';
import 'sections/academics_section.dart';
import 'sections/expertise_section.dart';
import 'sections/projects_section.dart';
import 'sections/extracurriculars_section.dart';
import 'sections/socials_section.dart';
import 'sections/contact_section.dart';
import 'sections/footer_section.dart';
import 'widgets/dot_nav.dart';
import 'widgets/cursor_follower.dart';
import 'widgets/scroll_progress_bar.dart';

void main() {
  runApp(const PortfolioApp());
}

class PortfolioApp extends StatelessWidget {
  const PortfolioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rakin Talukder',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFFFFFFF),
        colorScheme: const ColorScheme.light(
          surface: Color(0xFFFFFFFF),
          onSurface: Color(0xFF000000),
        ),
        textTheme: GoogleFonts.spaceGroteskTextTheme().apply(
          bodyColor: const Color(0xFF000000),
          displayColor: const Color(0xFF000000),
        ),
      ),
      home: const PortfolioHome(),
    );
  }
}

class PortfolioHome extends StatefulWidget {
  const PortfolioHome({super.key});

  @override
  State<PortfolioHome> createState() => _PortfolioHomeState();
}

class _PortfolioHomeState extends State<PortfolioHome> {
  final ScrollController _scrollController = ScrollController();
  int _activeSection = 0;

  final List<GlobalKey> _sectionKeys = List.generate(9, (_) => GlobalKey());

  void _scrollToSection(int index) {
    final key = _sectionKeys[index];
    final ctx = key.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 900),
        curve: Curves.easeInOutCubic,
      );
    }
  }

  void _onSectionVisible(int index) {
    if (_activeSection != index) {
      setState(() => _activeSection = index);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: CursorFollower(
        child: Stack(
          children: [
            SingleChildScrollView(
              controller: _scrollController,
              child: Column(
                children: [
                  HeroSection(
                    sectionKey: _sectionKeys[0],
                    onVisible: () => _onSectionVisible(0),
                    scrollController: _scrollController,
                  ),
                  AboutSection(
                    sectionKey: _sectionKeys[1],
                    onVisible: () => _onSectionVisible(1),
                  ),
                  AcademicsSection(
                    sectionKey: _sectionKeys[2],
                    onVisible: () => _onSectionVisible(2),
                  ),
                  ExpertiseSection(
                    sectionKey: _sectionKeys[3],
                    onVisible: () => _onSectionVisible(3),
                  ),
                  ProjectsSection(
                    sectionKey: _sectionKeys[4],
                    onVisible: () => _onSectionVisible(4),
                  ),
                  ExtracurricularsSection(
                    sectionKey: _sectionKeys[5],
                    onVisible: () => _onSectionVisible(5),
                  ),
                  SocialsSection(
                    sectionKey: _sectionKeys[6],
                    onVisible: () => _onSectionVisible(6),
                  ),
                  ContactSection(
                    sectionKey: _sectionKeys[7],
                    onVisible: () => _onSectionVisible(7),
                  ),
                  FooterSection(
                    sectionKey: _sectionKeys[8],
                    onVisible: () => _onSectionVisible(8),
                  ),
                ],
              ),
            ),

            // ── Scroll progress bar ─────────────────────────────────────
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: SizedBox(
                height: 2,
                child: ScrollProgressBar(scrollController: _scrollController),
              ),
            ),

            // ── Dot nav ─────────────────────────────────────────────────
            Positioned(
              right: 24,
              top: 0,
              bottom: 0,
              child: Center(
                child: DotNav(
                  count: 9,
                  activeIndex: _activeSection,
                  onTap: _scrollToSection,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
