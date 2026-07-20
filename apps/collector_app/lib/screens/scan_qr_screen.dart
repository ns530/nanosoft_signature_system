import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/qr_service.dart';
import 'customer_lookup_screen.dart';
import '../main.dart' show qrService;

class ScanQrScreen extends StatefulWidget {
  const ScanQrScreen({super.key});

  @override
  State<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends State<ScanQrScreen> {
  final _mobileScannerController = MobileScannerController();
  bool _validating = false;
  String? _error;

  void _onDetect(BarcodeCapture capture) async {
    if (_validating) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    setState(() { _validating = true; _error = null; });

    try {
      final result = await qrService.validateQr(barcode.rawValue!);
      if (!mounted) return;

      final unlockToken = result['unlockToken'] as String;
      Navigator.pushReplacement(context,
        MaterialPageRoute(
          builder: (_) => CustomerLookupScreen(unlockToken: unlockToken)));
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _validating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR Code')),
      body: Stack(
        children: [
          MobileScanner(
            controller: _mobileScannerController,
            onDetect: _onDetect,
          ),
          if (_validating)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text('Validating session...',
                        style: TextStyle(color: Colors.white, fontSize: 18)),
                  ],
                ),
              ),
            ),
          if (_error != null)
            Positioned(
              bottom: 40,
              left: 20,
              right: 20,
              child: Material(
                color: Colors.red.shade100,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () {
                          setState(() { _error = null; _validating = false; });
                        },
                        child: const Text('Try Again'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mobileScannerController.dispose();
    super.dispose();
  }
}
