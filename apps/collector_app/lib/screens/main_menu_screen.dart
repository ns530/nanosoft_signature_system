import 'package:flutter/material.dart';
import 'dart:async';
import 'scan_qr_screen.dart';
import 'login_screen.dart';
import '../services/auth_service.dart';
import '../services/upload_service.dart';
import '../main.dart' show authService, uploadService;

class MainMenuScreen extends StatefulWidget {
  const MainMenuScreen({super.key});

  @override
  State<MainMenuScreen> createState() => _MainMenuScreenState();
}

class _MainMenuScreenState extends State<MainMenuScreen> {
  Timer? _idleTimer;
  int _pendingUploads = 0;

  @override
  void initState() {
    super.initState();
    _resetIdleTimer();
    _checkPendingUploads();
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    super.dispose();
  }

  void _resetIdleTimer() {
    _idleTimer?.cancel();
    _idleTimer = Timer(const Duration(minutes: 5), _logout);
  }

  Future<void> _logout() async {
    _idleTimer?.cancel();
    await authService.clearSession();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(context,
      MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
  }

  Future<void> _checkPendingUploads() async {
    final queue = await uploadService.getQueue();
    if (mounted) setState(() => _pendingUploads = queue.length);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Collector'),
        actions: [
          if (_pendingUploads > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Chip(
                label: Text('$_pendingUploads offline'),
                backgroundColor: Colors.orange.shade100)),
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan QR'),
                onPressed: () {
                  _resetIdleTimer();
                  Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ScanQrScreen()));
                }),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
