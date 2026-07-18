import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../data/portfolio_data.dart';

class ResumeGenerator {
  static Future<pw.Document> generate() async {
    final baseFont = await PdfGoogleFonts.interRegular();
    final boldFont = await PdfGoogleFonts.interBold();

    final pdf = pw.Document(
      theme: pw.ThemeData.withFont(
        base: baseFont,
        bold: boldFont,
      ),
    );

    // Dark grey background color
    final darkBgColor = PdfColor.fromHex('#2a2a2a');
    final whiteColor = PdfColors.white;
    final lightGreyColor = PdfColor.fromHex('#cccccc');
    final darkText = PdfColor.fromHex('#111111');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: pw.EdgeInsets.zero, // No margins, we handle padding manually
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              // --- TOP SECTION (WHITE) ---
              pw.Container(
                color: whiteColor,
                padding: const pw.EdgeInsets.only(left: 48, right: 48, top: 56, bottom: 32),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Md Rakinuzzaman Talukder.', style: pw.TextStyle(fontSize: 34, fontWeight: pw.FontWeight.bold, color: darkText)), // Slightly reduced font size to fit full name
                    pw.SizedBox(height: 4),
                    pw.Text('[ Software Engineer ]', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: darkText)),
                    pw.SizedBox(height: 16),
                    pw.Text(
                      'Undergraduate Software Engineering (BSSE) student at the University of Dhaka. Experienced in developing high-performance applications and pixel-perfect interfaces across web, mobile, and desktop platforms. Driven by a passion for technical excellence and creating impactful, user-centric software solutions.',
                      style: pw.TextStyle(fontSize: 10, color: darkText, lineSpacing: 1.5),
                    ),
                  ],
                ),
              ),
              // --- BOTTOM SECTION (DARK) ---
              pw.Expanded(
                child: pw.Container(
                  color: darkBgColor,
                  padding: const pw.EdgeInsets.symmetric(horizontal: 48, vertical: 32),
                  child: pw.Row(
                    crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                    children: [
                      // COLUMN 1: EXPERTISE
                      pw.Expanded(
                        flex: 3,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Expertise', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                            // pw.SizedBox(height: 16), // removed to let spaceBetween handle spacing
                            ...PortfolioData.skills.map((skill) {
                              return pw.Padding(
                                padding: const pw.EdgeInsets.only(bottom: 2), // reduced static padding
                                child: pw.Container(
                                  decoration: pw.BoxDecoration(
                                    border: pw.Border(bottom: pw.BorderSide(color: lightGreyColor, width: 0.5)),
                                  ),
                                  padding: const pw.EdgeInsets.only(bottom: 2),
                                  width: double.infinity,
                                  child: pw.Text(skill.name, style: pw.TextStyle(fontSize: 9, color: whiteColor)),
                                ),
                              );
                            }).toList(),
                          ],
                        ),
                      ),
                      pw.SizedBox(width: 24),
                      // COLUMN 2: ACADEMICS & EXTRACURRICULARS
                      pw.Expanded(
                        flex: 4,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            // Top block: Education
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Education', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                pw.SizedBox(height: 16),
                                ...PortfolioData.academics.map((edu) {
                                  return pw.Padding(
                                    padding: const pw.EdgeInsets.only(bottom: 12),
                                    child: pw.Column(
                                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                                      children: [
                                        pw.Text(edu.degree, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                        pw.SizedBox(height: 2),
                                        pw.Text(edu.inst, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                        pw.SizedBox(height: 1),
                                        pw.Text(edu.period, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ],
                            ),
                            // Bottom block: Experiences
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Experiences', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                pw.SizedBox(height: 16),
                                ...PortfolioData.extracurriculars.map((extra) {
                                  return pw.Padding(
                                    padding: const pw.EdgeInsets.only(bottom: 12),
                                    child: pw.Column(
                                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                                      children: [
                                        pw.Text(extra.role, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                        pw.SizedBox(height: 2),
                                        pw.Text(extra.title, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                        pw.SizedBox(height: 1),
                                        pw.Text(extra.period, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ],
                            ),
                          ],
                        ),
                      ),
                      pw.SizedBox(width: 24),
                      // COLUMN 3: PROJECTS & CONTACTS
                      pw.Expanded(
                        flex: 4,
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            // Top block: Projects
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Projects', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                pw.SizedBox(height: 16),
                                ...PortfolioData.projects.map((project) {
                                  return pw.Padding(
                                    padding: const pw.EdgeInsets.only(bottom: 10),
                                    child: pw.Column(
                                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                                      children: [
                                        pw.Text(project.name, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                        pw.SizedBox(height: 2),
                                        pw.Text('${project.type}  |  ${project.year}', style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ],
                            ),
                            // Bottom block: Contacts
                            pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Contact', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: whiteColor)),
                                pw.SizedBox(height: 16),
                                pw.Text(PortfolioData.website, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                pw.SizedBox(height: 4),
                                pw.Text(PortfolioData.resumeEmail, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                pw.SizedBox(height: 4),
                                pw.Text(PortfolioData.resumePhone, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                pw.SizedBox(height: 4),
                                pw.Text(PortfolioData.github, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                                pw.SizedBox(height: 4),
                                pw.Text(PortfolioData.linkedin, style: pw.TextStyle(fontSize: 8, color: lightGreyColor)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }
}
