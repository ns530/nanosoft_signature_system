import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/upload_service.dart';
import 'main_menu_screen.dart';
import '../main.dart' show authService, uploadService;

class CaptureScreen extends StatefulWidget {
  final String unlockToken;
  final String customerId;
  final String customerName;

  const CaptureScreen({
    super.key,
    required this.unlockToken,
    required this.customerId,
    required this.customerName,
  });

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  bool _uploading = false;
  String? _status;
  bool _success = false;

  void _captureAndUpload() async {
    setState(() { _uploading = true; _status = 'Capturing...'; });

    try {
      // In a real device build, capture from camera here.
      // For this scaffold, simulate capture with a placeholder.
      final imageBytes = _generatePlaceholderImage();

      setState(() => _status = 'Uploading...');

      final deviceFp = authService.getDeviceFingerprint();

      final result = await uploadService.uploadImage(
        unlockToken: widget.unlockToken,
        customerId: widget.customerId,
        imageType: 'signature',
        imageBytes: imageBytes,
        deviceFingerprint: deviceFp,
      );

      if (!mounted) return;

      if (result == 'queued') {
        setState(() {
          _status = 'No connection - queued for later upload';
          _uploading = false;
          _success = true;
        });
      } else {
        setState(() {
          _status = 'Image securely uploaded and encrypted';
          _uploading = false;
          _success = true;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = e.toString().replaceFirst('Exception: ', '');
        _uploading = false;
      });
    }
  }

  List<int> _generatePlaceholderImage() {
    // In production, capture from camera.
    // Returning a minimal valid PNG placeholder for now.
    const placeholder = <int>[
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
    ];
    return [...placeholder, ...List.filled(100, 0)];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Capture')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Customer: ${widget.customerId} - ${widget.customerName}'),
            const SizedBox(height: 8),
            const Text('Type: Signature'),
            const SizedBox(height: 24),
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey),
              ),
              child: const Center(
                child: Text('Camera preview area', style: TextStyle(color: Colors.grey)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: _uploading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.cloud_upload),
                label: Text(_uploading ? 'Uploading...' : 'Capture & Upload'),
                onPressed: _uploading ? null : _captureAndUpload),
            ),
            if (_status != null) ...[
              const SizedBox(height: 16),
              Card(
                color: _success ? Colors.green.shade50 : Colors.orange.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        _success ? Icons.check_circle : Icons.warning,
                        color: _success ? Colors.green : Colors.orange),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_status!)),
                    ],
                  ),
                ),
              ),
            ],
            if (_success) ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pushAndRemoveUntil(context,
                    MaterialPageRoute(builder: (_) => const MainMenuScreen()),
                    (r) => false),
                  child: const Text('Back to Menu')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
