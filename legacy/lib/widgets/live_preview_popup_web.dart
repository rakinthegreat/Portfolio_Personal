import 'package:flutter/material.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class LivePreviewPopup extends StatefulWidget {
  final String url;
  final bool isMobileView;
  const LivePreviewPopup({super.key, required this.url, this.isMobileView = false});

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
    final screenSize = MediaQuery.of(context).size;
    
    // Determine dimensions
    final width = widget.isMobileView 
        ? 360.0 
        : screenSize.width * 0.9;
    final height = widget.isMobileView 
        ? 812.0 
        : screenSize.height * 0.9;
        
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Close button bar (outside iframe to avoid pointer interception)
          Container(
            width: width > screenSize.width ? screenSize.width : width,
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(bottom: 8),
            child: Material(
              color: theme.cardColor,
              shape: const CircleBorder(),
              clipBehavior: Clip.antiAlias,
              child: IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ),
          // The iframe container
          Flexible(
            child: Container(
              width: width,
              height: height,
              constraints: BoxConstraints(
                maxWidth: screenSize.width,
                maxHeight: screenSize.height * 0.85,
              ),
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
              child: HtmlElementView(viewType: _viewId),
            ),
          ),
        ],
      ),
    );
  }
}
