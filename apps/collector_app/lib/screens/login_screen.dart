import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'otp_screen.dart';
import 'scan_qr_screen.dart';
import '../main.dart' show authService;

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  void _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      final r = await authService.login(
          _usernameCtrl.text.trim(), _passwordCtrl.text);
      if (!mounted) return;
      if (r.otpRequired && r.otpToken != null) {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => OtpScreen(otpToken: r.otpToken!)));
      } else {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const ScanQrScreen()));
      }
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Officer Login')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _usernameCtrl,
              decoration: const InputDecoration(labelText: 'Username'),
              textInputAction: TextInputAction.next),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordCtrl,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
              onSubmitted: (_) => _login()),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _login,
                child: _loading
                    ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Login')),
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
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }
}
