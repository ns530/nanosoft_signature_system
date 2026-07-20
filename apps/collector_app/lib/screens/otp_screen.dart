import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'main_menu_screen.dart';
import '../main.dart' show authService;

class OtpScreen extends StatefulWidget {
  final String otpToken;
  const OtpScreen({super.key, required this.otpToken});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _otpCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  void _verify() async {
    setState(() { _loading = true; _error = null; });
    try {
      await authService.verifyOtp(widget.otpToken, _otpCtrl.text.trim());
      if (!mounted) return;
      Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (_) => const MainMenuScreen()));
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('OTP Verification')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Enter the 6-digit OTP sent to your registered mobile.'),
            const SizedBox(height: 24),
            TextField(
              controller: _otpCtrl,
              decoration: const InputDecoration(labelText: 'OTP Code'),
              keyboardType: TextInputType.number,
              maxLength: 6,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 24, letterSpacing: 8),
              onSubmitted: (_) => _verify()),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _verify,
                child: _loading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Verify')),
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }
}
