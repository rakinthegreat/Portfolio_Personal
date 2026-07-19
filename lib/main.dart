import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';
import 'theme.dart';
import 'sections/hero_section.dart';
import 'sections/about_section.dart';
import 'sections/academics_section.dart';
import 'sections/expertise_section.dart';
import 'sections/projects_section.dart';
import 'sections/extracurriculars_section.dart';
import 'sections/socials_section.dart';
import 'sections/contact_section.dart';
import 'sections/footer_section.dart';
import 'widgets/side_nav.dart';
import 'widgets/radial_edge_menu.dart';
import 'widgets/cursor_follower.dart';
import 'widgets/scroll_progress_bar.dart';

import 'widgets/theme_transition_overlay.dart';

final GlobalKey portfolioHomeKey = GlobalKey();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(PortfolioApp(prefs: prefs));
}

class PortfolioApp extends StatelessWidget {
  final SharedPreferences prefs;
  const PortfolioApp({super.key, required this.prefs});

  @override
  Widget build(BuildContext context) {
    // We defer to system brightness if no preference exists
    final isSystemDark = MediaQuery.of(context).platformBrightness == Brightness.dark;
    final bool activeDark = prefs.getBool('isDark') ?? isSystemDark;

    return ThemeTransitionOverlay(
      initialDark: activeDark,
      onThemeChanged: (isDark) {
        prefs.setBool('isDark', isDark);
      },
      child: Builder(
        builder: (innerContext) {
          final isDark = ThemeController.of(innerContext).isDark;
          
          return MaterialApp(
            title: 'Rakin Talukder',
            debugShowCheckedModeBanner: false,
            // The scaffold must be transparent so our ripple overlay shows through!
            theme: getAppTheme(isDark).copyWith(
              scaffoldBackgroundColor: Colors.transparent,
            ),
            home: PortfolioHome(key: portfolioHomeKey),
          );
        },
      ),
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
      backgroundColor: Colors.transparent,
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

            // ── Navigation ──────────────────────────────────────────────
            Positioned(
              right: 0,
              top: 0,
              bottom: 0,
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 300),
                opacity: _activeSection > 0 ? 1.0 : 0.0,
                child: IgnorePointer(
                  ignoring: _activeSection == 0,
                  child: Center(
                    child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isMobile = MediaQuery.of(context).size.width < 800;
                    final labels = const [
                      'About',
                      'Academics',
                      'Expertise',
                      'Projects',
                      'Experiences',
                      'Socials',
                      'Contact',
                    ];
                    
                    if (isMobile) {
                      return RadialEdgeMenu(
                        labels: labels,
                        activeIndex: _activeSection == 8 ? 6 : _activeSection - 1,
                        onTap: (index) => _scrollToSection(index + 1),
                      );
                    }
                    
                    return SideNav(
                      labels: labels,
                      activeIndex: _activeSection == 8 ? 6 : _activeSection - 1,
                      onTap: (index) => _scrollToSection(index + 1),
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      ],
    ),
      ),
    );
  }
}
