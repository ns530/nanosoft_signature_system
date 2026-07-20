import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/auth_service.dart';
import 'login_screen.dart';
import '../main.dart' show qrService;

class QrGenerateScreen extends StatefulWidget {
  final AuthService authService;
  const QrGenerateScreen({super.key, required this.authService});

  @override
  State<QrGenerateScreen> createState() => _QrGenerateScreenState();
}

class _QrGenerateScreenState extends State<QrGenerateScreen> with WidgetsBindingObserver {
  String? _qrToken;
  int? _expiresIn;
  Timer? _countdownTimer;
  Timer? _idleTimer;
  DateTime? _lastInteraction;
  bool _generating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetIdleTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _countdownTimer?.cancel();
    _idleTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_lastInteraction != null &&
          DateTime.now().difference(_lastInteraction!).inMinutes >= 5) {
        _logout();
      }
    }
  }

  void _resetIdleTimer() {
    _lastInteraction = DateTime.now();
    _idleTimer?.cancel();
    _idleTimer = Timer(const Duration(minutes: 5), _logout);
  }

  void _onUserInteraction() {
    _resetIdleTimer();
  }

  Future<void> _logout() async {
    _countdownTimer?.cancel();
    _idleTimer?.cancel();
    await widget.authService.clearSession();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen(authService: widget.authService)),
      (route) => false,
    );
  }

  Future<void> _generateQr() async {
    setState(() { _generating = true; _error = null; _qrToken = null; _expiresIn = null; });
    _countdownTimer?.cancel();

    try {
      final session = await qrService.generateQr();
      if (!mounted) return;
      setState(() {
        _qrToken = session.qrToken;
        _expiresIn = session.expiresIn;
        _generating = false;
      });
      _startCountdown();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _generating = false;
      });
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        if (_expiresIn != null && _expiresIn! > 0) {
          _expiresIn = _expiresIn! - 1;
        } else {
          _countdownTimer?.cancel();
        }
      });
    });
  }

  String _formatTime(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final isExpired = _expiresIn != null && _expiresIn! <= 0;
    final isActive = _qrToken != null && !isExpired;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Generate QR'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: GestureDetector(
        onTap: _onUserInteraction,
        onPanDown: (_) => _onUserInteraction(),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (_generating || isActive) ? null : _generateQr,
                  icon: _generating
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.qr_code),
                  label: Text(_generating ? 'Generating...' : 'Generate New QR Session'),
                ),
              ),
              const SizedBox(height: 32),

              if (_qrToken != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: isExpired ? Colors.grey : Colors.blue),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: QrImageView(
                    data: _qrToken!,
                    version: QrVersions.auto,
                    size: 250,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                if (isActive) ...[
                  Text(
                    _formatTime(_expiresIn!),
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('Active', style: TextStyle(color: Colors.green)),
                  ),
                ],
                if (isExpired) ...[
                  const Text('Expired', style: TextStyle(fontSize: 18, color: Colors.grey)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _generateQr,
                    child: const Text('Generate New'),
                  ),
                ],
              ],

              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
