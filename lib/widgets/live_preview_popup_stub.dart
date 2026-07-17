import 'package:flutter/material.dart';

class LivePreviewPopup extends StatelessWidget {
  final String url;
  const LivePreviewPopup({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Preview Not Available'),
      content: const Text('Live previews are only available on the Web platform.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }
}
