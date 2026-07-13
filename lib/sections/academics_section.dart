import 'package:flutter/material.dart';
import 'package:visibility_detector/visibility_detector.dart';
import '../theme.dart';
import '../widgets/reveal_on_scroll.dart';

class AcademicsSection extends StatelessWidget {
  final GlobalKey sectionKey;
  final VoidCallback onVisible;

  const AcademicsSection({
    super.key,
    required this.sectionKey,
    required this.onVisible,
  });

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;

    return VisibilityDetector(
      key: const Key('academics-section'),
      onVisibilityChanged: (info) {
        if (info.visibleFraction > 0.3) onVisible();
      },
      child: Column(
        key: sectionKey,
        children: [
          sectionDivider(context),
          Padding(
            padding: EdgeInsets.symmetric(
              horizontal: isMobile ? 24 : MediaQuery.of(context).size.width * 0.08,
              vertical: kSectionPaddingV,
            ),
            child: MaxWidthBox(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RevealOnScroll(
                    visibilityKey: 'acad-label',
                    child: Row(
                      children: [
                        dot(context, size: 6),
                        const SizedBox(width: 10),
                        sectionLabel('02  ·  ACADEMICS', context),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'acad-content',
                    delay: const Duration(milliseconds: 100),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Text('02', style: ghostNumberStyle(context)),
                        Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Text(
                            'Educational\nBackground',
                            style: sectionHeadingStyle(context),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 48),
                  RevealOnScroll(
                    visibilityKey: 'acad-list',
                    delay: const Duration(milliseconds: 200),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        _EducationRow(
                          degree: 'Bachelor of Science in Software Engineering (BSSE)',
                          batch: '17th Batch (Currently studying)',
                          inst: 'Institute of Information Technology, University of Dhaka',
                          period: 'Since July 2025',
                        ),
                        SizedBox(height: 24),
                        _EducationRow(
                          degree: 'Bachelor of Business Administration (BBA)',
                          batch: '33rd Batch (Initially enrolled, didn\'t complete)',
                          inst: 'Institute of Business Administration, University of Dhaka',
                          period: 'Feb 2025 — June 2025',
                        ),
                        SizedBox(height: 24),
                        _EducationRow(
                          degree: 'Higher Secondary Certificate (HSC)',
                          batch: 'Batch 24 (Science G-15)',
                          inst: 'Notre Dame College',
                          period: '2024',
                        ),
                        SizedBox(height: 24),
                        _EducationRow(
                          degree: 'Secondary School Certificate (SSC)',
                          batch: 'Batch 22 (English Version)',
                          inst: 'Rajshahi Cantonment Public School & College',
                          period: '2022',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 56),
                  RevealOnScroll(
                    visibilityKey: 'acad-buttons',
                    delay: const Duration(milliseconds: 300),
                    child: Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        _OutlinedBtn(
                          label: 'TEST SCORES',
                          onTap: () => _showCredentials(context),
                        ),
                        _OutlinedBtn(
                          label: 'OTHER UNDERGRADUATE ACCEPTANCES',
                          onTap: () => _showAcceptances(context),
                        ),
                        _OutlinedBtn(
                          label: 'MENTORSHIP AREAS',
                          onTap: () => _showMentorship(context),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showCredentials(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => _InfoDialog(
        title: 'Academic Credentials',
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _dialogRow('DIGITAL SAT', '1530'),
            _dialogRow(' (MATH)', '800', indent: true),
            _dialogRow(' (EBRW)', '730', indent: true),
            const SizedBox(height: 8),
            _dialogRow('IELTS', '8.0'),
            const SizedBox(height: 8),
            _dialogRow('HSC GPA', '5.0'),
            const SizedBox(height: 8),
            _dialogRow('SSC GPA', '5.0'),
          ],
        ),
      ),
    );
  }

  void _showAcceptances(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => _InfoDialog(
        title: 'Undergrad Acceptances',
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _dialogBullet('DU IBA: Rank 30th'),
            _dialogBullet(
                'Aalto University (QS #114): Full Tuition Scholarship (Category A) - Chem. Eng.'),
            _dialogBullet('New York University (NYUAD): Invited for CW'),
            _dialogBullet('SUST'),
            _dialogBullet('KUET'),
            _dialogBullet('CUET'),
          ],
        ),
      ),
    );
  }

  void _showMentorship(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => _InfoDialog(
        title: 'Mentorship Areas',
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _dialogBullet('Digital SAT'),
            _dialogBullet('IELTS'),
            _dialogBullet('Engineering Admissions'),
            _dialogBullet('DU A, IBA Admissions'),
            _dialogBullet('Private Uni. Admissions'),
            _dialogBullet('US Admissions'),
            _dialogBullet('HSC, SSC, A Level, O Level Academics'),
          ],
        ),
      ),
    );
  }

  Widget _dialogRow(String label, String value, {bool indent = false}) {
    return Padding(
      padding: EdgeInsets.only(left: indent ? 24 : 0, bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style:
                  const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
          Text(value, style: const TextStyle(fontSize: 15)),
        ],
      ),
    );
  }

  Widget _dialogBullet(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Expanded(
              child:
                  Text(text, style: const TextStyle(fontSize: 15, height: 1.4))),
        ],
      ),
    );
  }
}

class _EducationRow extends StatelessWidget {
  final String degree;
  final String inst;
  final String period;
  final String batch;

  const _EducationRow({
    required this.degree,
    required this.inst,
    required this.period,
    required this.batch,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        border: Border.all(color: context.kLightGrey, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            degree,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: context.kBlack,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            batch,
            style: TextStyle(
              fontSize: 14,
              color: context.kBlack,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            inst,
            style: TextStyle(
              fontSize: 15,
              color: context.kBlack,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            period,
            style: TextStyle(
              fontSize: 13,
              color: context.kGrey,
              letterSpacing: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _OutlinedBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _OutlinedBtn({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: context.kBlack, width: 1.5),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
            color: context.kBlack,
          ),
        ),
      ),
    );
  }
}

class _InfoDialog extends StatelessWidget {
  final String title;
  final Widget content;

  const _InfoDialog({required this.title, required this.content});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
      backgroundColor: context.kWhite,
      insetPadding: const EdgeInsets.all(20),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          border: Border.all(color: context.kBlack, width: 2),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title.toUpperCase(),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: context.kBlack,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close, color: context.kBlack),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Divider(color: context.kLightGrey, height: 1, thickness: 1),
            const SizedBox(height: 24),
            content,
          ],
        ),
      ),
    );
  }
}
