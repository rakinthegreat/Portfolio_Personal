import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class LivePreviewPopup extends StatefulWidget {
  final String url;
  const LivePreviewPopup({super.key, required this.url});

  @override
  State<LivePreviewPopup> createState() => _LivePreviewPopupState();
}

class _LivePreviewPopupState extends State<LivePreviewPopup> {
  late String _viewId;

  @override
  void initState() {
    super.initState();
    _viewId = 'iframe-${widget.url.hashCode}';
    
    // Register the iframe view factory using the updated Flutter 3 ui_web package
    ui_web.platformViewRegistry.registerViewFactory(
      _viewId,
      (int viewId) => html.IFrameElement()
        ..src = widget.url
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allowFullscreen = true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.9,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: theme.scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: theme.dividerColor.withOpacity(0.1),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 32,
              offset: const Offset(0, 16),
            ),
          ],
        ),
        child: Stack(
          children: [
            // The actual embedded iframe
            HtmlElementView(viewType: _viewId),
            
            // Close button overlay
            Positioned(
              top: 16,
              right: 16,
              child: Material(
                color: theme.scaffoldBackgroundColor.withOpacity(0.8),
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Icon(
                      Icons.close, 
                      color: theme.textTheme.bodyLarge?.color,
                      size: 24,
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
